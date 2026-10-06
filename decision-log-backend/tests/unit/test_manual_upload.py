"""Tests for manual upload of recordings and transcripts (Story 13.5). Fake in-memory storage."""

from datetime import datetime

import pytest
from fastapi import HTTPException
from pydantic import ValidationError
from sqlalchemy.orm import Session

from app.api.routes import uploads as routes
from app.config import settings
from app.database.models import Project, Source, User
from app.services import manual_upload, storage
from tests.org_helpers import assign_to_project, make_org, make_org_member
from tests.unit.test_recording_storage import FakeS3, fake_s3  # noqa: F401 (fixture)

NOW = "2026-10-01T13:00:00Z"
TRANSCRIPT = "0:05 - Ana\n  Bom dia.\n"


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


def presign(db, user, project, filename="reuniao.mp4", size=1000):
    return routes.presign_upload(
        routes.PresignRequest(project_id=str(project.id), filename=filename, size=size), db=db, user=user
    )


def complete(db, user, project, **kw):
    body = {"project_id": str(project.id), "title": "Reunião", "occurred_at": NOW, **kw}
    return routes.complete_upload(routes.CompleteRequest(**body), db=db, user=user)


def code(exc_info):
    return exc_info.value.status_code


class TestPresign:
    def test_returns_signed_put_for_the_org_key(self, db_session, user, project, fake_s3):
        body = presign(db_session, user, project)
        assert body["method"] == "PUT" and body["headers"] == {"Content-Type": "video/mp4"}
        assert body["video_extension"] == ".mp4"
        key = f"org/{project.owner_organization_id}/sources/{body['source_id']}/recording.mp4"
        assert key in body["upload_url"] and "storage.test" in body["upload_url"]

    @pytest.mark.parametrize("name,ctype", [("a.MOV", "video/quicktime"), ("a.webm", "video/webm"), ("a.m4v", "video/x-m4v")])
    def test_other_video_types(self, db_session, user, project, fake_s3, name, ctype):
        assert presign(db_session, user, project, name)["headers"]["Content-Type"] == ctype

    @pytest.mark.parametrize("name", ["notes.txt", "movie.avi", "noext", "x.mp4.exe"])
    def test_rejects_other_extensions(self, db_session, user, project, fake_s3, name):
        with pytest.raises(HTTPException) as exc:
            presign(db_session, user, project, name)
        assert code(exc) == 415

    def test_rejects_too_large_and_empty(self, db_session, user, project, fake_s3, monkeypatch):
        monkeypatch.setattr(settings, "recording_max_bytes", 500)
        with pytest.raises(HTTPException) as exc:
            presign(db_session, user, project, size=501)
        assert code(exc) == 413
        with pytest.raises(HTTPException) as exc:
            presign(db_session, user, project, size=0)
        assert code(exc) == 422

    def test_storage_not_configured_is_503(self, db_session, user, project, monkeypatch):
        monkeypatch.setattr(settings, "s3_bucket", None)
        with pytest.raises(HTTPException) as exc:
            presign(db_session, user, project)
        assert code(exc) == 503

    def test_requires_write_access(self, db_session, org, user, project, fake_s3):
        member = User(email="m@soubim.com", password_hash="x", name="M", role="architect")
        db_session.add(member)
        make_org_member(db_session, member, "member", org)
        db_session.commit()
        with pytest.raises(HTTPException) as exc:  # member not assigned to the project
            presign(db_session, member, project)
        assert code(exc) == 403
        assign_to_project(db_session, member, project)
        db_session.commit()
        assert presign(db_session, member, project)["source_id"]

    def test_other_organization_project_is_denied(self, db_session, user, fake_s3):
        other_org = make_org(db_session, "Other", "other")
        foreign = Project(owner_organization_id=other_org.id, name="Foreign")
        db_session.add(foreign)
        db_session.commit()
        with pytest.raises(HTTPException) as exc:
            presign(db_session, user, foreign)
        assert code(exc) in (403, 404)
        with pytest.raises(HTTPException) as exc:
            complete(db_session, user, foreign, transcript=TRANSCRIPT)
        assert code(exc) in (403, 404)
        assert db_session.query(Source).count() == 0


class TestComplete:
    def test_video_and_transcript_create_a_pending_meeting(self, db_session, user, project, fake_s3):
        up = presign(db_session, user, project)
        key = f"org/{project.owner_organization_id}/sources/{up['source_id']}/recording.mp4"
        fake_s3.objects[key] = b"x" * 1000
        body = complete(db_session, user, project, source_id=up["source_id"], video_extension=".mp4",
                        transcript=TRANSCRIPT, participants=["Ana", " ", "Bruno"])
        src = db_session.query(Source).one()
        assert body["id"] == up["source_id"] == str(src.id)
        assert (src.source_type, src.ingestion_status, src.included, src.source_label) == ("meeting", "pending", False, "Upload")
        assert src.raw_content == TRANSCRIPT.strip() and src.participants == ["Ana", "Bruno"]
        assert src.occurred_at == datetime(2026, 10, 1, 13, 0)

    def test_missing_object_is_404_and_creates_nothing(self, db_session, user, project, fake_s3):
        up = presign(db_session, user, project)
        with pytest.raises(HTTPException) as exc:
            complete(db_session, user, project, source_id=up["source_id"], video_extension=".mp4")
        assert code(exc) == 404
        assert db_session.query(Source).count() == 0

    def test_oversized_or_empty_object_is_refused_and_deleted(self, db_session, user, project, fake_s3, monkeypatch):
        up = presign(db_session, user, project)
        key = f"org/{project.owner_organization_id}/sources/{up['source_id']}/recording.mp4"
        fake_s3.objects[key] = b"x" * 600
        monkeypatch.setattr(settings, "recording_max_bytes", 500)
        with pytest.raises(HTTPException) as exc:
            complete(db_session, user, project, source_id=up["source_id"], video_extension="mp4")
        assert code(exc) == 413 and key not in fake_s3.objects

    def test_object_of_another_project_org_is_not_found(self, db_session, user, project, fake_s3):
        other_org = make_org(db_session, "Other", "other2")
        other = Project(owner_organization_id=other_org.id, name="Other")
        db_session.add(other)
        db_session.commit()
        fake_s3.objects[f"org/{other_org.id}/sources/{'1' * 8}-1111-4111-8111-{'1' * 12}/recording.mp4"] = b"x"
        with pytest.raises(HTTPException) as exc:
            complete(db_session, user, project, source_id=f"{'1' * 8}-1111-4111-8111-{'1' * 12}", video_extension="mp4")
        assert code(exc) == 404

    def test_second_complete_is_409(self, db_session, user, project, fake_s3):
        up = presign(db_session, user, project)
        fake_s3.objects[f"org/{project.owner_organization_id}/sources/{up['source_id']}/recording.mp4"] = b"x"
        complete(db_session, user, project, source_id=up["source_id"], video_extension="mp4")
        with pytest.raises(HTTPException) as exc:
            complete(db_session, user, project, source_id=up["source_id"], video_extension="mp4")
        assert code(exc) == 409

    def test_video_without_transcript_is_allowed(self, db_session, user, project, fake_s3):
        up = presign(db_session, user, project)
        fake_s3.objects[f"org/{project.owner_organization_id}/sources/{up['source_id']}/recording.mp4"] = b"x"
        complete(db_session, user, project, source_id=up["source_id"], video_extension="mp4")
        assert db_session.query(Source).one().raw_content is None

    def test_transcript_only_needs_no_storage(self, db_session, user, project, monkeypatch):
        monkeypatch.setattr(settings, "s3_bucket", None)
        body = complete(db_session, user, project, transcript="Texto livre sem horários.")
        assert db_session.get(Source, __import__("uuid").UUID(body["id"])).raw_content == "Texto livre sem horários."

    def test_needs_a_video_or_a_transcript(self, db_session, user, project, fake_s3):
        for kw in ({}, {"transcript": "   "}):
            with pytest.raises(HTTPException) as exc:
                complete(db_session, user, project, **kw)
            assert code(exc) == 422

    def test_rejects_unknown_video_extension_and_bad_id(self, db_session, user, project, fake_s3):
        with pytest.raises(HTTPException) as exc:
            complete(db_session, user, project, source_id="not-a-uuid", video_extension="mp4")
        assert code(exc) == 422
        with pytest.raises(HTTPException) as exc:
            complete(db_session, user, project, source_id="2" * 8 + "-2222-4222-8222-" + "2" * 12, video_extension="exe")
        assert code(exc) == 415

    def test_oversized_transcript_is_413(self, db_session, user, project, monkeypatch):
        monkeypatch.setattr(manual_upload, "MAX_TRANSCRIPT_CHARS", 10)
        with pytest.raises(HTTPException) as exc:
            complete(db_session, user, project, transcript="x" * 11)
        assert code(exc) == 413

    def test_title_is_required(self):
        with pytest.raises(ValidationError):
            routes.CompleteRequest(project_id="p", title="", occurred_at=NOW)


def test_upload_projects_lists_writable_projects(db_session, user, project):
    assert [p["name"] for p in routes.upload_projects(db=db_session, user=user)] == ["D/SEASON"]


def test_presigned_put_signs_the_content_type(monkeypatch):
    calls = []

    class C:
        def generate_presigned_url(self, op, Params, ExpiresIn):
            calls.append((op, Params, ExpiresIn))
            return "u"

    monkeypatch.setattr(storage, "get_client", lambda: C())
    monkeypatch.setattr(settings, "s3_bucket", "b")
    storage.presigned_put("k", "video/mp4", 60)
    assert calls == [("put_object", {"Bucket": "b", "Key": "k", "ContentType": "video/mp4"}, 60)]
