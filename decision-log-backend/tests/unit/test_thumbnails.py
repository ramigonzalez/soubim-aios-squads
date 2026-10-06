"""Tests for meeting thumbnails (Story 13.12). Fake S3 and a fake ffmpeg: no binary, no network."""

import importlib.util
import json
from datetime import datetime
from pathlib import Path

import pytest
from fastapi import HTTPException
from sqlalchemy.orm import Session, sessionmaker

from app import worker
from app.api.routes import fathom as fathom_routes
from app.api.routes import ingestion, meetings
from app.config import settings
from app.database.models import Job, Project, Source, User
from app.services import fathom_import, jobs, storage, thumbnails
from app.services.fathom_import import meeting_platform
from tests.org_helpers import make_org, make_org_member
from tests.unit.test_fathom_import import (  # noqa: F401 (fixtures + helpers)
    REC,
    configured,
    conn,
    factory,
    fake,
    happy_fathom,
    org,
    project,
    run_job,
    start,
    user,
    video,
)
from tests.unit.test_manual_upload import complete, presign
from tests.unit.test_org_isolation import (  # noqa: F401 — fixtures
    _list_items,
    _list_sources,
    _share,
    recordings_dir,
    req,
    run,
    shared,
    status_of,
    world,
)
from tests.unit.test_recording_storage import FakeS3, fake_s3  # noqa: F401 (fixture)

JPEG = b"\xff\xd8fake-jpeg\xff\xd9"


@pytest.fixture
def fake_ffmpeg(monkeypatch):
    """Replaces the ffmpeg wrapper: writes a fake JPEG, records the video URLs it was given."""
    calls = []

    def render(video_url, out_path):
        calls.append(video_url)
        Path(out_path).write_bytes(JPEG)

    monkeypatch.setattr(thumbnails, "render_thumbnail", render)
    return calls


def thumbnail_jobs(db):
    return db.query(Job).filter(Job.type == thumbnails.JOB_TYPE).all()


def stored_source(db, org, fake_s3, **kw) -> Source:
    project = Project(owner_organization_id=org.id, name="P")
    db.add(project)
    db.flush()
    source = Source(project_id=project.id, source_type="meeting", title="M", occurred_at=datetime(2026, 9, 4),
                    ingestion_status="pending", owner_organization_id=org.id, **kw)
    db.add(source)
    db.commit()
    fake_s3.objects[storage.recording_key(str(org.id), str(source.id))] = b"video"
    return source


class TestEnqueue:
    def test_fathom_import_enqueues_a_thumbnail_job(self, db_session, user, project, conn, fake, fake_s3, factory, video):
        happy_fathom(fake)
        body = start(db_session, user, project)
        run_job(db_session, factory)  # the import job
        (job,) = thumbnail_jobs(db_session)
        assert job.payload == {"source_id": body["id"]} and job.status == "queued"
        assert job.max_attempts == thumbnails.MAX_ATTEMPTS
        assert job.source_id is None  # a failing thumbnail must never mark the meeting failed

    def test_manual_upload_with_video_enqueues_one(self, db_session, user, project, fake_s3):
        up = presign(db_session, user, project)
        fake_s3.objects[f"org/{project.owner_organization_id}/sources/{up['source_id']}/recording.mp4"] = b"x" * 10
        complete(db_session, user, project, source_id=up["source_id"], upload_token=up["upload_token"], video_extension=".mp4")
        (job,) = thumbnail_jobs(db_session)
        assert job.payload == {"source_id": up["source_id"]}

    def test_transcript_only_upload_enqueues_nothing(self, db_session, user, project, fake_s3):
        complete(db_session, user, project, transcript="Texto.")
        assert thumbnail_jobs(db_session) == []

    def test_enqueue_failure_does_not_fail_the_upload(self, db_session, user, project, fake_s3, monkeypatch):
        def boom(*a, **k):
            raise RuntimeError("queue down")

        monkeypatch.setattr(jobs, "enqueue", boom)
        up = presign(db_session, user, project)
        fake_s3.objects[f"org/{project.owner_organization_id}/sources/{up['source_id']}/recording.mp4"] = b"x"
        body = complete(db_session, user, project, source_id=up["source_id"], upload_token=up["upload_token"], video_extension=".mp4")
        assert db_session.get(Source, __import__("uuid").UUID(body["id"])) is not None

    def test_nothing_is_queued_without_storage(self, db_session, org, monkeypatch):
        monkeypatch.setattr(settings, "s3_bucket", None)
        source = Source(project_id=Project(owner_organization_id=org.id, name="x").id, source_type="meeting")
        assert thumbnails.enqueue(db_session, source) is False


class TestGenerate:
    def test_stores_the_thumbnail_and_the_key(self, db_session, org, fake_s3, fake_ffmpeg):
        source = stored_source(db_session, org, fake_s3)
        thumbnails.generate(db_session, source.id)
        key = f"org/{org.id}/sources/{source.id}/thumbnail.jpg"
        assert fake_s3.objects[key] == JPEG and fake_s3.content_types[key] == "image/jpeg"
        db_session.expire_all()
        assert db_session.get(Source, source.id).thumbnail_key == key
        # ffmpeg read the video from a short-lived presigned URL, not a download
        assert fake_ffmpeg[0].startswith("https://storage.test/bucket/") and f"X-Amz-Expires={thumbnails.SOURCE_URL_TTL}" in fake_ffmpeg[0]

    def test_second_run_is_a_noop(self, db_session, org, fake_s3, fake_ffmpeg):
        source = stored_source(db_session, org, fake_s3)
        thumbnails.generate(db_session, source.id)
        thumbnails.generate(db_session, source.id)
        assert len(fake_ffmpeg) == 1

    def test_worker_runs_the_job(self, db_session, org, fake_s3, fake_ffmpeg, monkeypatch):
        f = sessionmaker(bind=db_session.get_bind())
        monkeypatch.setattr(worker, "SessionLocal", f)
        source = stored_source(db_session, org, fake_s3)
        thumbnails.enqueue(db_session, source)
        assert worker.run_once("w1", session_factory=f) is True
        db_session.expire_all()
        assert db_session.get(Source, source.id).thumbnail_key
        assert thumbnail_jobs(db_session)[0].status == "succeeded"

    def test_failure_retries_then_gives_up_without_touching_the_source(self, db_session, org, fake_s3, monkeypatch):
        def broken(url, out):
            raise thumbnails.ThumbnailError("ffmpeg produced no frame")

        monkeypatch.setattr(thumbnails, "render_thumbnail", broken)
        f = sessionmaker(bind=db_session.get_bind())
        monkeypatch.setattr(worker, "SessionLocal", f)
        source = stored_source(db_session, org, fake_s3)
        thumbnails.enqueue(db_session, source)
        for _ in range(thumbnails.MAX_ATTEMPTS):
            job = thumbnail_jobs(db_session)[0]
            job.run_after = datetime(2000, 1, 1)  # skip the backoff
            db_session.commit()
            assert worker.run_once("w1", session_factory=f) is True
            db_session.expire_all()
        job = thumbnail_jobs(db_session)[0]
        assert job.status == "failed" and "no frame" in job.last_error
        source = db_session.get(Source, source.id)
        assert source.thumbnail_key is None
        assert (source.ingestion_status, source.extraction_error) == ("pending", None)  # not marked failed
        assert not [k for k in fake_s3.objects if k.endswith("thumbnail.jpg")]

    def test_missing_recording_fails_at_once(self, db_session, org, fake_s3, fake_ffmpeg):
        source = stored_source(db_session, org, fake_s3)
        fake_s3.objects.clear()
        with pytest.raises(jobs.PermanentJobError):
            thumbnails.generate(db_session, source.id)

    def test_seek_time_and_fallback(self, monkeypatch, tmp_path):
        """Real render_thumbnail logic with a fake ffmpeg: min(60 s, 10 %), then the first frame."""
        seeks = []

        def extract(url, out, seek):
            seeks.append(seek)
            if seek > 0 and url.endswith("short"):
                return False
            Path(out).write_bytes(JPEG)
            return True

        monkeypatch.setattr(thumbnails, "_extract_frame", extract)
        monkeypatch.setattr(thumbnails, "_probe_duration", lambda url: 3000.0 if url.endswith("long") else 20.0)
        thumbnails.render_thumbnail("https://x/long", str(tmp_path / "a.jpg"))
        assert seeks == [60.0]
        seeks.clear()
        thumbnails.render_thumbnail("https://x/short", str(tmp_path / "b.jpg"))
        assert seeks == [2.0, 0.0]
        monkeypatch.setattr(thumbnails, "_extract_frame", lambda *a: False)
        with pytest.raises(thumbnails.ThumbnailError):
            thumbnails.render_thumbnail("https://x/short", str(tmp_path / "c.jpg"))


class TestServing:
    def test_url_is_presigned_or_null(self, db_session, org, fake_s3, monkeypatch):
        source = stored_source(db_session, org, fake_s3)
        assert thumbnails.thumbnail_url(source) is None
        source.thumbnail_key = "org/o/sources/s/thumbnail.jpg"
        assert thumbnails.thumbnail_url(source) == "https://storage.test/bucket/org/o/sources/s/thumbnail.jpg?X-Amz-Expires=21600"
        monkeypatch.setattr(settings, "s3_bucket", None)
        assert thumbnails.thumbnail_url(source) is None  # storage disabled

    def test_allowed_user_gets_it_on_every_listing(self, db_session, world, fake_s3):
        a = world.a
        a.processed.thumbnail_key = f"org/{world.a.org.id}/sources/{a.processed.id}/thumbnail.jpg"
        db_session.commit()
        expected = f"https://storage.test/bucket/{a.processed.thumbnail_key}?X-Amz-Expires=21600"
        assert run(meetings.get_meeting(a.processed.id, db=db_session, user=world.a_admin))["thumbnail_url"] == expected
        items = run(_list_items(db_session, world.a_admin, a.project.id))["items"]
        assert {i["source"]["thumbnail_url"] for i in items if i["source"]["id"] == str(a.processed.id)} == {expected}
        listed = _list_sources(db_session, world.a_admin, None)["sources"]
        assert next(s for s in listed if s["id"] == str(a.processed.id))["thumbnail_url"] == expected
        # a meeting without a thumbnail: null
        assert run(meetings.get_meeting(a.pending.id, db=db_session, user=world.a_admin))["thumbnail_url"] is None

    def test_other_organizations_internal_meeting_is_404_and_leaks_no_url(self, db_session, world, fake_s3):
        a = world.a
        a.processed.thumbnail_key = f"org/{world.a.org.id}/sources/{a.processed.id}/thumbnail.jpg"
        db_session.commit()
        assert status_of(meetings.get_meeting(a.processed.id, db=db_session, user=world.b_admin)) == 404
        for listing in (_list_sources(db_session, world.b_admin, None)["sources"],):
            assert str(a.processed.id) not in json.dumps(listing)
        assert "thumbnail.jpg" not in json.dumps(_list_sources(db_session, world.b_admin, None), default=str)

    def test_shared_project_internal_meeting_stays_hidden_until_shared(self, db_session, shared, fake_s3):
        w = shared.world
        a = w.a
        a.processed.thumbnail_key = f"org/{a.org.id}/sources/{a.processed.id}/thumbnail.jpg"
        db_session.commit()
        _share(db_session, w.a_admin, a.project.id, "dimas", "viewer")
        assert status_of(meetings.get_meeting(a.processed.id, db=db_session, user=w.b_admin)) == 404
        a.processed.visibility = "shared"
        db_session.commit()
        assert run(meetings.get_meeting(a.processed.id, db=db_session, user=w.b_admin))["thumbnail_url"]

    def test_fathom_browse_list_has_the_thumbnail_of_visible_imports(
        self, db_session, user, project, conn, fake, fake_s3, factory, video, fake_ffmpeg, monkeypatch,
    ):
        happy_fathom(fake)
        start(db_session, user, project)
        run_job(db_session, factory)  # import
        monkeypatch.setattr(worker, "SessionLocal", factory)
        run_job(db_session, factory)  # thumbnail
        happy_fathom(fake)
        items = fathom_routes.fathom_meetings(cursor=None, db=db_session, user=user)["items"]
        imp = next(m for m in items if m["recording_id"] == REC)["imports"][0]
        assert imp["thumbnail_url"].startswith("https://storage.test/bucket/") and imp["thumbnail_url"].count("thumbnail.jpg") == 1


class TestPlatform:
    @pytest.mark.parametrize("url,platform", [
        ("https://meet.google.com/abc-defg-hij", "meet"),
        ("https://us02web.zoom.us/j/123", "zoom"),
        ("https://teams.microsoft.com/l/meetup-join/x", "teams"),
        ("https://example.com/room", None),
        ("https://evilzoom.us/j/1", None),
        (None, None),
        ("not a url", None),
    ])
    def test_meeting_platform(self, url, platform):
        assert meeting_platform(url) == platform

    def test_summary_includes_platform(self):
        summary = fathom_import.meeting_summary({"recording_id": 1, "meeting_url": "https://meet.google.com/x"})
        assert summary["platform"] == "meet"


def load_backfill():
    path = Path(__file__).resolve().parents[2] / "scripts" / "generate_thumbnails.py"
    spec = importlib.util.spec_from_file_location("generate_thumbnails", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class TestBackfill:
    def test_dry_run_changes_nothing(self, db_session, org, fake_s3):
        with_video = stored_source(db_session, org, fake_s3)
        no_video = stored_source(db_session, org, fake_s3)
        fake_s3.objects.pop(storage.recording_key(str(org.id), str(no_video.id)))
        done = stored_source(db_session, org, fake_s3, thumbnail_key="k")
        lines = []
        counts = load_backfill().backfill(db_session, dry_run=True, out=lines.append)
        assert counts == {"queued": 1, "generated": 0, "skipped": 1, "failed": 0}
        assert lines == [f"would queue {with_video.id} (M)"]
        assert thumbnail_jobs(db_session) == [] and done.thumbnail_key == "k"

    def test_enqueues_once_and_inline_generates(self, db_session, org, fake_s3, fake_ffmpeg):
        source = stored_source(db_session, org, fake_s3)
        script = load_backfill()
        assert script.backfill(db_session, out=lambda s: None)["queued"] == 1
        again = script.backfill(db_session, out=lambda s: None)  # already queued: not duplicated
        assert again["queued"] == 0 and again["skipped"] == 1 and len(thumbnail_jobs(db_session)) == 1
        counts = script.backfill(db_session, inline=True, out=lambda s: None)
        assert counts["generated"] == 0 and counts["skipped"] == 1  # still queued, so skipped
        for job in thumbnail_jobs(db_session):
            job.status = "succeeded"
        db_session.commit()
        assert script.backfill(db_session, inline=True, out=lambda s: None)["generated"] == 1
        db_session.expire_all()
        assert db_session.get(Source, source.id).thumbnail_key
