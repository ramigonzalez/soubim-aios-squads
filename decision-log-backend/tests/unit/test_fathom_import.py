"""Tests for browsing and importing Fathom meetings (Story 13.4).

No real call reaches Fathom, storage or Claude: Fathom HTTP goes through an httpx.MockTransport
(response shapes from the 13.3/13.4 spike), the recording download through another
MockTransport, and storage is the in-memory fake S3 from the 13.1 tests.
"""

import threading
import time
import uuid
from datetime import datetime, timedelta

import httpx
import pytest
from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy.orm import Session, sessionmaker

from app import worker
from app.api.routes import fathom as routes
from app.database.models import FathomConnection, FathomImport, Job, Project, Source, User
from app.integrations import fathom
from app.services import fathom_import
from app.utils.crypto import decrypt_token, encrypt_token
from tests.org_helpers import assign_to_project, make_org, make_org_member
from tests.unit.test_fathom import (  # noqa: F401 (fixtures)
    REFRESHED,
    FakeFathom,
    configured,
    fake,
    make_connection,
)
from tests.unit.test_recording_storage import FakeS3, fake_s3  # noqa: F401 (fixture)

API = "/external/v1"
REC = "123456"
MEETING = {
    "recording_id": 123456,
    "title": "Reunião de coordenação",
    "meeting_title": "Coordenação D/SEASON",
    "recording_start_time": "2026-10-01T13:00:00Z",
    "recording_end_time": "2026-10-01T14:38:00Z",
    "calendar_invitees": [
        {"name": "Ana Souza", "email": "ana@example.com"},
        {"name": None, "email": "bruno@example.com"},
    ],
    "recorded_by": {"name": "Rami", "email": "rami@example.com"},
    "share_url": "https://fathom.video/share/abc",
    "transcript": [
        {"speaker": {"display_name": "Ana Souza"}, "text": "Bom dia a todos.", "timestamp": "00:00:05"},
        {"speaker": {"display_name": "Rami"}, "text": "Vamos  falar\nda soleira.", "timestamp": "00:33:40"},
        {"speaker": {"display_name": "Ana Souza"}, "text": "   ", "timestamp": "00:40:00"},
        {"speaker": {"display_name": "Débora"}, "text": "Fechado.", "timestamp": "01:02:03"},
    ],
}
OTHER_MEETING = {**MEETING, "recording_id": 999, "title": "Entrevista", "transcript": []}
VIDEO_URL = "https://fathom-downloads.example.com/signed/video.mp4?sig=x"


def page(items, next_cursor=None):
    return httpx.Response(200, json={"items": items, "next_cursor": next_cursor, "limit": 10})


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
def conn(db_session: Session, user, fake) -> FathomConnection:
    return make_connection(db_session, user)


@pytest.fixture
def factory(db_session: Session, monkeypatch):
    f = sessionmaker(bind=db_session.get_bind())
    monkeypatch.setattr(fathom_import, "SessionLocal", f)
    monkeypatch.setattr(fathom_import, "_sleep", lambda s: None)
    return f


@pytest.fixture
def video(monkeypatch):
    """Fake signed-URL download of the recording."""
    state = {"responses": [(200, b"mp4-bytes" * 10)], "urls": []}  # (status, body); fresh Response per call

    def handler(request):
        state["urls"].append(str(request.url))
        queue = state["responses"]
        status, body = queue.pop(0) if len(queue) > 1 else queue[0]
        return httpx.Response(status, content=iter([body[:7], body[7:]]), headers={"content-type": "video/mp4"})  # streamed

    client = httpx.Client(transport=httpx.MockTransport(handler))
    monkeypatch.setattr(fathom_import, "_video_get", lambda url: client.stream("GET", url))
    return state


def api(fake: FakeFathom, method: str, path: str, *responses):
    fake.api_responses[(method, API + path)] = list(responses)


def happy_fathom(fake: FakeFathom, download_status=None):
    api(fake, "GET", "/meetings", page([OTHER_MEETING, MEETING]))
    api(fake, "POST", f"/recordings/{REC}/download", httpx.Response(202, json={"download_id": "dl-1", "status": "processing"}))
    api(fake, "GET", f"/recordings/{REC}/downloads/dl-1", *(download_status or [
        httpx.Response(200, json={"download_id": "dl-1", "status": "processing"}),
        httpx.Response(200, json={"download_id": "dl-1", "status": "completed", "video": {"url": VIDEO_URL}}),
    ]))


def start(db: Session, user, project, recording_id=REC):
    return routes.fathom_start_import(
        body=routes.ImportRequest(recording_id=recording_id, project_id=str(project.id)), db=db, user=user,
    )


def run_job(db: Session, factory):
    assert worker.run_once("w1", session_factory=factory) is True
    db.expire_all()


def requests_to(fake: FakeFathom, method: str, path: str):
    return [r for r in fake.requests if r.method == method and r.url.path == API + path]


# --------------------------------------------------------------------------- formatting


class TestFormatting:
    def test_transcript_in_our_turn_format(self):
        assert fathom_import.format_transcript(MEETING["transcript"]) == (
            "0:05 - Ana Souza\n"
            "  Bom dia a todos.\n"
            "33:40 - Rami\n"
            "  Vamos falar da soleira.\n"
            "1:02:03 - Débora\n"
            "  Fechado."
        )

    def test_transcript_tolerates_odd_segments(self):
        text = fathom_import.format_transcript([
            "junk", {"text": "Sem falante", "timestamp": 75}, {"speaker": "Ana", "text": "Oi", "timestamp": "bad"},
        ])
        assert text == "1:15 - Unknown\n  Sem falante\n0:00 - Ana\n  Oi"
        assert fathom_import.format_transcript(None) == ""

    def test_meeting_summary(self):
        summary = fathom_import.meeting_summary(MEETING)
        assert summary == {
            "recording_id": REC,
            "title": "Reunião de coordenação",
            "started_at": "2026-10-01T13:00:00Z",
            "duration_minutes": 98,
            "invitees": [{"name": "Ana Souza", "email": "ana@example.com"},
                         {"name": "bruno@example.com", "email": "bruno@example.com"}],
            "recorded_by": {"name": "Rami", "email": "rami@example.com"},
            "share_url": "https://fathom.video/share/abc",
        }

    def test_meeting_summary_falls_back_to_meeting_title_and_scheduled_times(self):
        summary = fathom_import.meeting_summary({
            "recording_id": 1, "meeting_title": "Sem título", "scheduled_start_time": "2026-10-01T10:00:00-03:00",
        })
        assert summary["title"] == "Sem título"
        assert summary["started_at"] == "2026-10-01T13:00:00Z"  # UTC
        assert summary["duration_minutes"] is None and summary["invitees"] == []


# --------------------------------------------------------------------------- browse


class TestBrowse:
    def test_lists_the_users_own_meetings_without_transcripts(self, db_session, user, conn, fake):
        api(fake, "GET", "/meetings", page([MEETING], next_cursor="cur-2"))
        body = routes.fathom_meetings(cursor="cur-1", db=db_session, user=user)
        assert body["next_cursor"] == "cur-2"
        assert [m["recording_id"] for m in body["items"]] == [REC]
        assert body["items"][0]["imports"] == []
        assert "transcript" not in body["items"][0]
        sent = requests_to(fake, "GET", "/meetings")[0]
        assert sent.url.params["cursor"] == "cur-1"
        assert "include_transcript" not in sent.url.params
        assert sent.headers["authorization"] == "Bearer acc-1"

    def test_marks_imports_only_of_projects_the_user_can_see(self, db_session, user, project, conn, fake):
        other_org = make_org(db_session, "DIMAS")
        hidden = Project(owner_organization_id=other_org.id, name="Hidden")
        db_session.add(hidden)
        db_session.flush()
        db_session.add_all([
            FathomImport(project_id=project.id, recording_id=REC, user_id=user.id),
            FathomImport(project_id=hidden.id, recording_id=REC, user_id=None),
        ])
        db_session.commit()
        api(fake, "GET", "/meetings", page([MEETING, OTHER_MEETING]))

        items = {m["recording_id"]: m for m in routes.fathom_meetings(cursor=None, db=db_session, user=user)["items"]}

        assert [i["project_name"] for i in items[REC]["imports"]] == ["D/SEASON"]
        assert items["999"]["imports"] == []

    def test_not_connected_and_needs_reconnect_answer_409(self, db_session, user, fake):
        with pytest.raises(HTTPException) as exc:
            routes.fathom_meetings(cursor=None, db=db_session, user=user)
        assert (exc.value.status_code, exc.value.detail) == (409, "not_connected")
        c = make_connection(db_session, user)
        c.revoked_at = fathom.utcnow()
        db_session.commit()
        with pytest.raises(HTTPException) as exc:
            routes.fathom_meetings(cursor=None, db=db_session, user=user)
        assert (exc.value.status_code, exc.value.detail) == (409, "needs_reconnect")
        assert fake.requests == []

    def test_fathom_failure_answers_502(self, db_session, user, conn, fake):
        api(fake, "GET", "/meetings", httpx.Response(500, json={"error": "boom"}))
        with pytest.raises(HTTPException) as exc:
            routes.fathom_meetings(cursor=None, db=db_session, user=user)
        assert exc.value.status_code == 502

    def test_import_projects_are_those_with_write_access(self, db_session, org, user, project):
        member = User(email="m@soubim.com", password_hash="x", name="Member", role="architect")
        db_session.add(member)
        make_org_member(db_session, member, "member", org)
        other = Project(owner_organization_id=org.id, name="Not assigned")
        archived = Project(owner_organization_id=org.id, name="Archived", archived_at=datetime(2026, 1, 1))
        db_session.add_all([other, archived])
        db_session.flush()
        assign_to_project(db_session, member, project)
        db_session.commit()

        assert [p["name"] for p in routes.fathom_import_projects(db=db_session, user=user)] == ["D/SEASON", "Not assigned"]
        assert [p["name"] for p in routes.fathom_import_projects(db=db_session, user=member)] == ["D/SEASON"]


# --------------------------------------------------------------------------- start import


class TestStartImport:
    def test_creates_the_import_and_enqueues_a_job(self, db_session, user, project, conn, fake_s3):
        body = start(db_session, user, project)
        imp = db_session.get(FathomImport, uuid.UUID(body["id"]))
        assert (imp.recording_id, imp.project_id, imp.user_id) == (REC, project.id, user.id)
        job = db_session.query(Job).one()
        assert (job.type, job.payload, job.status, job.max_attempts) == (
            "fathom_import", {"import_id": body["id"]}, "queued", fathom_import.MAX_ATTEMPTS)
        assert job.organization_id == project.owner_organization_id
        assert body["state"] == "queued" and body["job"]["status"] == "queued"
        assert db_session.query(Source).count() == 0  # nothing until the worker has the recording

    def test_same_recording_twice_into_a_project_is_refused(self, db_session, user, project, conn, fake_s3):
        start(db_session, user, project)
        with pytest.raises(HTTPException) as exc:
            start(db_session, user, project)
        assert exc.value.status_code == 409
        assert exc.value.detail["code"] == "already_imported"
        assert db_session.query(FathomImport).count() == 1 and db_session.query(Job).count() == 1

    def test_same_recording_into_another_project_is_allowed(self, db_session, org, user, project, conn, fake_s3):
        second = Project(owner_organization_id=org.id, name="Second")
        db_session.add(second)
        db_session.commit()
        start(db_session, user, project)
        start(db_session, user, second)
        assert db_session.query(FathomImport).count() == 2

    def test_needs_write_access_on_the_project(self, db_session, org, user, project, fake, fake_s3):
        outsider = User(email="out@dimas.com", password_hash="x", name="Out", role="client")
        db_session.add(outsider)
        make_org_member(db_session, outsider, "admin", make_org(db_session, "DIMAS"))
        member = User(email="m@soubim.com", password_hash="x", name="Member", role="architect")
        db_session.add(member)
        make_org_member(db_session, member, "member", org)  # not assigned to the project
        db_session.commit()
        make_connection(db_session, outsider)
        make_connection(db_session, member)

        for who in (outsider, member):
            with pytest.raises(HTTPException) as exc:
                start(db_session, who, project)
            assert exc.value.status_code == 403
        with pytest.raises(HTTPException) as exc:
            routes.fathom_start_import(
                body=routes.ImportRequest(recording_id=REC, project_id=str(uuid.uuid4())),
                db=db_session, user=user,
            )
        assert exc.value.status_code in (404, 409)  # unknown project (or not connected: user has no connection here)
        assert db_session.query(FathomImport).count() == 0

    def test_requires_connection_and_storage(self, db_session, user, project, fake, monkeypatch):
        with pytest.raises(HTTPException) as exc:
            start(db_session, user, project)
        assert exc.value.status_code == 409  # not connected
        make_connection(db_session, user)
        with pytest.raises(HTTPException) as exc:
            start(db_session, user, project)
        assert exc.value.status_code == 503  # storage not configured
        assert db_session.query(FathomImport).count() == 0

    def test_recording_id_is_validated(self):
        for bad in ("../meetings", "a/b", "", "x" * 129, "1?x=1"):
            with pytest.raises(ValidationError):
                routes.ImportRequest(recording_id=bad, project_id="p")


# --------------------------------------------------------------------------- worker job


class TestImportJob:
    def test_downloads_into_storage_and_creates_a_pending_meeting(
        self, db_session, user, project, conn, fake, fake_s3, factory, video,
    ):
        happy_fathom(fake)
        body = start(db_session, user, project)

        run_job(db_session, factory)

        imp = db_session.query(FathomImport).one()
        source = db_session.get(Source, imp.source_id)
        assert source.id == imp.id
        assert (source.source_type, source.ingestion_status, source.included) == ("meeting", "pending", False)
        assert source.title == "Reunião de coordenação"
        assert source.occurred_at == datetime(2026, 10, 1, 13, 0)
        assert source.duration_minutes == 98
        assert source.participants[0] == {"name": "Ana Souza", "email": "ana@example.com"}
        assert source.raw_content.startswith("0:05 - Ana Souza\n  Bom dia a todos.\n33:40 - Rami")
        assert source.recording_url == "https://fathom.video/share/abc"
        assert source.source_label == "Fathom"
        key = f"org/{project.owner_organization_id}/sources/{body['id']}/recording.mp4"
        assert fake_s3.objects[key] == b"mp4-bytes" * 10
        assert video["urls"] == [VIDEO_URL]
        assert db_session.query(Job).one().status == "succeeded"
        assert imp.download_id is None
        # the list was read with transcripts; download requested once, polled until completed
        assert requests_to(fake, "GET", "/meetings")[0].url.params["include_transcript"] == "true"
        assert len(requests_to(fake, "POST", f"/recordings/{REC}/download")) == 1
        assert len(requests_to(fake, "GET", f"/recordings/{REC}/downloads/dl-1")) == 2
        # nothing is extracted automatically: no process_source job
        assert db_session.query(Job).filter(Job.type == "process_source").count() == 0

        items = routes.fathom_meetings(cursor=None, db=db_session, user=user)["items"]
        mark = next(m for m in items if m["recording_id"] == REC)["imports"][0]
        assert (mark["state"], mark["source_status"], mark["source_id"]) == ("imported", "pending", body["id"])

    def test_the_meeting_shows_up_in_ingestion_as_pending(
        self, db_session, user, project, conn, fake, fake_s3, factory, video,
    ):
        import asyncio
        from types import SimpleNamespace

        from app.api.routes import ingestion

        happy_fathom(fake)
        start(db_session, user, project)
        run_job(db_session, factory)

        request = SimpleNamespace(state=SimpleNamespace(user=user))
        listed = asyncio.run(ingestion.list_sources(
            request=request, project_id=None, source_type=None, ingestion_status="pending",
            date_from=None, date_to=None, limit=50, offset=0, db=db_session,
        ))
        rows = listed["sources"]
        assert [(r["title"], r["source_label"]) for r in rows] == [("Reunião de coordenação", "Fathom")]

    def test_running_the_job_twice_does_not_duplicate(self, db_session, user, project, conn, fake, fake_s3, factory, video):
        happy_fathom(fake)
        body = start(db_session, user, project)
        run_job(db_session, factory)
        fathom_import.run_import(body["id"], session_factory=factory)
        assert db_session.query(Source).count() == 1
        assert len(requests_to(fake, "POST", f"/recordings/{REC}/download")) == 1

    def test_no_media_fails_at_once_and_can_be_retried_by_the_importer(
        self, db_session, user, project, conn, fake, fake_s3, factory, video,
    ):
        api(fake, "GET", "/meetings", page([MEETING]))
        api(fake, "POST", f"/recordings/{REC}/download", httpx.Response(422, json={"error": "no_media"}))
        body = start(db_session, user, project)

        run_job(db_session, factory)

        job = db_session.query(Job).one()
        assert (job.status, job.attempts) == ("failed", 1)
        assert "no media" in job.last_error
        items = routes.fathom_meetings(cursor=None, db=db_session, user=user)["items"]
        mark = items[0]["imports"][0]
        assert (mark["state"], mark["can_retry"]) == ("failed", True)
        assert "no media" in mark["error"]
        assert db_session.query(Source).count() == 0

        # Fathom has the media now: retry → new job → imported
        happy_fathom(fake)
        retried = routes.fathom_retry_import(import_id=body["id"], db=db_session, user=user)
        assert retried["state"] == "queued"
        run_job(db_session, factory)
        assert db_session.query(Source).count() == 1
        assert db_session.query(Job).filter(Job.status == "succeeded").count() == 1

    def test_retry_rules(self, db_session, org, user, project, conn, fake, fake_s3, factory, video):
        api(fake, "GET", "/meetings", page([MEETING]))
        api(fake, "POST", f"/recordings/{REC}/download", httpx.Response(422, json={"error": "no_media"}))
        body = start(db_session, user, project)

        admin2 = User(email="a2@soubim.com", password_hash="x", name="Admin 2", role="director")
        outsider = User(email="out@dimas.com", password_hash="x", name="Out", role="client")
        db_session.add_all([admin2, outsider])
        make_org_member(db_session, admin2, "admin", org)
        make_org_member(db_session, outsider, "admin", make_org(db_session, "DIMAS"))
        db_session.commit()

        with pytest.raises(HTTPException) as exc:  # not failed yet
            routes.fathom_retry_import(import_id=body["id"], db=db_session, user=user)
        assert exc.value.status_code == 409

        run_job(db_session, factory)
        for who, code in ((admin2, 403), (outsider, 404)):
            with pytest.raises(HTTPException) as exc:
                routes.fathom_retry_import(import_id=body["id"], db=db_session, user=who)
            assert exc.value.status_code == code
        with pytest.raises(HTTPException) as exc:
            routes.fathom_retry_import(import_id="not-a-uuid", db=db_session, user=user)
        assert exc.value.status_code == 404

    def test_download_failed_retries_with_a_new_download(self, db_session, user, project, conn, fake, fake_s3, factory, video):
        happy_fathom(fake, download_status=[httpx.Response(200, json={"download_id": "dl-1", "status": "failed"})])
        start(db_session, user, project)

        run_job(db_session, factory)

        job = db_session.query(Job).one()
        imp = db_session.query(FathomImport).one()
        assert job.status == "queued" and job.attempts == 1  # will retry with backoff
        assert "failed" in job.last_error
        assert imp.download_id is None  # next attempt asks Fathom for a new download
        assert routes.fathom_meetings(cursor=None, db=db_session, user=user)["items"][1]["imports"][0]["state"] == "queued"

        happy_fathom(fake)
        job.run_after = datetime.utcnow() - timedelta(seconds=1)
        db_session.commit()
        run_job(db_session, factory)
        assert db_session.query(Source).count() == 1
        assert len(requests_to(fake, "POST", f"/recordings/{REC}/download")) == 2

    def test_slow_download_keeps_its_id_for_the_next_attempt(
        self, db_session, user, project, conn, fake, fake_s3, factory, video, monkeypatch,
    ):
        monkeypatch.setattr(fathom_import, "POLL_BUDGET_SECONDS", 0)
        happy_fathom(fake, download_status=[httpx.Response(200, json={"download_id": "dl-1", "status": "processing"})])
        start(db_session, user, project)

        run_job(db_session, factory)

        job = db_session.query(Job).one()
        assert job.status == "queued" and "still preparing" in job.last_error
        assert db_session.query(FathomImport).one().download_id == "dl-1"

        monkeypatch.setattr(fathom_import, "POLL_BUDGET_SECONDS", 600)
        api(fake, "GET", f"/recordings/{REC}/downloads/dl-1",
            httpx.Response(200, json={"status": "completed", "video": {"url": VIDEO_URL}}))
        job.run_after = datetime.utcnow() - timedelta(seconds=1)
        db_session.commit()
        run_job(db_session, factory)

        assert db_session.query(Source).count() == 1
        assert len(requests_to(fake, "POST", f"/recordings/{REC}/download")) == 1  # reused dl-1

    def test_expired_video_link_requests_a_new_download(self, db_session, user, project, conn, fake, fake_s3, factory, video):
        happy_fathom(fake)
        video["responses"] = [(403, b"expired")]
        start(db_session, user, project)

        run_job(db_session, factory)

        job = db_session.query(Job).one()
        assert job.status == "queued" and "expired" in job.last_error
        assert db_session.query(FathomImport).one().download_id is None
        assert db_session.query(Source).count() == 0 and fake_s3.objects == {}

    def test_fathom_5xx_is_retried(self, db_session, user, project, conn, fake, fake_s3, factory, video):
        api(fake, "GET", "/meetings", httpx.Response(503, json={"error": "unavailable"}))
        start(db_session, user, project)
        run_job(db_session, factory)
        assert db_session.query(Job).one().status == "queued"

    def test_recording_not_in_the_importers_account_fails(self, db_session, user, project, conn, fake, fake_s3, factory, video):
        api(fake, "GET", "/meetings", page([OTHER_MEETING], next_cursor="c2"), page([OTHER_MEETING]))
        start(db_session, user, project)

        run_job(db_session, factory)

        job = db_session.query(Job).one()
        assert job.status == "failed" and "not found in your Fathom account" in job.last_error
        assert len(requests_to(fake, "GET", "/meetings")) == 2  # followed the cursor
        assert requests_to(fake, "POST", f"/recordings/{REC}/download") == []

    def test_revoked_grant_fails_and_asks_to_reconnect(self, db_session, user, project, fake, fake_s3, factory, video):
        make_connection(db_session, user, expires_in=timedelta(seconds=-1))
        fake.token_responses = [httpx.Response(400, json={"error": "invalid_grant"})]
        start(db_session, user, project)

        run_job(db_session, factory)

        job = db_session.query(Job).one()
        assert job.status == "failed" and "reconnect" in job.last_error
        assert db_session.query(FathomConnection).one().revoked_at is not None

    def test_disconnected_importer_fails(self, db_session, user, project, conn, fake, fake_s3, factory, video):
        start(db_session, user, project)
        db_session.delete(conn)
        db_session.commit()
        run_job(db_session, factory)
        assert "not connected" in db_session.query(Job).one().last_error

    def test_too_large_recording_fails_without_retry(
        self, db_session, user, project, conn, fake, fake_s3, factory, video, monkeypatch,
    ):
        from app.config import settings

        monkeypatch.setattr(settings, "recording_max_bytes", 10)
        happy_fathom(fake)
        start(db_session, user, project)
        run_job(db_session, factory)
        job = db_session.query(Job).one()
        assert job.status == "failed" and "too large" in job.last_error


# --------------------------------------------------------------------------- concurrent refresh


class TestConcurrentRefresh:
    def test_refresh_is_skipped_when_another_process_already_refreshed(self, db_session, user, fake):
        conn = make_connection(db_session, user, expires_in=timedelta(seconds=-1))
        stale = conn.access_token_enc
        # another process refreshed meanwhile (new token, valid for 24 h)
        conn.access_token_enc = encrypt_token("acc-from-worker")
        conn.expires_at = fathom.utcnow() + timedelta(hours=24)
        db_session.commit()

        client = fathom.FathomClient(db_session, conn)
        client.refresh(stale)

        assert fake.token_requests() == []
        assert decrypt_token(client.connection.access_token_enc) == "acc-from-worker"

    def test_401_after_another_process_refreshed_retries_with_the_new_token(self, db_session, user, fake):
        conn = make_connection(db_session, user)
        api(fake, "GET", "/meetings", httpx.Response(401), page([]))
        client = fathom.FathomClient(db_session, conn)
        original_refresh = client.refresh

        def refresh_after_other_process(used):
            db_session.query(FathomConnection).filter(FathomConnection.id == conn.id).update(
                {FathomConnection.access_token_enc: encrypt_token("acc-from-worker")}, synchronize_session=False)
            db_session.commit()
            original_refresh(used)

        client.refresh = refresh_after_other_process
        client.list_meetings()

        assert fake.token_requests() == []
        assert requests_to(fake, "GET", "/meetings")[-1].headers["authorization"] == "Bearer acc-from-worker"

    @pytest.mark.postgresql
    def test_api_and_worker_refreshing_at_once_use_the_refresh_token_once(self, pg_engine, monkeypatch, configured):
        """Two sessions (API + worker) find the token expired at the same time: the second waits
        for the first's row lock, sees the new token and does not refresh again."""
        Session_ = sessionmaker(bind=pg_engine)
        setup = Session_()
        u = User(email="race@soubim.com", password_hash="x", name="Race", role="director")
        setup.add(u)
        setup.commit()
        make_connection(setup, u, expires_in=timedelta(seconds=-1))
        user_id = u.id
        setup.close()

        entered, release = threading.Event(), threading.Event()
        token_calls = []

        def token_endpoint(request):
            token_calls.append(request)
            entered.set()
            release.wait(5)  # hold the row lock while "Fathom" answers
            return httpx.Response(200, json=REFRESHED)

        def make_client(db):
            c = db.query(FathomConnection).filter(FathomConnection.user_id == user_id).one()
            return fathom.FathomClient(db, c, httpx.Client(transport=httpx.MockTransport(token_endpoint)))

        api_db, worker_db = Session_(), Session_()
        results = {}
        try:
            api_client, worker_client = make_client(api_db), make_client(worker_db)
            t1 = threading.Thread(target=lambda: results.setdefault("api", api_client.access_token()))
            t1.start()
            assert entered.wait(5)
            t2 = threading.Thread(target=lambda: results.setdefault("worker", worker_client.access_token()))
            t2.start()
            time.sleep(0.3)  # the worker is now blocked on the row lock
            release.set()
            t1.join(5)
            t2.join(5)
        finally:
            api_db.close()
            worker_db.close()

        assert len(token_calls) == 1
        assert results == {"api": "acc-2", "worker": "acc-2"}
        check = Session_()
        try:
            assert check.query(FathomConnection).one().revoked_at is None
            check.query(FathomConnection).delete()
            check.query(User).filter(User.id == user_id).delete()
            check.commit()
        finally:
            check.close()
