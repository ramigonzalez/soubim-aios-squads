"""Tests for the Fathom webhook auto-import (Story 13.9).

No real call reaches Fathom: registration goes through the httpx.MockTransport fake of the 13.3
tests; deliveries are signed here with the same Standard Webhooks scheme Fathom uses.
"""

import base64
import json
import logging
import time
import uuid
from datetime import timedelta

import httpx
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.api.routes import fathom as routes
from app.database.models import (
    FathomConnection,
    FathomImport,
    FathomUnassignedMeeting,
    FathomWebhookEvent,
    Job,
    Project,
    User,
)
from app.database.session import get_db
from app.integrations import fathom
from app.services import fathom_webhook
from app.utils.crypto import decrypt_token, encrypt_token
from tests.org_helpers import make_org, make_org_member
from tests.unit.test_fathom import FakeFathom, configured, fake, make_connection  # noqa: F401 (fixtures)
from tests.unit.test_recording_storage import fake_s3  # noqa: F401 (fixture)

API = "/external/v1"
SECRET = "whsec_" + base64.b64encode(b"unit-test-signing-key-0123456789").decode()
OTHER_SECRET = "whsec_" + base64.b64encode(b"another-connection-secret-012345").decode()
REC = "777001"
PAYLOAD = {
    "recording_id": 777001,
    "title": "Coordenação semanal",
    "recording_start_time": "2026-10-02T13:00:00Z",
    "recorded_by": {"name": "Rami", "email": "rami@example.com"},
}


@pytest.fixture
def org(db_session: Session):
    return make_org(db_session, "souBIM", "soubim-test")


@pytest.fixture
def user(db_session: Session, org) -> User:
    u = User(email="rami@soubim.com", password_hash="x", name="Rami", role="director")
    db_session.add(u)
    make_org_member(db_session, u, "admin", org)
    db_session.commit()
    return u


@pytest.fixture
def project(db_session: Session, org) -> Project:
    p = Project(owner_organization_id=org.id, name="D/SEASON")
    db_session.add(p)
    db_session.commit()
    return p


@pytest.fixture
def conn(db_session: Session, user, project, fake, fake_s3) -> FathomConnection:
    """A connection with auto-import on, a default project and a known signing secret."""
    c = make_connection(db_session, user)
    c.auto_import_enabled = True
    c.auto_import_project_id = project.id
    c.webhook_id = "wh_1"
    c.webhook_secret_enc = encrypt_token(SECRET)
    db_session.commit()
    return c


@pytest.fixture
def client(db_session: Session):
    from app.main import app

    app.dependency_overrides[get_db] = lambda: db_session
    yield TestClient(app)  # no context manager: no startup (DB init, scheduler)
    app.dependency_overrides.pop(get_db, None)


def deliver(client, conn_id, payload=PAYLOAD, *, secret=SECRET, webhook_id=None, timestamp=None, body=None, headers=None):
    """POST a signed delivery (the signature covers the raw body bytes that are sent)."""
    raw = body if body is not None else json.dumps(payload).encode()
    webhook_id = webhook_id or f"msg_{uuid.uuid4().hex[:12]}"
    timestamp = str(int(time.time())) if timestamp is None else str(timestamp)
    sent = {
        "content-type": "application/json",
        "webhook-id": webhook_id,
        "webhook-timestamp": timestamp,
        "webhook-signature": fathom_webhook.sign(secret, webhook_id, timestamp, raw),
    }
    sent.update(headers or {})
    return client.post(f"/api/fathom/webhook/{conn_id}", content=raw, headers=sent)


def counts(db: Session):
    db.expire_all()
    return (
        db.query(FathomImport).count(), db.query(Job).count(),
        db.query(FathomUnassignedMeeting).count(), db.query(FathomWebhookEvent).count(),
    )


# --------------------------------------------------------------------------- signature


class TestSignature:
    BODY = b'{"recording_id": 1}'

    def check(self, header, *, secret=SECRET, wid="msg_1", ts=None, body=None, now=None):
        now = now or time.time()
        ts = str(int(now)) if ts is None else str(ts)
        return fathom_webhook.verify_signature(secret, wid, ts, header, body if body is not None else self.BODY, now)

    def test_valid(self):
        now = time.time()
        sig = fathom_webhook.sign(SECRET, "msg_1", str(int(now)), self.BODY)
        assert self.check(sig, now=now)

    def test_matches_the_standard_webhooks_construction(self):
        key = base64.b64decode(SECRET[len("whsec_"):])
        import hashlib
        import hmac
        expected = base64.b64encode(hmac.new(key, b"msg_1.1700000000." + self.BODY, hashlib.sha256).digest()).decode()
        assert fathom_webhook.sign(SECRET, "msg_1", "1700000000", self.BODY) == "v1," + expected

    def test_one_of_several_signatures(self):
        now = time.time()
        good = fathom_webhook.sign(SECRET, "msg_1", str(int(now)), self.BODY)
        bad = fathom_webhook.sign(OTHER_SECRET, "msg_1", str(int(now)), self.BODY)
        assert self.check(f"{bad} {good}", now=now)
        assert self.check(f"{good} {bad}", now=now)
        assert not self.check(f"{bad} v1,AAAA", now=now)

    @pytest.mark.parametrize("header", ["", "v1,", "v1", "v2,abc", "garbage", "v1,%%%", "x" * 5000])
    def test_malformed_signature_header(self, header):
        assert not self.check(header)

    def test_tampered_body_id_or_timestamp(self):
        now = time.time()
        sig = fathom_webhook.sign(SECRET, "msg_1", str(int(now)), self.BODY)
        assert not self.check(sig, now=now, body=b'{"recording_id": 2}')
        assert not self.check(sig, now=now, wid="msg_2")
        assert not self.check(sig, now=now, ts=int(now) + 1)

    def test_wrong_secret(self):
        now = time.time()
        assert not self.check(fathom_webhook.sign(OTHER_SECRET, "msg_1", str(int(now)), self.BODY), now=now)

    def test_timestamp_window(self):
        now = time.time()
        for delta, ok in ((0, True), (-299, True), (299, True), (-301, False), (301, False), (-86400, False)):
            ts = str(int(now) + delta)
            sig = fathom_webhook.sign(SECRET, "msg_1", ts, self.BODY)
            assert self.check(sig, now=now, ts=ts) is ok, delta

    @pytest.mark.parametrize("ts", ["", "abc", "-5", "1.5", "1e9", " 1700000000", "9" * 20])
    def test_malformed_timestamp(self, ts):
        sig = fathom_webhook.sign(SECRET, "msg_1", ts, self.BODY)
        assert not fathom_webhook.verify_signature(SECRET, "msg_1", ts, sig, self.BODY, time.time())

    @pytest.mark.parametrize("wid", [None, "", "a b", "x" * 200, "id/../x"])
    def test_malformed_id(self, wid):
        assert not fathom_webhook.verify_signature(SECRET, wid, str(int(time.time())), "v1,AAAA", self.BODY, time.time())


# --------------------------------------------------------------------------- delivery


class TestDelivery:
    def test_valid_delivery_queues_an_import_into_the_default_project(self, client, db_session, user, project, conn):
        response = deliver(client, conn.id)
        assert response.status_code == 202 and response.json() == {"status": "imported"}
        imp = db_session.query(FathomImport).one()
        assert (imp.recording_id, imp.project_id, imp.user_id) == (REC, project.id, user.id)
        job = db_session.query(Job).one()
        assert (job.type, job.payload, job.status) == ("fathom_import", {"import_id": str(imp.id)}, "queued")
        assert job.organization_id == project.owner_organization_id
        assert imp.job_id == job.id
        assert db_session.query(FathomWebhookEvent).count() == 1

    def test_owner_organization_and_visibility_are_set_like_a_manual_import(self, client, db_session, org, project, conn):
        deliver(client, conn.id)
        imp = db_session.query(FathomImport).one()
        assert imp.owner_organization_id == org.id and imp.visibility == "internal"

    def test_shared_default_is_honored_for_an_admin(self, client, db_session, conn):
        conn.auto_import_visibility = "shared"
        db_session.commit()
        deliver(client, conn.id)
        assert db_session.query(FathomImport).one().visibility == "shared"

    def test_shared_default_falls_back_to_internal_when_the_user_is_no_longer_admin(self, client, db_session, user, org, project, conn):
        conn.auto_import_visibility = "shared"
        from app.database.models import OrganizationMember, ProjectMember
        row = db_session.query(OrganizationMember).filter_by(user_id=user.id, organization_id=org.id).one()
        row.role = "member"
        db_session.add(ProjectMember(project_id=project.id, user_id=user.id, role="member"))
        db_session.commit()
        deliver(client, conn.id)
        assert db_session.query(FathomImport).one().visibility == "internal"

    def test_bad_signature_is_rejected_and_nothing_is_stored(self, client, db_session, conn):
        response = deliver(client, conn.id, headers={"webhook-signature": "v1,AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="})
        assert response.status_code == 401
        assert counts(db_session) == (0, 0, 0, 0)

    def test_signature_of_another_secret_is_rejected(self, client, db_session, conn):
        assert deliver(client, conn.id, secret=OTHER_SECRET).status_code == 401
        assert counts(db_session) == (0, 0, 0, 0)

    def test_valid_signature_for_another_connection_is_rejected(self, client, db_session, org, project, conn, fake):
        other_user = User(email="b@soubim.com", password_hash="x", name="B", role="director")
        db_session.add(other_user)
        make_org_member(db_session, other_user, "admin", org)
        db_session.commit()
        other = make_connection(db_session, other_user)
        other.auto_import_enabled = True
        other.auto_import_project_id = project.id
        other.webhook_secret_enc = encrypt_token(OTHER_SECRET)
        db_session.commit()
        # signed with conn's secret but sent to other's URL, and vice versa
        assert deliver(client, other.id, secret=SECRET).status_code == 401
        assert deliver(client, conn.id, secret=OTHER_SECRET).status_code == 401
        assert counts(db_session) == (0, 0, 0, 0)
        assert deliver(client, other.id, secret=OTHER_SECRET).status_code == 202
        assert db_session.query(FathomImport).one().user_id == other_user.id

    def test_tampered_body_is_rejected(self, client, db_session, conn):
        raw = json.dumps(PAYLOAD).encode()
        wid, ts = "msg_t", str(int(time.time()))
        signature = fathom_webhook.sign(SECRET, wid, ts, raw)
        evil = json.dumps({**PAYLOAD, "recording_id": 5}).encode()
        response = client.post(f"/api/fathom/webhook/{conn.id}", content=evil, headers={
            "webhook-id": wid, "webhook-timestamp": ts, "webhook-signature": signature})
        assert response.status_code == 401 and counts(db_session) == (0, 0, 0, 0)

    @pytest.mark.parametrize("delta", [-3600, -301, 301, 3600])
    def test_timestamp_outside_the_window_is_rejected(self, client, db_session, conn, delta):
        assert deliver(client, conn.id, timestamp=int(time.time()) + delta).status_code == 401
        assert counts(db_session) == (0, 0, 0, 0)

    def test_replayed_webhook_id_is_acknowledged_once(self, client, db_session, conn):
        first = deliver(client, conn.id, webhook_id="msg_same")
        second = deliver(client, conn.id, webhook_id="msg_same")
        assert first.json() == {"status": "imported"}
        assert second.status_code == 202 and second.json() == {"status": "duplicate"}
        assert counts(db_session) == (1, 1, 0, 1)

    def test_replay_of_an_unassigned_delivery_adds_nothing(self, client, db_session, conn):
        conn.auto_import_project_id = None
        db_session.commit()
        deliver(client, conn.id, webhook_id="msg_u")
        deliver(client, conn.id, webhook_id="msg_u")
        assert counts(db_session) == (0, 0, 1, 1)

    @pytest.mark.parametrize("headers", [
        {"webhook-id": ""}, {"webhook-timestamp": "abc"}, {"webhook-timestamp": ""},
        {"webhook-signature": ""}, {"webhook-signature": "v1"}, {"webhook-signature": "nonsense"},
        {"webhook-id": "bad id with spaces"},
    ])
    def test_malformed_headers_are_rejected(self, client, db_session, conn, headers):
        assert deliver(client, conn.id, headers=headers).status_code == 401
        assert counts(db_session) == (0, 0, 0, 0)

    @pytest.mark.parametrize("missing", ["webhook-id", "webhook-timestamp", "webhook-signature"])
    def test_missing_headers_are_rejected(self, client, db_session, conn, missing):
        raw = json.dumps(PAYLOAD).encode()
        wid, ts = "msg_m", str(int(time.time()))
        headers = {"webhook-id": wid, "webhook-timestamp": ts, "webhook-signature": fathom_webhook.sign(SECRET, wid, ts, raw)}
        del headers[missing]
        assert client.post(f"/api/fathom/webhook/{conn.id}", content=raw, headers=headers).status_code == 401
        assert counts(db_session) == (0, 0, 0, 0)

    def test_disabled_connection_is_rejected_with_the_same_answer(self, client, db_session, conn):
        unknown = deliver(client, uuid.uuid4())
        bad = deliver(client, conn.id, secret=OTHER_SECRET)
        conn.auto_import_enabled = False
        db_session.commit()
        disabled = deliver(client, conn.id)  # correctly signed, but opted out
        assert unknown.status_code == bad.status_code == disabled.status_code == 401
        assert unknown.json() == bad.json() == disabled.json()  # no oracle for ids / state
        assert counts(db_session) == (0, 0, 0, 0)

    def test_connection_without_a_secret_or_with_an_unreadable_one_is_rejected(self, client, db_session, conn):
        conn.webhook_secret_enc = encrypt_token(SECRET)[:-4] + "AAAA"  # corrupted ciphertext
        db_session.commit()
        assert deliver(client, conn.id).status_code == 401
        conn.webhook_secret_enc = None
        db_session.commit()
        assert deliver(client, conn.id).status_code == 401

    def test_non_uuid_connection_id_is_rejected(self, client):
        assert deliver(client, "not-a-uuid").status_code == 401
        assert deliver(client, "..%2F..%2Fadmin").status_code in (401, 404)

    def test_works_without_a_jwt(self, client, conn):
        assert "authorization" not in {k.lower() for k in client.headers}
        assert deliver(client, conn.id).status_code == 202

    def test_oversized_payload_is_refused(self, client, db_session, conn):
        big = b'{"recording_id": 1, "pad": "' + b"x" * (fathom_webhook.MAX_BODY_BYTES + 10) + b'"}'
        assert deliver(client, conn.id, body=big).status_code == 413
        assert counts(db_session) == (0, 0, 0, 0)

    def test_oversized_chunked_payload_is_refused_without_content_length(self, client, db_session, conn):
        """Security review: a chunked body has no Content-Length — the cap must apply while streaming."""
        chunk = b"x" * 65536
        chunks = iter([chunk] * (fathom_webhook.MAX_BODY_BYTES // len(chunk) + 2))
        response = client.post(f"/api/fathom/webhook/{conn.id}", content=chunks, headers={
            "webhook-id": "msg_big", "webhook-timestamp": str(int(time.time())), "webhook-signature": "v1,AAAA"})
        assert response.status_code == 413
        assert counts(db_session) == (0, 0, 0, 0)

    def test_body_reader_stops_at_the_cap_on_an_endless_stream(self):
        import asyncio

        pulled = {"n": 0}

        class EndlessRequest:
            async def stream(self):
                while True:
                    pulled["n"] += 1
                    yield b"x" * 1024

        assert asyncio.run(routes._read_capped_body(EndlessRequest(), 10_000)) is None
        assert pulled["n"] == 10  # stopped right after crossing the cap, nothing more buffered

    def test_chunked_payload_under_the_cap_is_accepted(self, client, db_session, conn):
        raw = json.dumps(PAYLOAD).encode()
        wid, ts = "msg_chunked", str(int(time.time()))
        response = client.post(f"/api/fathom/webhook/{conn.id}", content=iter([raw[:10], raw[10:]]), headers={
            "webhook-id": wid, "webhook-timestamp": ts, "webhook-signature": fathom_webhook.sign(SECRET, wid, ts, raw)})
        assert response.status_code == 202 and response.json() == {"status": "imported"}

    def test_same_recording_with_a_new_webhook_id_is_not_imported_twice(self, client, db_session, conn):
        deliver(client, conn.id)
        again = deliver(client, conn.id)
        assert again.json() == {"status": "duplicate"}
        assert counts(db_session) == (1, 1, 0, 2)

    def test_recording_already_imported_manually_is_not_imported_again(self, client, db_session, user, project, conn):
        routes.fathom_start_import(
            body=routes.ImportRequest(recording_id=REC, project_id=str(project.id)), db=db_session, user=user)
        assert deliver(client, conn.id).json() == {"status": "duplicate"}
        assert counts(db_session)[:2] == (1, 1)

    @pytest.mark.parametrize("payload", [
        {}, {"title": "no id"}, {"recording_id": None}, {"recording_id": ["1"]}, {"recording_id": "../x"},
        {"recording_id": True}, [1, 2], "text",
    ])
    def test_valid_signature_with_an_unusable_payload_is_ignored(self, client, db_session, conn, payload):
        response = deliver(client, conn.id, payload)
        assert response.status_code == 202 and response.json() == {"status": "ignored"}
        assert counts(db_session)[:3] == (0, 0, 0)

    def test_non_json_body_is_ignored(self, client, db_session, conn):
        assert deliver(client, conn.id, body=b"\xff\xfe not json").json() == {"status": "ignored"}
        assert counts(db_session)[:3] == (0, 0, 0)

    def test_old_events_are_pruned(self, client, db_session, conn):
        db_session.add(FathomWebhookEvent(
            connection_id=conn.id, webhook_id="ancient", received_at=fathom.utcnow() - timedelta(days=3)))
        db_session.commit()
        deliver(client, conn.id)
        assert {e.webhook_id for e in db_session.query(FathomWebhookEvent)} != {"ancient"}
        assert db_session.query(FathomWebhookEvent).filter_by(webhook_id="ancient").count() == 0

    def test_nothing_sensitive_is_logged(self, client, db_session, conn, caplog):
        with caplog.at_level(logging.DEBUG):
            deliver(client, conn.id)
            deliver(client, conn.id, secret=OTHER_SECRET)
        text = caplog.text
        assert SECRET not in text and OTHER_SECRET not in text and "whsec_" not in text
        assert "Coordenação semanal" not in text and "v1," not in text


# --------------------------------------------------------------------------- unassigned flow


class TestUnassigned:
    def test_no_default_project_lands_in_unassigned(self, client, db_session, user, conn):
        conn.auto_import_project_id = None
        db_session.commit()
        response = deliver(client, conn.id)
        assert response.json() == {"status": "unassigned"}
        row = db_session.query(FathomUnassignedMeeting).one()
        assert (row.user_id, row.recording_id, row.title, row.reason) == (
            user.id, REC, "Coordenação semanal", "no_default_project")
        assert row.started_at.isoformat() == "2026-10-02T13:00:00"
        assert counts(db_session)[:2] == (0, 0)  # no import, no job

    @pytest.mark.parametrize("setup", ["archived", "deleted", "no_access", "no_storage"])
    def test_unusable_default_project_lands_in_unassigned(self, client, db_session, org, project, conn, monkeypatch, setup):
        if setup == "archived":
            project.archived_at = fathom.utcnow()
        elif setup == "deleted":
            db_session.delete(project)  # FK SET NULL on the connection
        elif setup == "no_access":
            from app.database.models import OrganizationMember
            db_session.query(OrganizationMember).filter_by(user_id=conn.user_id).update({"role": "member"})  # not assigned
        else:
            from app.config import settings
            monkeypatch.setattr(settings, "s3_endpoint", None)
        db_session.commit()
        assert deliver(client, conn.id).json()["status"] == "unassigned"
        assert counts(db_session)[:3] == (0, 0, 1)

    def test_same_recording_twice_is_listed_once(self, client, db_session, conn):
        conn.auto_import_project_id = None
        db_session.commit()
        deliver(client, conn.id)
        deliver(client, conn.id)
        assert db_session.query(FathomUnassignedMeeting).count() == 1

    def test_concurrent_park_of_the_same_recording_keeps_the_claim(self, client, db_session, conn, monkeypatch):
        """Security review: two deliveries (different webhook-ids) racing on the unique (user, recording)
        row must not 500 — the loser still records its delivery id and answers ``unassigned``."""
        conn.auto_import_project_id = None
        db_session.commit()
        assert deliver(client, conn.id).json()["status"] == "unassigned"
        from sqlalchemy.orm import Query
        real_first = Query.first

        def blind_first(self):  # the existence check misses the row the other delivery just committed
            if self.column_descriptions and self.column_descriptions[0]["entity"] is FathomUnassignedMeeting:
                return None
            return real_first(self)

        monkeypatch.setattr(Query, "first", blind_first)
        response = deliver(client, conn.id, webhook_id="msg_racer")
        assert response.status_code == 202 and response.json() == {"status": "unassigned"}
        monkeypatch.undo()
        assert db_session.query(FathomUnassignedMeeting).count() == 1
        assert db_session.query(FathomWebhookEvent).filter_by(webhook_id="msg_racer").count() == 1

    def test_title_is_trimmed_and_capped(self, client, db_session, conn):
        conn.auto_import_project_id = None
        db_session.commit()
        deliver(client, conn.id, {**PAYLOAD, "title": "  " + "A" * 400 + "\n x "})
        assert len(db_session.query(FathomUnassignedMeeting).one().title) == 255

    def test_list_assign_and_discard(self, client, db_session, user, project, conn, fake_s3):
        conn.auto_import_project_id = None
        db_session.commit()
        deliver(client, conn.id)
        deliver(client, conn.id, {**PAYLOAD, "recording_id": 777002})
        listed = routes.fathom_unassigned(db=db_session, user=user)
        assert {m["recording_id"] for m in listed} == {REC, "777002"}
        first = next(m for m in listed if m["recording_id"] == REC)

        result = routes.fathom_assign_unassigned(
            first["id"], routes.AssignRequest(project_id=str(project.id)), db=db_session, user=user)
        assert result["state"] == "queued" and result["project_id"] == str(project.id)
        imp = db_session.query(FathomImport).one()
        assert (imp.recording_id, imp.visibility, imp.user_id) == (REC, "internal", user.id)
        assert db_session.query(Job).count() == 1
        assert [m["recording_id"] for m in routes.fathom_unassigned(db=db_session, user=user)] == ["777002"]

        other = routes.fathom_unassigned(db=db_session, user=user)[0]
        routes.fathom_discard_unassigned(other["id"], db=db_session, user=user)
        assert routes.fathom_unassigned(db=db_session, user=user) == []
        assert db_session.query(FathomImport).count() == 1  # discarding imports nothing

    def test_assign_checks_access_and_visibility_like_a_manual_import(self, client, db_session, org, user, project, conn, fake_s3):
        conn.auto_import_project_id = None
        db_session.commit()
        deliver(client, conn.id)
        item = routes.fathom_unassigned(db=db_session, user=user)[0]
        foreign = Project(owner_organization_id=make_org(db_session, "DIMAS").id, name="Other")
        db_session.add(foreign)
        db_session.commit()
        with pytest.raises(HTTPException) as exc:
            routes.fathom_assign_unassigned(item["id"], routes.AssignRequest(project_id=str(foreign.id)), db=db_session, user=user)
        assert exc.value.status_code == 403
        assert db_session.query(FathomUnassignedMeeting).count() == 1 and db_session.query(FathomImport).count() == 0

        routes.fathom_assign_unassigned(
            item["id"], routes.AssignRequest(project_id=str(project.id), visibility="shared"), db=db_session, user=user)
        assert db_session.query(FathomImport).one().visibility == "shared"

    def test_assign_of_an_already_imported_recording_is_a_conflict(self, client, db_session, user, project, conn, fake_s3):
        conn.auto_import_project_id = None
        db_session.commit()
        deliver(client, conn.id)
        routes.fathom_start_import(
            body=routes.ImportRequest(recording_id=REC, project_id=str(project.id)), db=db_session, user=user)
        item = routes.fathom_unassigned(db=db_session, user=user)[0]
        with pytest.raises(HTTPException) as exc:
            routes.fathom_assign_unassigned(item["id"], routes.AssignRequest(project_id=str(project.id)), db=db_session, user=user)
        assert exc.value.status_code == 409

    def test_other_users_items_are_invisible(self, client, db_session, org, user, conn):
        conn.auto_import_project_id = None
        db_session.commit()
        deliver(client, conn.id)
        item = routes.fathom_unassigned(db=db_session, user=user)[0]
        intruder = User(email="i@soubim.com", password_hash="x", name="I", role="director")
        db_session.add(intruder)
        make_org_member(db_session, intruder, "admin", org)
        db_session.commit()
        assert routes.fathom_unassigned(db=db_session, user=intruder) == []
        for call in (
            lambda: routes.fathom_discard_unassigned(item["id"], db=db_session, user=intruder),
            lambda: routes.fathom_assign_unassigned(item["id"], routes.AssignRequest(project_id=str(uuid.uuid4())), db=db_session, user=intruder),
            lambda: routes.fathom_discard_unassigned("not-a-uuid", db=db_session, user=user),
        ):
            with pytest.raises(HTTPException) as exc:
                call()
            assert exc.value.status_code == 404
        assert db_session.query(FathomUnassignedMeeting).count() == 1


# --------------------------------------------------------------------------- opt-in & registration


def api(fake: FakeFathom, method: str, path: str, *responses):
    fake.api_responses[(method, API + path)] = list(responses)


def webhook_requests(fake: FakeFathom, method: str):
    return [r for r in fake.requests if r.method == method and r.url.path.startswith(API + "/webhooks")]


@pytest.fixture
def plain_conn(db_session: Session, user, fake) -> FathomConnection:
    return make_connection(db_session, user)


class TestAutoImportSettings:
    def test_off_by_default(self, db_session, user, plain_conn):
        import asyncio
        body = asyncio.run(routes.fathom_status(db=db_session, user=user))
        assert body["auto_import"] == {"enabled": False, "project_id": None, "project_name": None, "visibility": "internal"}
        assert plain_conn.webhook_secret_enc is None

    def test_enable_registers_the_webhook_and_stores_the_secret_encrypted(self, db_session, user, project, plain_conn, fake):
        api(fake, "POST", "/webhooks", httpx.Response(201, json={"id": "wh_abc", "secret": SECRET, "url": "x"}))
        body = routes.fathom_auto_import(
            routes.AutoImportRequest(enabled=True, project_id=str(project.id)), db=db_session, user=user)
        assert body == {"enabled": True, "project_id": str(project.id), "project_name": "D/SEASON", "visibility": "internal"}
        sent = webhook_requests(fake, "POST")[0]
        payload = json.loads(sent.content)
        assert payload["destination_url"] == f"https://example.ngrok.app/api/fathom/webhook/{plain_conn.id}"
        assert payload["triggered_for"] == ["my_recordings"]
        assert payload["include_transcript"] is True  # Fathom requires at least one content type
        assert sent.headers["authorization"] == "Bearer acc-1"
        db_session.refresh(plain_conn)
        assert plain_conn.webhook_id == "wh_abc"
        assert SECRET not in plain_conn.webhook_secret_enc  # Fernet ciphertext, not plain text
        assert decrypt_token(plain_conn.webhook_secret_enc) == SECRET
        assert plain_conn.auto_import_enabled is True

    def test_secret_never_appears_in_responses(self, db_session, user, plain_conn, fake):
        import asyncio
        api(fake, "POST", "/webhooks", httpx.Response(201, json={"id": "wh_abc", "secret": SECRET}))
        body = routes.fathom_auto_import(routes.AutoImportRequest(enabled=True), db=db_session, user=user)
        status = asyncio.run(routes.fathom_status(db=db_session, user=user))
        assert SECRET not in json.dumps(body) and SECRET not in json.dumps(status)
        assert "webhook" not in json.dumps(status)

    def test_enable_without_project_is_allowed_everything_goes_to_unassigned(self, db_session, user, plain_conn, fake):
        api(fake, "POST", "/webhooks", httpx.Response(201, json={"id": "wh_abc", "secret": SECRET}))
        body = routes.fathom_auto_import(routes.AutoImportRequest(enabled=True), db=db_session, user=user)
        assert body["enabled"] is True and body["project_id"] is None

    def test_changing_project_does_not_register_again(self, db_session, user, project, plain_conn, fake):
        api(fake, "POST", "/webhooks", httpx.Response(201, json={"id": "wh_abc", "secret": SECRET}))
        routes.fathom_auto_import(routes.AutoImportRequest(enabled=True), db=db_session, user=user)
        routes.fathom_auto_import(routes.AutoImportRequest(enabled=True, project_id=str(project.id)), db=db_session, user=user)
        assert len(webhook_requests(fake, "POST")) == 1

    def test_registration_failure_leaves_it_disabled(self, db_session, user, plain_conn, fake):
        api(fake, "POST", "/webhooks", httpx.Response(500, json={"error": "boom"}))
        with pytest.raises(HTTPException) as exc:
            routes.fathom_auto_import(routes.AutoImportRequest(enabled=True), db=db_session, user=user)
        assert exc.value.status_code == 502
        db_session.refresh(plain_conn)
        assert plain_conn.auto_import_enabled is False and plain_conn.webhook_secret_enc is None

    def test_unexpected_registration_response_leaves_it_disabled(self, db_session, user, plain_conn, fake):
        api(fake, "POST", "/webhooks", httpx.Response(201, json={"id": "wh_abc"}))  # no secret
        with pytest.raises(HTTPException) as exc:
            routes.fathom_auto_import(routes.AutoImportRequest(enabled=True), db=db_session, user=user)
        assert exc.value.status_code == 502
        db_session.refresh(plain_conn)
        assert plain_conn.auto_import_enabled is False and plain_conn.webhook_id is None

    def test_disable_deletes_the_webhook_and_forgets_the_secret(self, db_session, user, conn, fake):
        api(fake, "DELETE", "/webhooks/wh_1", httpx.Response(204))
        body = routes.fathom_auto_import(routes.AutoImportRequest(enabled=False), db=db_session, user=user)
        assert body["enabled"] is False
        assert [r.url.path for r in webhook_requests(fake, "DELETE")] == [API + "/webhooks/wh_1"]
        db_session.refresh(conn)
        assert (conn.webhook_id, conn.webhook_secret_enc, conn.auto_import_enabled) == (None, None, False)

    def test_disable_still_works_when_fathom_fails(self, db_session, user, conn, fake):
        api(fake, "DELETE", "/webhooks/wh_1", httpx.Response(500, json={}))
        routes.fathom_auto_import(routes.AutoImportRequest(enabled=False), db=db_session, user=user)
        db_session.refresh(conn)
        assert conn.webhook_secret_enc is None and conn.auto_import_enabled is False

    def test_disconnect_deletes_the_webhook(self, db_session, user, conn, fake):
        import asyncio
        api(fake, "DELETE", "/webhooks/wh_1", httpx.Response(204))
        asyncio.run(routes.fathom_disconnect(db=db_session, user=user))
        assert len(webhook_requests(fake, "DELETE")) == 1
        assert db_session.query(FathomConnection).count() == 0

    def test_enable_needs_a_connection(self, db_session, user, fake):
        with pytest.raises(HTTPException) as exc:
            routes.fathom_auto_import(routes.AutoImportRequest(enabled=True), db=db_session, user=user)
        assert exc.value.status_code == 409

    def test_default_project_needs_write_access(self, db_session, org, user, plain_conn, fake):
        foreign = Project(owner_organization_id=make_org(db_session, "DIMAS").id, name="Other")
        db_session.add(foreign)
        db_session.commit()
        with pytest.raises(HTTPException) as exc:
            routes.fathom_auto_import(routes.AutoImportRequest(enabled=True, project_id=str(foreign.id)), db=db_session, user=user)
        assert exc.value.status_code == 403
        assert webhook_requests(fake, "POST") == []

    def test_shared_default_needs_an_admin(self, db_session, org, project, fake):
        from tests.org_helpers import assign_to_project
        member = User(email="m@soubim.com", password_hash="x", name="M", role="architect")
        db_session.add(member)
        make_org_member(db_session, member, "member", org)
        assign_to_project(db_session, member, project)
        db_session.commit()
        make_connection(db_session, member)
        with pytest.raises(HTTPException) as exc:
            routes.fathom_auto_import(
                routes.AutoImportRequest(enabled=True, project_id=str(project.id), visibility="shared"), db=db_session, user=member)
        assert exc.value.status_code == 403

    def test_needs_reconnect_blocks_enabling(self, db_session, user, plain_conn, fake):
        plain_conn.revoked_at = fathom.utcnow()
        db_session.commit()
        with pytest.raises(HTTPException) as exc:
            routes.fathom_auto_import(routes.AutoImportRequest(enabled=True), db=db_session, user=user)
        assert exc.value.status_code == 409 and exc.value.detail == "needs_reconnect"

    def test_visibility_value_is_validated(self):
        from pydantic import ValidationError
        with pytest.raises(ValidationError):
            routes.AutoImportRequest(enabled=True, visibility="public")
