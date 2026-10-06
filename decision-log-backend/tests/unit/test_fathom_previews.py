"""Tests for on-demand previews of Fathom meetings that are not imported yet (Story 13.15).

Fake Fathom (httpx.MockTransport), fake S3 and a fake ffmpeg: no network, no binary, no real Fathom call.
"""

import uuid
from datetime import datetime, timedelta
from pathlib import Path

import httpx
import pytest
from fastapi import HTTPException
from sqlalchemy.orm import Session, sessionmaker

from app import worker
from app.api.routes import fathom as routes
from app.config import settings
from app.database.models import FathomImport, FathomPreview, Job, Source, User
from app.services import fathom_import, fathom_previews, storage, thumbnails
from tests.org_helpers import make_org_member
from tests.unit.test_fathom import make_connection
from tests.unit.test_fathom_import import (  # noqa: F401 (fixtures + helpers)
    MEETING,
    REC,
    VIDEO_URL,
    api,
    configured,
    conn,
    fake,
    happy_fathom,
    org,
    page,
    project,
    requests_to,
    user,
)
from tests.unit.test_recording_storage import fake_s3  # noqa: F401 (fixture)

JPEG = b"\xff\xd8preview-jpeg\xff\xd9"


@pytest.fixture
def factory(db_session: Session, monkeypatch):
    f = sessionmaker(bind=db_session.get_bind())
    monkeypatch.setattr(fathom_previews, "SessionLocal", f)
    monkeypatch.setattr(fathom_import, "_sleep", lambda s: None)
    return f


@pytest.fixture
def fake_ffmpeg(monkeypatch):
    calls = []

    def render(video_url, out_path):
        calls.append(video_url)
        Path(out_path).write_bytes(JPEG)

    monkeypatch.setattr(thumbnails, "render_thumbnail", render)
    return calls


def download_ok(fake, rec=REC, dl="dl-1"):
    api(fake, "POST", f"/recordings/{rec}/download", httpx.Response(202, json={"download_id": dl, "status": "processing"}))
    api(fake, "GET", f"/recordings/{rec}/downloads/{dl}", httpx.Response(
        200, json={"download_id": dl, "status": "completed", "video": {"url": VIDEO_URL}}))


def ask(db, user, rec=REC):
    return routes.fathom_request_preview(recording_id=rec, db=db, user=user)


def run_job(db, factory):
    assert worker.run_once("w1", session_factory=factory) is True
    db.expire_all()


def previews(db):
    return db.query(FathomPreview).all()


@pytest.fixture
def other_user(db_session: Session, org) -> User:
    u = User(email="ana@soubim.com", password_hash="x", name="Ana", role="director")
    db_session.add(u)
    make_org_member(db_session, u, "admin", org)
    db_session.commit()
    return u


class TestRequest:
    def test_creates_a_queued_preview_and_a_job(self, db_session, user, conn, fake_s3):
        body = ask(db_session, user)
        assert body == {"status": "queued", "url": None}
        (preview,) = previews(db_session)
        assert (preview.user_id, preview.recording_id, preview.status) == (user.id, REC, "queued")
        (job,) = db_session.query(Job).filter(Job.type == "fathom_preview").all()
        assert job.payload == {"preview_id": str(preview.id)} and job.max_attempts == fathom_previews.MAX_ATTEMPTS
        assert job.source_id is None and preview.job_id == job.id

    def test_is_idempotent_while_in_progress(self, db_session, user, conn, fake_s3):
        ask(db_session, user)
        preview = previews(db_session)[0]
        preview.status = "processing"
        db_session.commit()
        assert ask(db_session, user)["status"] == "processing"
        assert db_session.query(Job).count() == 1 and db_session.query(FathomPreview).count() == 1

    def test_ready_preview_is_returned_with_its_url(self, db_session, user, conn, fake_s3):
        ask(db_session, user)
        preview = previews(db_session)[0]
        preview.status, preview.thumbnail_key = "ready", storage.fathom_preview_key(str(user.id), REC)
        db_session.commit()
        body = ask(db_session, user)
        assert body["status"] == "ready" and body["url"].startswith("https://storage.test/bucket/previews/user/")
        assert "X-Amz-Expires=21600" in body["url"]  # 6 h
        assert db_session.query(Job).count() == 1

    def test_failed_preview_is_requeued(self, db_session, user, conn, fake_s3):
        ask(db_session, user)
        preview = previews(db_session)[0]
        preview.status, preview.error = "failed", "boom"
        db_session.commit()
        body = ask(db_session, user)
        db_session.expire_all()
        assert body["status"] == "queued"
        preview = previews(db_session)[0]
        assert preview.status == "queued" and preview.error is None
        assert db_session.query(Job).count() == 2 and db_session.query(FathomPreview).count() == 1

    def test_per_user_cap_answers_429(self, db_session, user, other_user, conn, fake_s3):
        for rec in ("r1", "r2", "r3"):
            ask(db_session, user, rec)
        with pytest.raises(HTTPException) as exc:
            ask(db_session, user, "r4")
        assert exc.value.status_code == 429 and "3" in exc.value.detail
        assert db_session.query(FathomPreview).count() == 3
        # an existing one in progress is still answered (idempotent), not refused
        assert ask(db_session, user, "r1")["status"] == "queued"
        # the cap is per user
        make_connection(db_session, other_user)
        assert ask(db_session, other_user, "r4")["status"] == "queued"

    def test_cap_frees_up_when_one_finishes_or_fails(self, db_session, user, conn, fake_s3):
        for rec in ("r1", "r2", "r3"):
            ask(db_session, user, rec)
        first = fathom_previews.get_preview(db_session, user.id, "r1")
        first.status = "failed"
        db_session.commit()
        assert ask(db_session, user, "r4")["status"] == "queued"

    def test_invalid_recording_id_is_a_400(self, db_session, user, conn, fake_s3):
        for bad in ("../x", "a/b", "a b", "x" * 200, "id?x=1"):
            with pytest.raises(HTTPException) as exc:
                ask(db_session, user, bad)
            assert exc.value.status_code == 400
        assert db_session.query(FathomPreview).count() == 0

    def test_storage_disabled_answers_503(self, db_session, user, conn, monkeypatch):
        monkeypatch.setattr(settings, "s3_bucket", None)
        with pytest.raises(HTTPException) as exc:
            ask(db_session, user)
        assert exc.value.status_code == 503
        assert db_session.query(FathomPreview).count() == 0

    def test_not_connected_and_needs_reconnect_answer_409(self, db_session, user, fake, fake_s3):
        with pytest.raises(HTTPException) as exc:
            ask(db_session, user)
        assert (exc.value.status_code, exc.value.detail) == (409, "not_connected")
        c = make_connection(db_session, user)
        c.revoked_at = datetime.utcnow()
        db_session.commit()
        with pytest.raises(HTTPException) as exc:
            ask(db_session, user)
        assert (exc.value.status_code, exc.value.detail) == (409, "needs_reconnect")


class TestJob:
    def test_stores_only_the_jpeg_under_the_users_prefix(self, db_session, user, conn, fake, fake_s3, factory, fake_ffmpeg):
        download_ok(fake)
        ask(db_session, user)
        run_job(db_session, factory)

        key = f"previews/user/{user.id}/fathom/{REC}.jpg"
        preview = previews(db_session)[0]
        assert (preview.status, preview.thumbnail_key, preview.download_id) == ("ready", key, "dl-1")
        assert fake_s3.objects == {key: JPEG}  # the video is never stored
        assert fake_s3.content_types[key] == "image/jpeg"
        assert fake_ffmpeg == [VIDEO_URL]  # ffmpeg read the signed Fathom URL
        assert db_session.query(Job).one().status == "succeeded"
        assert db_session.query(Source).count() == 0 and db_session.query(FathomImport).count() == 0
        assert requests_to(fake, "POST", f"/recordings/{REC}/download")[0].headers["authorization"] == "Bearer acc-1"

    def test_reuses_a_stored_download_id(self, db_session, user, conn, fake, fake_s3, factory, fake_ffmpeg):
        download_ok(fake)
        ask(db_session, user)
        previews(db_session)[0].download_id = "dl-1"
        db_session.commit()
        run_job(db_session, factory)
        assert requests_to(fake, "POST", f"/recordings/{REC}/download") == []
        assert previews(db_session)[0].status == "ready"

    def test_poll_timeout_is_retryable_and_keeps_the_download(
        self, db_session, user, conn, fake, fake_s3, factory, fake_ffmpeg, monkeypatch,
    ):
        monkeypatch.setattr(fathom_import, "POLL_BUDGET_SECONDS", 0)
        api(fake, "POST", f"/recordings/{REC}/download", httpx.Response(202, json={"download_id": "dl-1"}))
        api(fake, "GET", f"/recordings/{REC}/downloads/dl-1", httpx.Response(200, json={"status": "processing"}))
        ask(db_session, user)

        run_job(db_session, factory)

        job, preview = db_session.query(Job).one(), previews(db_session)[0]
        assert job.status == "queued" and "still preparing" in job.last_error  # the queue will retry
        assert preview.status == "queued" and preview.download_id == "dl-1"  # still counts as in progress
        assert fake_s3.objects == {} and fake_ffmpeg == []

        # the retry finds it completed and finishes
        monkeypatch.setattr(fathom_import, "POLL_BUDGET_SECONDS", 600)
        api(fake, "GET", f"/recordings/{REC}/downloads/dl-1", httpx.Response(200, json={"status": "completed", "video": {"url": VIDEO_URL}}))
        job.run_after = datetime.utcnow() - timedelta(seconds=1)
        db_session.commit()
        run_job(db_session, factory)
        assert previews(db_session)[0].status == "ready"

    def test_gives_up_after_the_last_attempt(self, db_session, user, conn, fake, fake_s3, factory, fake_ffmpeg):
        api(fake, "POST", f"/recordings/{REC}/download", httpx.Response(503, json={"error": "unavailable"}))
        ask(db_session, user)
        for _ in range(fathom_previews.MAX_ATTEMPTS):
            job = db_session.query(Job).one()
            job.run_after = datetime.utcnow() - timedelta(seconds=1)
            db_session.commit()
            run_job(db_session, factory)
        job, preview = db_session.query(Job).one(), previews(db_session)[0]
        assert job.status == "failed" and preview.status == "failed" and "503" in preview.error

    @pytest.mark.parametrize("status_code", [404, 422, 403])
    def test_fathom_refusal_fails_at_once(self, db_session, user, conn, fake, fake_s3, factory, fake_ffmpeg, status_code):
        api(fake, "POST", f"/recordings/{REC}/download", httpx.Response(status_code, json={"error": "nope"}))
        ask(db_session, user)
        run_job(db_session, factory)
        assert db_session.query(Job).one().status == "failed"
        assert previews(db_session)[0].status == "failed" and previews(db_session)[0].error
        assert fake_s3.objects == {}

    def test_ffmpeg_failure_retries_with_a_new_download(self, db_session, user, conn, fake, fake_s3, factory, monkeypatch):
        def broken(video_url, out_path):
            raise thumbnails.ThumbnailError("ffmpeg produced no frame")

        monkeypatch.setattr(thumbnails, "render_thumbnail", broken)
        download_ok(fake)
        ask(db_session, user)
        run_job(db_session, factory)
        preview = previews(db_session)[0]
        assert preview.status == "queued" and preview.download_id is None
        assert db_session.query(Job).one().status == "queued" and fake_s3.objects == {}

    def test_disconnected_user_fails_without_touching_sources(self, db_session, user, conn, fake, fake_s3, factory):
        ask(db_session, user)
        db_session.delete(conn)
        db_session.commit()
        run_job(db_session, factory)
        assert previews(db_session)[0].status == "failed"
        assert db_session.query(Source).count() == 0

    def test_running_twice_does_not_render_twice(self, db_session, user, conn, fake, fake_s3, factory, fake_ffmpeg):
        download_ok(fake)
        ask(db_session, user)
        run_job(db_session, factory)
        fathom_previews.run(str(previews(db_session)[0].id), session_factory=factory)
        assert len(fake_ffmpeg) == 1


class TestServing:
    def test_list_has_the_preview_only_for_its_owner(self, db_session, user, other_user, conn, fake, fake_s3, factory, fake_ffmpeg):
        download_ok(fake)
        ask(db_session, user)
        run_job(db_session, factory)
        make_connection(db_session, other_user)
        api(fake, "GET", "/meetings", page([MEETING]))

        mine = routes.fathom_meetings(cursor=None, db=db_session, user=user)["items"][0]
        theirs = routes.fathom_meetings(cursor=None, db=db_session, user=other_user)["items"][0]

        assert mine["preview"]["status"] == "ready"
        assert mine["preview"]["url"].startswith(f"https://storage.test/bucket/previews/user/{user.id}/fathom/{REC}.jpg")
        assert theirs["preview"] is None  # same recording id, another user's account: never exposed

    def test_a_meeting_without_preview_has_none(self, db_session, user, conn, fake, fake_s3):
        api(fake, "GET", "/meetings", page([MEETING]))
        assert routes.fathom_meetings(cursor=None, db=db_session, user=user)["items"][0]["preview"] is None

    def test_status_endpoint_returns_only_own_previews(self, db_session, user, other_user, conn, fake_s3):
        ask(db_session, user)
        make_connection(db_session, other_user)
        ask(db_session, other_user, "999")
        body = routes.fathom_preview_status(recording_ids=f"{REC},999", db=db_session, user=user)
        assert body == {REC: {"status": "queued", "url": None}}

    def test_status_endpoint_validates_ids(self, db_session, user):
        for bad in ("a/b", "..", ",".join(str(i) for i in range(51))):
            with pytest.raises(HTTPException) as exc:
                routes.fathom_preview_status(recording_ids=bad, db=db_session, user=user)
            assert exc.value.status_code == 400

    def test_no_url_without_storage(self, db_session, user, conn, fake_s3, monkeypatch):
        ask(db_session, user)
        preview = previews(db_session)[0]
        preview.status, preview.thumbnail_key = "ready", "previews/x.jpg"
        db_session.commit()
        monkeypatch.setattr(settings, "s3_bucket", None)
        assert fathom_previews.format_preview(preview) == {"status": "ready", "url": None}


class TestImportReuse:
    def test_import_reuses_a_recent_preview_download(self, db_session, user, project, conn, fake, fake_s3, factory, fake_ffmpeg):
        download_ok(fake)
        ask(db_session, user)
        run_job(db_session, factory)
        body = routes.fathom_start_import(
            body=routes.ImportRequest(recording_id=REC, project_id=str(project.id)), db=db_session, user=user,
        )
        assert db_session.get(FathomImport, uuid.UUID(body["id"])).download_id == "dl-1"

    def test_old_download_is_not_reused(self, db_session, user, project, conn, fake, fake_s3, factory, fake_ffmpeg):
        download_ok(fake)
        ask(db_session, user)
        run_job(db_session, factory)
        preview = previews(db_session)[0]
        preview.updated_at = datetime.utcnow() - timedelta(hours=21)
        db_session.commit()
        body = routes.fathom_start_import(
            body=routes.ImportRequest(recording_id=REC, project_id=str(project.id)), db=db_session, user=user,
        )
        assert db_session.get(FathomImport, uuid.UUID(body["id"])).download_id is None
