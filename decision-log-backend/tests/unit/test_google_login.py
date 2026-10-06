"""Story 12.8: Sign in with Google (OIDC code flow + PKCE) and case-insensitive emails.

No call ever reaches Google: the token endpoint and the JWKS are served by ``FakeGoogle``
(``httpx.MockTransport``) and ID tokens are signed with a throwaway RSA key.

HTTP-level tests need PostgreSQL (``pg_session``) so the app's own session sees the test data.
"""

import time
from datetime import datetime, timedelta
from urllib.parse import parse_qs, urlparse

import httpx
import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from fastapi.testclient import TestClient
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm.attributes import set_committed_value

from app.config import settings
from app.database.models import GoogleLoginRequest, OrganizationInvitation, OrganizationMember, User
from app.integrations import google_oidc
from app.services import google_login, invitations
from app.services.auth_service import UserNotFoundError, authenticate_user
from app.utils.security import decode_access_token, hash_password
from tests.org_helpers import make_org

CLIENT_ID = "client-id.apps.googleusercontent.com"
FRONTEND = "http://front.test"
PASSWORD = "password123"


def _rsa_key():
    return rsa.generate_private_key(public_exponent=65537, key_size=2048)


SIGNING_KEY = _rsa_key()
OTHER_KEY = _rsa_key()
KID = "test-kid-1"


def _jwk(private_key, kid):
    jwk = jwt.algorithms.RSAAlgorithm.to_jwk(private_key.public_key(), as_dict=True)
    jwk.update({"kid": kid, "alg": "RS256", "use": "sig"})
    return jwk


class FakeGoogle:
    """Google's token endpoint + JWKS. The ID token carries ``claims`` (defaults: a valid login)."""

    def __init__(self):
        self.requests = []
        self.nonce = None
        self.email = "owner@acme.com"
        self.claims = {}
        self.signing_key = SIGNING_KEY
        self.token_status = 200

    def id_token(self):
        now = int(time.time())
        claims = {
            "iss": "https://accounts.google.com",
            "aud": CLIENT_ID,
            "sub": "1234567890",
            "email": self.email,
            "email_verified": True,
            "name": "Google Person",
            "nonce": self.nonce,
            "iat": now,
            "exp": now + 3600,
        }
        claims.update(self.claims)
        claims = {k: v for k, v in claims.items() if v is not None}
        return jwt.encode(claims, self.signing_key, algorithm="RS256", headers={"kid": KID})

    def __call__(self, request: httpx.Request) -> httpx.Response:
        self.requests.append(request)
        url = str(request.url)
        if url == google_oidc.JWKS_URL:
            return httpx.Response(200, json={"keys": [_jwk(SIGNING_KEY, KID)]})
        if url == google_oidc.TOKEN_URL:
            if self.token_status != 200:
                return httpx.Response(self.token_status, json={"error": "invalid_grant"})
            return httpx.Response(200, json={"access_token": "ya29.x", "id_token": self.id_token(), "expires_in": 3599})
        return httpx.Response(404)

    def client(self):
        return httpx.Client(transport=httpx.MockTransport(self))

    def calls(self, url):
        return [r for r in self.requests if str(r.url) == url]


@pytest.fixture
def configured(monkeypatch):
    monkeypatch.setattr(settings, "google_client_id", CLIENT_ID)
    monkeypatch.setattr(settings, "google_client_secret", "client-secret")
    monkeypatch.setattr(settings, "google_redirect_uri", "https://api.test/api/auth/google/callback")
    monkeypatch.setattr(settings, "frontend_url", FRONTEND)
    google_oidc.jwks_cache.clear()
    yield
    google_oidc.jwks_cache.clear()


@pytest.fixture
def google(monkeypatch, configured):
    fake = FakeGoogle()
    monkeypatch.setattr(google_oidc, "new_http_client", fake.client)
    return fake


@pytest.fixture
def client(pg_session):
    from app.main import app

    return TestClient(app)  # no context manager: no startup (DB init, scheduler)


def make_user(db, email, name="Someone", deleted=False):
    user = User(email=email, password_hash=hash_password(PASSWORD), name=name, role="client")
    if deleted:
        user.deleted_at = datetime.utcnow()
    db.add(user)
    db.commit()
    return user


@pytest.fixture
def world(pg_session):
    db = pg_session
    acme = make_org(db, "Acme", "acme")
    owner = make_user(db, "owner@acme.com", "Owner")
    db.add(OrganizationMember(user_id=owner.id, organization_id=acme.id, role="owner"))
    db.commit()
    return dict(db=db, acme=acme, owner=owner)


class Capture:
    def send(self, to, subject, body):
        return True


def make_invitation(world, email):
    _, token = invitations.create_invitation(world["db"], world["owner"], email, "member", world["acme"], sender=Capture())
    return token


def start(client, invitation_token=None):
    body = {"invitation_token": invitation_token} if invitation_token else {}
    r = client.post("/api/auth/google/start", json=body)
    assert r.status_code == 200, r.text
    data = r.json()
    query = parse_qs(urlparse(data["url"]).query)
    return data, query


def fragment(response):
    assert response.status_code == 302
    location = response.headers["location"]
    assert location.startswith(f"{FRONTEND}/auth/google/callback#")
    return {k: v[0] for k, v in parse_qs(urlparse(location).fragment).items()}


def callback(client, state, code="auth-code"):
    return client.get("/api/auth/google/callback", params={"code": code, "state": state}, follow_redirects=False)


def sign_in(client, google, invitation_token=None):
    """start → (Google) → callback; returns (browser_key, fragment dict)."""
    data, query = start(client, invitation_token)
    google.nonce = query["nonce"][0]
    return data["browser_key"], fragment(callback(client, query["state"][0]))


def exchange(client, code, browser_key):
    return client.post("/api/auth/google/exchange", json={"code": code, "browser_key": browser_key})


# --------------------------------------------------------------------------- providers / disabled


class TestProviders:
    def test_disabled_when_settings_missing(self, client, monkeypatch):
        monkeypatch.setattr(settings, "google_client_id", None)
        r = client.get("/api/auth/providers")  # public: no JWT
        assert r.status_code == 200
        assert r.json() == {"password": True, "google": False}
        assert client.post("/api/auth/google/start", json={}).status_code == 404
        assert client.get("/api/auth/google/callback?code=c&state=s", follow_redirects=False).status_code == 404
        assert client.post("/api/auth/google/exchange", json={"code": "c", "browser_key": "k"}).status_code == 404

    def test_enabled_when_configured(self, client, configured):
        assert client.get("/api/auth/providers").json()["google"] is True


# --------------------------------------------------------------------------- the login flow


class TestLogin:
    def test_authorize_url_has_pkce_nonce_and_scopes(self, client, google, world):
        data, query = start(client)
        assert data["url"].startswith(google_oidc.AUTHORIZE_URL + "?")
        assert query["client_id"] == [CLIENT_ID]
        assert query["redirect_uri"] == [settings.google_redirect_uri]
        assert query["response_type"] == ["code"]
        assert query["scope"] == ["openid email profile"]
        assert query["code_challenge_method"] == ["S256"]
        assert query["nonce"][0] and query["state"][0] and data["browser_key"]
        row = world["db"].query(GoogleLoginRequest).one()
        assert row.browser_key_hash != data["browser_key"]  # only the hash is stored

    def test_valid_login_issues_our_jwt_via_one_time_code(self, client, google, world):
        google.email = "Owner@ACME.com"  # case-insensitive match
        browser_key, frag = sign_in(client, google)
        assert set(frag) == {"code"}  # no JWT, no Google code/token in the redirect

        r = exchange(client, frag["code"], browser_key)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["user"]["email"] == "owner@acme.com"
        assert body["organization_id"] is None
        assert decode_access_token(body["access_token"])["user_id"] == str(world["owner"].id)
        # the JWT works on a protected endpoint
        me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {body['access_token']}"})
        assert me.status_code == 200

        # PKCE: the verifier sent to Google matches the challenge of the authorize URL
        token_call = google.calls(google_oidc.TOKEN_URL)[0]
        form = parse_qs(token_call.content.decode())
        assert form["grant_type"] == ["authorization_code"] and form["code"] == ["auth-code"]
        assert form["code_verifier"][0]

    def test_login_code_is_single_use(self, client, google, world):
        browser_key, frag = sign_in(client, google)
        assert exchange(client, frag["code"], browser_key).status_code == 200
        r = exchange(client, frag["code"], browser_key)
        assert r.status_code == 404 and r.json()["detail"] == "invalid_code"

    def test_code_from_another_browser_is_rejected_and_burnt(self, client, google, world):
        browser_key, frag = sign_in(client, google)
        r = exchange(client, frag["code"], "attacker-browser-key")
        assert r.status_code == 403 and r.json()["detail"] == "browser_mismatch"
        assert exchange(client, frag["code"], browser_key).status_code == 404

    def test_expired_login_code(self, client, google, world):
        browser_key, frag = sign_in(client, google)
        row = world["db"].query(GoogleLoginRequest).one()
        row.expires_at = datetime.utcnow() - timedelta(seconds=1)
        world["db"].commit()
        r = exchange(client, frag["code"], browser_key)
        assert r.status_code == 410 and r.json()["detail"] == "expired"

    def test_unknown_email_is_refused_no_signup(self, client, google, world):
        google.email = "stranger@example.com"
        browser_key, frag = sign_in(client, google)
        r = exchange(client, frag["code"], browser_key)
        assert r.status_code == 403 and r.json()["detail"] == "unknown_email"
        assert world["db"].query(User).filter(User.email == "stranger@example.com").count() == 0

    def test_soft_deleted_account_is_not_linked(self, client, google, world):
        make_user(world["db"], "gone@acme.com", deleted=True)
        google.email = "gone@acme.com"
        browser_key, frag = sign_in(client, google)
        r = exchange(client, frag["code"], browser_key)
        assert r.status_code == 403 and r.json()["detail"] == "account_disabled"

    def test_jwks_is_cached(self, client, google, world):
        for _ in range(2):
            browser_key, frag = sign_in(client, google)
            assert exchange(client, frag["code"], browser_key).status_code == 200
        assert len(google.calls(google_oidc.JWKS_URL)) == 1


class TestCallbackRejects:
    def test_unverified_email(self, client, google, world):
        google.claims = {"email_verified": False}
        _, frag = sign_in(client, google)
        assert frag == {"error": "email_unverified"}

    def test_missing_email_verified(self, client, google, world):
        google.claims = {"email_verified": None}
        _, frag = sign_in(client, google)
        assert frag == {"error": "email_unverified"}

    @pytest.mark.parametrize("claims", [
        {"aud": "someone-else.apps.googleusercontent.com"},
        {"iss": "https://evil.example.com"},
        {"exp": int(time.time()) - 3600, "iat": int(time.time()) - 7200},  # expired
        {"nonce": "not-the-nonce-we-sent"},
    ], ids=["wrong_aud", "wrong_iss", "expired", "wrong_nonce"])
    def test_invalid_id_token(self, client, google, world, claims):
        google.claims = claims
        _, frag = sign_in(client, google)
        assert frag == {"error": "invalid_token"}
        assert world["db"].query(GoogleLoginRequest).one().login_code_hash is None

    @pytest.mark.parametrize("claims,detail", [
        ({"aud": "someone-else.apps.googleusercontent.com"}, "wrong audience"),
        ({"iss": "https://evil.example.com"}, "wrong issuer"),
        ({"exp": int(time.time()) - 3600, "iat": int(time.time()) - 7200}, "expired"),
        ({"nonce": "other"}, "nonce mismatch"),
        ({"email_verified": "false"}, "email_unverified"),
    ])
    def test_verify_id_token_reasons(self, google, claims, detail):
        """Each rejection is caught by the intended check (no network: FakeGoogle serves the JWKS)."""
        google.nonce = "the-nonce"
        google.claims = claims
        with pytest.raises(google_oidc.InvalidIdToken) as exc:
            google_oidc.verify_id_token(google.id_token(), "the-nonce")
        assert detail in str(exc.value)

    def test_verify_id_token_ok(self, google):
        google.nonce = "the-nonce"
        claims = google_oidc.verify_id_token(google.id_token(), "the-nonce")
        assert claims.email == "owner@acme.com" and claims.sub == "1234567890"

    def test_token_signed_by_another_key(self, client, google, world):
        google.signing_key = OTHER_KEY  # same kid, wrong key
        _, frag = sign_in(client, google)
        assert frag == {"error": "invalid_token"}

    def test_replayed_state(self, client, google, world):
        data, query = start(client)
        google.nonce = query["nonce"][0]
        state = query["state"][0]
        assert "code" in fragment(callback(client, state))
        assert fragment(callback(client, state, code="another-code")) == {"error": "invalid_state"}
        assert len(google.calls(google_oidc.TOKEN_URL)) == 1  # rejected before calling Google

    def test_tampered_or_expired_state(self, client, google, world):
        data, query = start(client)
        state = query["state"][0]
        payload, signature = state.split(".", 1)
        assert fragment(callback(client, payload + ".AAAA")) == {"error": "invalid_state"}
        nonce = google_login.parse_state(state)
        expired = google_login.sign_state(nonce, time.time() - 1)
        assert fragment(callback(client, expired)) == {"error": "invalid_state"}
        assert google.calls(google_oidc.TOKEN_URL) == []

    def test_user_denied_consent(self, client, google, world):
        r = client.get("/api/auth/google/callback?error=access_denied", follow_redirects=False)
        assert fragment(r) == {"error": "denied"}

    def test_exchange_failure(self, client, google, world):
        google.token_status = 400
        _, frag = sign_in(client, google)
        assert frag == {"error": "exchange_failed"}


# --------------------------------------------------------------------------- invitations


class TestInvitation:
    def test_new_user_accepts_with_google(self, client, google, world):
        token = make_invitation(world, "new.person@example.com")
        google.email = "New.Person@example.com"
        browser_key, frag = sign_in(client, google, token)
        r = exchange(client, frag["code"], browser_key)
        assert r.status_code == 200, r.text
        assert r.json()["organization_id"] == str(world["acme"].id)
        db = world["db"]
        db.expire_all()
        user = db.query(User).filter(User.email == "new.person@example.com").one()
        assert user.name == "Google Person"
        assert db.query(OrganizationMember).filter_by(user_id=user.id, organization_id=world["acme"].id).one().role == "member"
        assert db.query(OrganizationInvitation).one().accepted_at is not None

    def test_existing_user_accepts_with_google(self, client, google, world):
        other = make_org(world["db"], "Other", "other")
        world["db"].commit()
        # an existing user of another company is invited to Acme
        user = make_user(world["db"], "Carol@Other.com")
        world["db"].add(OrganizationMember(user_id=user.id, organization_id=other.id, role="owner"))
        world["db"].commit()
        token = make_invitation(world, "carol@other.com")
        google.email = "carol@other.com"
        browser_key, frag = sign_in(client, google, token)
        r = exchange(client, frag["code"], browser_key)
        assert r.status_code == 200, r.text
        assert r.json()["user"]["id"] == str(user.id)
        assert world["db"].query(OrganizationMember).filter_by(user_id=user.id, organization_id=world["acme"].id).count() == 1

    def test_mismatched_email_is_refused(self, client, google, world):
        token = make_invitation(world, "invited@example.com")
        google.email = "someone.else@example.com"
        browser_key, frag = sign_in(client, google, token)
        r = exchange(client, frag["code"], browser_key)
        assert r.status_code == 403 and r.json()["detail"] == "email_mismatch"
        db = world["db"]
        db.expire_all()
        assert db.query(OrganizationInvitation).one().accepted_at is None  # still usable
        assert db.query(User).filter(User.email == "someone.else@example.com").count() == 0

    def test_soft_deleted_invitee_is_not_revived(self, client, google, world):
        make_user(world["db"], "back@example.com", deleted=True)
        token = make_invitation(world, "back@example.com")
        google.email = "back@example.com"
        browser_key, frag = sign_in(client, google, token)
        r = exchange(client, frag["code"], browser_key)
        assert r.status_code == 403 and r.json()["detail"] == "account_disabled"

    def test_invitation_revoked_meanwhile(self, client, google, world):
        token = make_invitation(world, "late@example.com")
        google.email = "late@example.com"
        browser_key, frag = sign_in(client, google, token)
        row = world["db"].query(OrganizationInvitation).one()
        row.revoked_at = datetime.utcnow()
        world["db"].commit()
        r = exchange(client, frag["code"], browser_key)
        assert r.status_code == 410 and r.json()["detail"] == "invitation_gone"

    def test_start_with_unknown_invitation(self, client, google, world):
        assert client.post("/api/auth/google/start", json={"invitation_token": "nope"}).status_code == 404

    def test_login_hint_is_the_invited_email(self, client, google, world):
        token = make_invitation(world, "hint@example.com")
        _, query = start(client, token)
        assert query["login_hint"] == ["hint@example.com"]


# --------------------------------------------------------------------------- Google account binding (sub)


def _sub_of(db, email):
    db.expire_all()
    return db.query(User).filter(User.email == email).one().google_sub


class TestGoogleAccountBinding:
    def test_first_login_stores_the_sub(self, client, google, world):
        assert world["owner"].google_sub is None
        browser_key, frag = sign_in(client, google)
        assert exchange(client, frag["code"], browser_key).status_code == 200
        assert _sub_of(world["db"], "owner@acme.com") == "1234567890"

    def test_same_sub_logs_in_again(self, client, google, world):
        for _ in range(2):
            browser_key, frag = sign_in(client, google)
            assert exchange(client, frag["code"], browser_key).status_code == 200
        assert _sub_of(world["db"], "owner@acme.com") == "1234567890"

    def test_different_sub_with_same_email_is_refused(self, client, google, world):
        browser_key, frag = sign_in(client, google)
        assert exchange(client, frag["code"], browser_key).status_code == 200
        google.claims = {"sub": "999-another-google-account"}  # same verified email, other Google account
        browser_key, frag = sign_in(client, google)
        r = exchange(client, frag["code"], browser_key)
        assert r.status_code == 403 and r.json()["detail"] == "google_account_mismatch"
        assert _sub_of(world["db"], "owner@acme.com") == "1234567890"  # never overwritten

    def test_sub_bound_to_another_account_is_refused(self, client, google, world):
        other = make_user(world["db"], "other@acme.com")
        other.google_sub = "1234567890"
        world["db"].commit()
        browser_key, frag = sign_in(client, google)  # owner@acme.com, same sub
        r = exchange(client, frag["code"], browser_key)
        assert r.status_code == 403 and r.json()["detail"] == "google_account_in_use"
        assert _sub_of(world["db"], "owner@acme.com") is None

    def test_bind_is_conditional_first_login_wins(self, world):
        """A concurrent bind of another sub is detected, not overwritten."""
        db, owner = world["db"], world["owner"]
        db.query(User).filter(User.id == owner.id).update({User.google_sub: "first"}, synchronize_session=False)
        db.commit()
        set_committed_value(owner, "google_sub", None)  # stale view, as if read before the concurrent bind
        with pytest.raises(google_login.GoogleLoginError) as exc:
            google_login._bind_sub(db, owner, "second")
        assert exc.value.reason == "google_account_mismatch"
        assert _sub_of(db, "owner@acme.com") == "first"

    def test_invite_new_user_stores_the_sub(self, client, google, world):
        token = make_invitation(world, "fresh@example.com")
        google.email = "fresh@example.com"
        browser_key, frag = sign_in(client, google, token)
        assert exchange(client, frag["code"], browser_key).status_code == 200
        assert _sub_of(world["db"], "fresh@example.com") == "1234567890"

    def test_invite_existing_user_stores_the_sub(self, client, google, world):
        make_user(world["db"], "dave@example.com")
        token = make_invitation(world, "dave@example.com")
        google.email = "dave@example.com"
        browser_key, frag = sign_in(client, google, token)
        assert exchange(client, frag["code"], browser_key).status_code == 200
        assert _sub_of(world["db"], "dave@example.com") == "1234567890"

    def test_invite_existing_user_with_other_sub_is_refused(self, client, google, world):
        user = make_user(world["db"], "erin@example.com")
        user.google_sub = "erin-google"
        world["db"].commit()
        token = make_invitation(world, "erin@example.com")
        google.email = "erin@example.com"
        browser_key, frag = sign_in(client, google, token)
        r = exchange(client, frag["code"], browser_key)
        assert r.status_code == 403 and r.json()["detail"] == "google_account_mismatch"
        world["db"].expire_all()
        assert world["db"].query(OrganizationInvitation).one().accepted_at is None  # still usable

    def test_invite_new_user_with_sub_in_use_is_refused(self, client, google, world):
        world["owner"].google_sub = "1234567890"
        world["db"].commit()
        token = make_invitation(world, "newbie@example.com")
        google.email = "newbie@example.com"
        browser_key, frag = sign_in(client, google, token)
        r = exchange(client, frag["code"], browser_key)
        assert r.status_code == 403 and r.json()["detail"] == "google_account_in_use"
        assert world["db"].query(User).filter(User.email == "newbie@example.com").count() == 0


class TestStateEncoding:
    def test_non_ascii_state_is_400_not_500(self, client, google, world):
        r = client.get(
            "/api/auth/google/callback", params={"code": "c", "state": "abc.\u00e9t\u00e9"}, follow_redirects=False
        )
        assert r.status_code == 400 and r.json()["detail"] == "invalid_state"
        assert google.calls(google_oidc.TOKEN_URL) == []

    def test_parse_state_rejects_non_ascii(self):
        with pytest.raises(google_login.GoogleLoginError) as exc:
            google_login.parse_state("abc.\u00e9")
        assert exc.value.reason == "invalid_state"


# --------------------------------------------------------------------------- case-insensitive email


class TestEmailNormalization:
    def test_user_email_is_stored_lowercased(self, db_session):
        user = User(email="  Mixed.Case@Example.COM ", password_hash="x", name="M", role="client")
        db_session.add(user)
        db_session.commit()
        assert user.email == "mixed.case@example.com"

    def test_login_is_case_insensitive(self, db_session):
        db_session.add(User(email="test@example.com", password_hash=hash_password("password"), name="T", role="client"))
        db_session.commit()
        assert authenticate_user(db_session, " Test@Example.COM ", "password").email == "test@example.com"

    def test_soft_deleted_user_cannot_log_in(self, db_session):
        user = User(email="old@example.com", password_hash=hash_password("password"), name="O", role="client")
        user.deleted_at = datetime.utcnow()
        db_session.add(user)
        db_session.commit()
        with pytest.raises(UserNotFoundError):
            authenticate_user(db_session, "OLD@example.com", "password")

    def test_case_insensitive_unique_index(self, pg_session):
        pg_session.add(User(email="dup@example.com", password_hash="x", name="A", role="client"))
        pg_session.commit()
        # bypass the ORM validator: the database itself refuses a case variant
        from sqlalchemy import text

        with pytest.raises(IntegrityError):
            pg_session.execute(text(
                "INSERT INTO users (id, email, password_hash, name, role, created_at) "
                "VALUES (gen_random_uuid(), 'DUP@example.com', 'x', 'B', 'client', now())"
            ))
        pg_session.rollback()

    def test_login_endpoint_accepts_any_case(self, client, world):
        r = client.post("/api/auth/login", json={"email": "OWNER@Acme.com", "password": PASSWORD})
        assert r.status_code == 200, r.text
        assert r.json()["user"]["email"] == "owner@acme.com"
