"""Tests for the Fathom OAuth connection (Story 13.3). No real call reaches Fathom:
every HTTP request goes through an httpx.MockTransport with recorded-shape responses."""

import asyncio
import json
import time
import uuid
from datetime import timedelta
from urllib.parse import parse_qs, urlparse

import httpx
import pytest
from cryptography.fernet import Fernet
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.api.routes import fathom as routes
from app.config import settings
from app.database.models import FathomConnection, FathomPendingConnection, Organization, OrganizationMember, User
from app.integrations import fathom
from app.services import fathom_connections
from app.services.fathom_connections import InvalidState, parse_state, sign_state, verify_state
from app.utils.crypto import decrypt_token, encrypt_token

# Shapes recorded by the spike (data/tools/fathom/oauth_test.py), values made up.
TOKEN_RESPONSE = {"access_token": "acc-1", "refresh_token": "ref-1", "expires_in": 86400, "scope": "public_api", "token_type": "Bearer"}
REFRESHED = {"access_token": "acc-2", "refresh_token": "ref-2", "expires_in": 86400, "scope": "public_api", "token_type": "Bearer"}
MEETINGS_PAGE = {
    "items": [{
        "recording_id": 123456,
        "title": "Reunião de coordenação",
        "meeting_title": "Coordenação D/SEASON",
        "recording_start_time": "2026-10-01T13:00:00Z",
        "calendar_invitees": [{"name": "Ana", "email": "ana@example.com"}],
        "recorded_by": {"name": "Rami", "email": "rami@example.com"},
        "share_url": "https://fathom.video/share/abc",
    }],
    "next_cursor": "cur-2",
    "limit": 10,
}


class FakeFathom:
    """Routes requests to canned responses and records them."""

    def __init__(self):
        self.requests = []
        self.token_responses = [httpx.Response(200, json=TOKEN_RESPONSE)]
        self.api_responses = {}

    def __call__(self, request: httpx.Request) -> httpx.Response:
        self.requests.append(request)
        if str(request.url) == fathom.TOKEN_URL:
            return self.token_responses.pop(0) if len(self.token_responses) > 1 else self.token_responses[0]
        key = (request.method, request.url.path)
        queue = self.api_responses.get(key)
        if not queue:
            return httpx.Response(404, json={"error": "not_found"})
        return queue.pop(0) if len(queue) > 1 else queue[0]

    def client(self) -> httpx.Client:
        return httpx.Client(transport=httpx.MockTransport(self))

    def token_requests(self):
        return [parse_qs(r.content.decode()) for r in self.requests if str(r.url) == fathom.TOKEN_URL]


@pytest.fixture
def configured(monkeypatch):
    monkeypatch.setattr(settings, "fathom_client_id", "client-id")
    monkeypatch.setattr(settings, "fathom_client_secret", "client-secret")
    monkeypatch.setattr(settings, "fathom_redirect_uri", "https://example.ngrok.app/api/fathom/callback")
    monkeypatch.setattr(settings, "token_encryption_key", Fernet.generate_key().decode())
    monkeypatch.setattr(settings, "frontend_url", "http://front.test")


@pytest.fixture
def fake(monkeypatch, configured):
    fake = FakeFathom()
    monkeypatch.setattr(fathom, "new_http_client", fake.client)
    return fake


@pytest.fixture
def user(db_session: Session) -> User:
    org = Organization(name="souBIM", slug="soubim")
    u = User(email="rami@soubim.com", password_hash="x", name="Rami", role="director")
    db_session.add_all([org, u])
    db_session.flush()
    db_session.add(OrganizationMember(user_id=u.id, organization_id=org.id, role="admin"))
    db_session.commit()
    return u


def make_connection(db: Session, user: User, expires_in: timedelta = timedelta(hours=12), refresh="ref-1") -> FathomConnection:
    conn = FathomConnection(
        user_id=user.id,
        access_token_enc=encrypt_token("acc-1"),
        refresh_token_enc=encrypt_token(refresh) if refresh else None,
        expires_at=fathom.utcnow() + expires_in,
        scope="public_api",
    )
    db.add(conn)
    db.commit()
    return conn


def run(coro):
    return asyncio.run(coro)


@pytest.fixture
def other_user(db_session: Session) -> User:
    u = User(email="attacker@example.com", password_hash="x", name="Mallory", role="director")
    db_session.add(u)
    db_session.commit()
    return u


def callback(db: Session, user: User, code="the-code", state=None):
    return routes.fathom_callback(code=code, state=state or sign_state(user.id), error=None, db=db)


def pending_nonce(response) -> str:
    query = parse_qs(urlparse(response.headers["location"]).query)
    assert query["fathom"] == ["pending"]
    return query["nonce"][0]


def confirm(db: Session, user: User, nonce: str):
    return run(routes.fathom_confirm(body=routes.ConfirmRequest(nonce=nonce), db=db, user=user))


# --------------------------------------------------------------------------- configuration


class TestConfiguration:
    def test_disabled_when_settings_missing(self, monkeypatch, configured):
        assert fathom.is_configured()
        monkeypatch.setattr(settings, "fathom_client_secret", None)
        assert not fathom.is_configured()
        with pytest.raises(fathom.FathomNotConfigured):
            fathom.authorize_url("s")

    def test_disabled_with_invalid_encryption_key(self, monkeypatch, configured):
        monkeypatch.setattr(settings, "token_encryption_key", "not-a-fernet-key")
        assert not fathom.is_configured()

    def test_routes_404_and_status_reports_disabled(self, monkeypatch, db_session, user):
        monkeypatch.setattr(settings, "fathom_client_id", None)
        with pytest.raises(HTTPException) as exc:
            run(routes.fathom_connect(user=user))
        assert exc.value.status_code == 404
        with pytest.raises(HTTPException) as exc:
            routes.fathom_callback(code="c", state="s", error=None, db=db_session)
        assert exc.value.status_code == 404
        assert run(routes.fathom_status(db=db_session, user=user))["configured"] is False


# --------------------------------------------------------------------------- OAuth state


class TestState:
    def test_roundtrip(self, configured):
        uid = uuid.uuid4()
        assert verify_state(sign_state(uid)) == uid
        assert verify_state(sign_state(uid), expected_user_id=uid) == uid

    def test_tampered_payload_rejected(self, configured):
        payload, sig = sign_state(uuid.uuid4()).split(".")
        forged = fathom_connections._b64(json.dumps({"u": str(uuid.uuid4()), "n": "x", "exp": int(time.time()) + 600}).encode())
        with pytest.raises(InvalidState):
            verify_state(f"{forged}.{sig}")
        with pytest.raises(InvalidState):
            verify_state(f"{payload}.{sig[:-2]}AA")
        with pytest.raises(InvalidState):
            verify_state("garbage")

    def test_expired_rejected(self, configured):
        state = sign_state(uuid.uuid4(), now=time.time() - 601)
        with pytest.raises(InvalidState, match="expired"):
            verify_state(state)

    def test_other_user_rejected(self, configured):
        with pytest.raises(InvalidState):
            verify_state(sign_state(uuid.uuid4()), expected_user_id=uuid.uuid4())

    def test_signed_with_other_secret_rejected(self, monkeypatch, configured):
        state = sign_state(uuid.uuid4())
        monkeypatch.setattr(settings, "jwt_secret_key", "another-secret-another-secret-123")
        with pytest.raises(InvalidState):
            verify_state(state)


# --------------------------------------------------------------------------- OAuth client


class TestOAuth:
    def test_authorize_url_params(self, configured):
        url = urlparse(fathom.authorize_url("st"))
        assert f"{url.scheme}://{url.netloc}{url.path}" == "https://fathom.video/external/v1/oauth2/authorize"
        assert parse_qs(url.query) == {
            "client_id": ["client-id"],
            "redirect_uri": ["https://example.ngrok.app/api/fathom/callback"],
            "scope": ["public_api"],
            "state": ["st"],
            "response_type": ["code"],
        }

    def test_exchange_code_posts_form(self, fake):
        tokens = fathom.exchange_code("the-code", fake.client())
        assert tokens.access_token == "acc-1" and tokens.refresh_token == "ref-1"
        assert tokens.expires_at > fathom.utcnow() + timedelta(hours=23)
        form = fake.token_requests()[0]
        assert form["grant_type"] == ["authorization_code"] and form["code"] == ["the-code"]
        assert form["client_id"] == ["client-id"] and form["client_secret"] == ["client-secret"]
        assert form["redirect_uri"] == ["https://example.ngrok.app/api/fathom/callback"]
        assert fake.requests[0].headers["content-type"] == "application/x-www-form-urlencoded"

    @pytest.mark.parametrize("response", [
        httpx.Response(200, content=b"<html>oops</html>"),
        httpx.Response(200, json={"token_type": "Bearer"}),
        httpx.Response(200, json={"access_token": "a", "expires_in": "soon"}),
    ])
    def test_malformed_token_response_raises_fathom_error(self, fake, response):
        fake.token_responses = [response]
        with pytest.raises(fathom.FathomAPIError):
            fathom.exchange_code("the-code", fake.client())

    def test_exchange_failure_raises_without_leaking(self, fake):
        fake.token_responses = [httpx.Response(400, json={"error": "invalid_grant", "error_description": "bad code"})]
        with pytest.raises(fathom.FathomAPIError) as exc:
            fathom.exchange_code("the-code", fake.client())
        assert exc.value.status_code == 400 and "invalid_grant" in str(exc.value)
        assert "the-code" not in str(exc.value) and "client-secret" not in str(exc.value)


# --------------------------------------------------------------------------- API client


class TestFathomClient:
    def test_list_meetings_uses_bearer_and_parses_cursor(self, db_session, user, fake):
        conn = make_connection(db_session, user)
        fake.api_responses[("GET", "/external/v1/meetings")] = [httpx.Response(200, json=MEETINGS_PAGE)]
        with fathom.FathomClient(db_session, conn, fake.client()) as client:
            page = client.list_meetings(cursor="cur-1", include_transcript=True)
        assert page.next_cursor == "cur-2" and page.items[0]["recording_id"] == 123456
        req = fake.requests[-1]
        assert req.url.host == "api.fathom.ai"
        assert req.headers["authorization"] == "Bearer acc-1"
        assert req.url.params["cursor"] == "cur-1" and req.url.params["include_transcript"] == "true"
        assert fathom.account_label_from(page) == "rami@example.com"

    def test_request_download_and_status(self, db_session, user, fake):
        conn = make_connection(db_session, user)
        fake.api_responses[("POST", "/external/v1/recordings/123456/download")] = [
            httpx.Response(202, json={"download_id": "dl-1", "status": "processing"})]
        fake.api_responses[("GET", "/external/v1/recordings/123456/downloads/dl-1")] = [httpx.Response(200, json={
            "status": "completed",
            "video": {"url": "https://signed.example/v.mp4", "content_type": "video/mp4", "file_size_bytes": 10},
        })]
        with fathom.FathomClient(db_session, conn, fake.client()) as client:
            assert client.request_download(123456) == {"download_id": "dl-1", "status": "processing"}
            status = client.download_status(123456, "dl-1")
        assert status["status"] == "completed" and status["video"]["url"].startswith("https://signed")
        assert all(r.headers["authorization"] == "Bearer acc-1" for r in fake.requests)

    def test_api_error_raises(self, db_session, user, fake):
        conn = make_connection(db_session, user)
        fake.api_responses[("POST", "/external/v1/recordings/9/download")] = [httpx.Response(422, json={"error": "no_media"})]
        with pytest.raises(fathom.FathomAPIError) as exc:
            fathom.FathomClient(db_session, conn, fake.client()).request_download(9)
        assert exc.value.status_code == 422

    def test_refreshes_shortly_before_expiry(self, db_session, user, fake):
        conn = make_connection(db_session, user, expires_in=timedelta(seconds=30))  # inside the 60 s margin
        fake.token_responses = [httpx.Response(200, json=REFRESHED)]
        fake.api_responses[("GET", "/external/v1/meetings")] = [httpx.Response(200, json=MEETINGS_PAGE)]
        fathom.FathomClient(db_session, conn, fake.client()).list_meetings()

        form = fake.token_requests()[0]
        assert form["grant_type"] == ["refresh_token"] and form["refresh_token"] == ["ref-1"]
        assert fake.requests[-1].headers["authorization"] == "Bearer acc-2"
        db_session.refresh(conn)
        assert decrypt_token(conn.access_token_enc) == "acc-2"
        assert decrypt_token(conn.refresh_token_enc) == "ref-2"
        assert conn.expires_at > fathom.utcnow() + timedelta(hours=23)

    def test_no_refresh_when_token_is_fresh(self, db_session, user, fake):
        conn = make_connection(db_session, user, expires_in=timedelta(minutes=5))
        fake.api_responses[("GET", "/external/v1/meetings")] = [httpx.Response(200, json=MEETINGS_PAGE)]
        fathom.FathomClient(db_session, conn, fake.client()).list_meetings()
        assert fake.token_requests() == []

    def test_refresh_keeps_refresh_token_when_none_returned(self, db_session, user, fake):
        conn = make_connection(db_session, user, expires_in=timedelta(seconds=0))
        fake.token_responses = [httpx.Response(200, json={"access_token": "acc-2", "expires_in": 86400})]
        fathom.FathomClient(db_session, conn, fake.client()).access_token()
        assert decrypt_token(conn.refresh_token_enc) == "ref-1"

    def test_refresh_failure_marks_needs_reconnect(self, db_session, user, fake):
        conn = make_connection(db_session, user, expires_in=timedelta(seconds=-10))
        fake.token_responses = [httpx.Response(400, json={"error": "invalid_grant"})]
        with pytest.raises(fathom.FathomReconnectRequired):
            fathom.FathomClient(db_session, conn, fake.client()).list_meetings()
        db_session.refresh(conn)
        assert conn.needs_reconnect
        # later calls fail fast without hitting Fathom
        count = len(fake.requests)
        with pytest.raises(fathom.FathomReconnectRequired):
            fathom.FathomClient(db_session, conn, fake.client()).list_meetings()
        assert len(fake.requests) == count
        assert run(routes.fathom_status(db=db_session, user=user))["needs_reconnect"] is True

    def test_transient_refresh_failure_does_not_mark_reconnect(self, db_session, user, fake):
        conn = make_connection(db_session, user, expires_in=timedelta(seconds=-10))
        fake.token_responses = [httpx.Response(503, json={})]
        with pytest.raises(fathom.FathomAPIError):
            fathom.FathomClient(db_session, conn, fake.client()).access_token()
        db_session.refresh(conn)
        assert not conn.needs_reconnect

    def test_repeated_401_does_not_loop(self, db_session, user, fake):
        conn = make_connection(db_session, user)
        fake.token_responses = [httpx.Response(200, json=REFRESHED)]
        fake.api_responses[("GET", "/external/v1/meetings")] = [httpx.Response(401, json={"error": "unauthorized"})]
        with pytest.raises(fathom.FathomAPIError) as exc:
            fathom.FathomClient(db_session, conn, fake.client()).list_meetings()
        assert exc.value.status_code == 401
        assert len(fake.token_requests()) == 1
        assert len([r for r in fake.requests if r.url.path.endswith("/meetings")]) == 2

    @pytest.mark.parametrize("bad", ["../meetings", "1/../../x", "1?x=y", "1#f", "", "a b"])
    def test_ids_in_url_paths_are_validated(self, db_session, user, fake, bad):
        conn = make_connection(db_session, user)
        client = fathom.FathomClient(db_session, conn, fake.client())
        with pytest.raises(fathom.FathomError):
            client.request_download(bad)
        with pytest.raises(fathom.FathomError):
            client.download_status(1, bad)
        assert fake.requests == []

    def test_unreadable_tokens_mark_needs_reconnect(self, db_session, user, fake, monkeypatch):
        conn = make_connection(db_session, user)
        monkeypatch.setattr(settings, "token_encryption_key", Fernet.generate_key().decode())  # key rotated
        with pytest.raises(fathom.FathomReconnectRequired):
            fathom.FathomClient(db_session, conn, fake.client()).list_meetings()
        db_session.refresh(conn)
        assert conn.needs_reconnect and fake.requests == []

    def test_401_triggers_one_refresh_and_retry(self, db_session, user, fake):
        conn = make_connection(db_session, user)
        fake.token_responses = [httpx.Response(200, json=REFRESHED)]
        fake.api_responses[("GET", "/external/v1/meetings")] = [
            httpx.Response(401, json={"error": "unauthorized"}), httpx.Response(200, json=MEETINGS_PAGE)]
        page = fathom.FathomClient(db_session, conn, fake.client()).list_meetings()
        assert page.next_cursor == "cur-2"
        assert fake.requests[-1].headers["authorization"] == "Bearer acc-2"


# --------------------------------------------------------------------------- routes


class TestRoutes:
    def test_connect_returns_authorize_url_with_signed_state(self, configured, user):
        url = urlparse(run(routes.fathom_connect(user=user))["url"])
        state = parse_qs(url.query)["state"][0]
        assert verify_state(state, expected_user_id=user.id) == user.id

    def test_callback_parks_tokens_as_pending_and_never_connects(self, db_session, user, fake):
        response = callback(db_session, user)

        assert response.status_code == 302
        location = urlparse(response.headers["location"])
        assert f"{location.scheme}://{location.netloc}{location.path}" == "http://front.test/settings/integrations"
        assert set(parse_qs(location.query)) == {"fathom", "nonce"}  # no token, code or state in the URL
        assert "acc-1" not in response.headers["location"] and "the-code" not in response.headers["location"]
        assert response.headers["cache-control"] == "no-store"
        assert response.headers["referrer-policy"] == "no-referrer"

        assert db_session.query(FathomConnection).count() == 0
        pending = db_session.query(FathomPendingConnection).one()
        assert pending.user_id == user.id and pending.nonce == pending_nonce(response)
        assert "acc-1" not in pending.access_token_enc and decrypt_token(pending.access_token_enc) == "acc-1"
        assert decrypt_token(pending.refresh_token_enc) == "ref-1"
        assert pending.expires_at > fathom.utcnow() + timedelta(minutes=9)
        assert run(routes.fathom_status(db=db_session, user=user))["connected"] is False

    def test_confirm_moves_tokens_to_the_connection(self, db_session, user, fake):
        fake.api_responses[("GET", "/external/v1/meetings")] = [httpx.Response(200, json=MEETINGS_PAGE)]
        status = confirm(db_session, user, pending_nonce(callback(db_session, user)))

        assert status["connected"] and not status["needs_reconnect"]
        assert status["account_label"] == "rami@example.com" and status["connected_at"]
        assert "acc-1" not in json.dumps(status)
        conn = db_session.query(FathomConnection).one()
        assert conn.user_id == user.id
        assert conn.organization_id == db_session.query(Organization).one().id
        assert conn.access_token_enc != "acc-1" and "acc-1" not in conn.access_token_enc
        assert decrypt_token(conn.access_token_enc) == "acc-1"
        assert decrypt_token(conn.refresh_token_enc) == "ref-1"
        assert conn.scope == "public_api" and conn.expires_at > fathom.utcnow() + timedelta(hours=23)
        pending = db_session.query(FathomPendingConnection).one()  # kept only to burn the state
        assert pending.consumed_at is not None
        assert pending.access_token_enc is None and pending.refresh_token_enc is None

    def test_confirm_without_meetings_still_connects(self, db_session, user, fake):
        # meetings endpoint answers 404 in the fake: the label is best effort
        status = confirm(db_session, user, pending_nonce(callback(db_session, user)))
        assert status["connected"] and status["account_label"] is None

    def test_attacker_state_confirmed_by_victim_is_rejected(self, db_session, user, other_user, fake):
        """Login CSRF: the attacker (other_user) starts the flow and sends the consent link to the
        victim (user), who approves it. The victim's browser lands on the confirm step, logged in
        as the victim: rejected, and nobody ends up connected."""
        attacker_state = sign_state(other_user.id)
        nonce = pending_nonce(callback(db_session, other_user, state=attacker_state))

        with pytest.raises(HTTPException) as exc:
            confirm(db_session, user, nonce)
        assert exc.value.status_code == 403
        assert db_session.query(FathomConnection).count() == 0
        pending = db_session.query(FathomPendingConnection).one()
        assert pending.access_token_enc is None and pending.consumed_at is not None  # victim tokens discarded

        # the attacker cannot claim them afterwards either
        with pytest.raises(HTTPException) as exc:
            confirm(db_session, other_user, nonce)
        assert exc.value.status_code == 404
        assert db_session.query(FathomConnection).count() == 0
        for who in (user, other_user):
            assert run(routes.fathom_status(db=db_session, user=who))["connected"] is False

    def test_confirm_expired_pending_route_returns_410(self, db_session, user, fake, monkeypatch):
        nonce = pending_nonce(callback(db_session, user))
        pending = db_session.query(FathomPendingConnection).one()
        pending.expires_at = fathom.utcnow() - timedelta(seconds=1)
        db_session.commit()
        monkeypatch.setattr(fathom_connections, "cleanup_expired_pending", lambda db, now=None: 0)
        with pytest.raises(HTTPException) as exc:
            confirm(db_session, user, nonce)
        assert exc.value.status_code == 410
        assert db_session.query(FathomConnection).count() == 0
        assert db_session.query(FathomPendingConnection).count() == 0

    def test_confirm_after_expiry_cleanup_is_404(self, db_session, user, fake):
        nonce = pending_nonce(callback(db_session, user))
        db_session.query(FathomPendingConnection).update({"expires_at": fathom.utcnow() - timedelta(seconds=1)})
        db_session.commit()
        with pytest.raises(HTTPException) as exc:
            confirm(db_session, user, nonce)
        assert exc.value.status_code in (404, 410)
        assert db_session.query(FathomPendingConnection).count() == 0
        assert db_session.query(FathomConnection).count() == 0

    def test_expired_pending_cleaned_up_on_callback(self, db_session, user, fake):
        callback(db_session, user)
        db_session.query(FathomPendingConnection).update({"expires_at": fathom.utcnow() - timedelta(minutes=1)})
        db_session.commit()
        callback(db_session, user)  # new flow, new state
        assert db_session.query(FathomPendingConnection).count() == 1

    def test_confirm_nonce_is_single_use(self, db_session, user, fake):
        nonce = pending_nonce(callback(db_session, user))
        confirm(db_session, user, nonce)
        with pytest.raises(HTTPException) as exc:
            confirm(db_session, user, nonce)
        assert exc.value.status_code == 404

    @pytest.mark.parametrize("nonce", ["unknown", "x" * 64])
    def test_confirm_unknown_nonce(self, db_session, user, fake, nonce):
        with pytest.raises(HTTPException) as exc:
            confirm(db_session, user, nonce)
        assert exc.value.status_code == 404

    def test_state_is_single_use(self, db_session, user, fake):
        state = sign_state(user.id)
        callback(db_session, user, state=state)
        replay = callback(db_session, user, code="another-code", state=state)
        assert "reason=invalid_state" in replay.headers["location"]
        assert len(fake.token_requests()) == 1  # the replay never reached Fathom
        assert db_session.query(FathomPendingConnection).count() == 1

    def test_state_single_use_after_confirm(self, db_session, user, fake):
        state = sign_state(user.id)
        confirm(db_session, user, pending_nonce(callback(db_session, user, state=state)))
        replay = callback(db_session, user, code="another-code", state=state)
        assert "reason=invalid_state" in replay.headers["location"]

    def test_parse_state_returns_nonce(self, configured):
        uid = uuid.uuid4()
        data = parse_state(sign_state(uid))
        assert data.user_id == uid and 16 <= len(data.nonce) <= 64

    def test_reconnect_replaces_connection_and_clears_revoked(self, db_session, user, fake):
        conn = make_connection(db_session, user)
        conn.revoked_at = fathom.utcnow()
        db_session.commit()
        confirm(db_session, user, pending_nonce(callback(db_session, user)))
        conn = db_session.query(FathomConnection).one()
        assert conn.revoked_at is None

    @pytest.mark.parametrize("kwargs,reason", [
        ({"code": "c", "state": "tampered.sig"}, "invalid_state"),
        ({"code": None, "state": None}, "invalid_request"),
        ({"code": None, "state": None, "error": "access_denied"}, "denied"),
    ])
    def test_callback_errors_redirect_to_settings(self, db_session, user, fake, kwargs, reason):
        response = routes.fathom_callback(db=db_session, **{"error": None, **kwargs})
        assert response.headers["location"] == f"http://front.test/settings/integrations?fathom=error&reason={reason}"
        assert db_session.query(FathomConnection).count() == 0
        assert db_session.query(FathomPendingConnection).count() == 0
        assert fake.token_requests() == []

    def test_callback_expired_state(self, db_session, user, fake):
        state = sign_state(user.id, now=time.time() - 3600)
        response = routes.fathom_callback(code="c", state=state, error=None, db=db_session)
        assert "reason=invalid_state" in response.headers["location"]

    def test_callback_exchange_failure(self, db_session, user, fake):
        fake.token_responses = [httpx.Response(400, json={"error": "invalid_grant"})]
        response = routes.fathom_callback(code="c", state=sign_state(user.id), error=None, db=db_session)
        assert "reason=exchange_failed" in response.headers["location"]
        assert db_session.query(FathomConnection).count() == 0
        assert db_session.query(FathomPendingConnection).count() == 0

    def test_disconnect_deletes_tokens(self, db_session, user, configured):
        make_connection(db_session, user)
        run(routes.fathom_disconnect(db=db_session, user=user))
        assert db_session.query(FathomConnection).count() == 0
        assert run(routes.fathom_status(db=db_session, user=user))["connected"] is False
        with pytest.raises(HTTPException) as exc:
            run(routes.fathom_disconnect(db=db_session, user=user))
        assert exc.value.status_code == 404


class TestAuthMiddleware:
    """The callback is public (Fathom redirects the browser, no JWT); everything else needs auth."""

    @pytest.fixture
    def client(self, configured):
        from fastapi.testclient import TestClient

        from app.main import app

        return TestClient(app)  # no context manager: no startup (DB init, scheduler)

    def test_callback_reachable_without_jwt(self, client):
        response = client.get("/api/fathom/callback?code=c&state=bad", follow_redirects=False)
        assert response.status_code == 302
        assert "fathom=error" in response.headers["location"]

    @pytest.mark.parametrize("method,path", [
        ("GET", "/api/integrations/fathom/connect"),
        ("GET", "/api/integrations/fathom"),
        ("DELETE", "/api/integrations/fathom"),
        ("POST", "/api/integrations/fathom/confirm"),
    ])
    def test_other_routes_require_auth(self, client, method, path):
        assert client.request(method, path).status_code == 401
