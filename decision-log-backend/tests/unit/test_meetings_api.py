"""Tests for the meeting viewer endpoints and signed recording links (Story 7.13)."""

import asyncio
from datetime import datetime
from urllib.parse import parse_qs, urlparse

import pytest
from fastapi import HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.routes import meetings
from app.database.models import Project, Source, User
from app.services import recordings


@pytest.fixture(autouse=True)
def recordings_dir(tmp_path, monkeypatch):
    monkeypatch.setattr(recordings, "RECORDINGS_DIR", tmp_path)
    return tmp_path


@pytest.fixture
def director(db_session: Session) -> User:
    user = User(email="dir@soubim.com", password_hash="x", name="Gabriela", role="director")
    db_session.add(user)
    db_session.commit()
    return user


@pytest.fixture
def architect(db_session: Session) -> User:
    user = User(email="arch@soubim.com", password_hash="x", name="Outsider", role="architect")
    db_session.add(user)
    db_session.commit()
    return user


@pytest.fixture
def meeting(db_session: Session) -> Source:
    project = Project(name="D/SEASON")
    db_session.add(project)
    db_session.flush()
    source = Source(
        project_id=project.id, source_type="meeting", title="Quinzenal",
        occurred_at=datetime(2026, 9, 4), ingestion_status="processed", included=True,
        raw_content="0:01 - Debora\n  Oi", ai_summary="Resumo",
    )
    db_session.add(source)
    db_session.commit()
    return source


def run(coro):
    return asyncio.run(coro)


def signed_query(url: str) -> tuple[int, str]:
    q = parse_qs(urlparse(url).query)
    return int(q["expires"][0]), q["signature"][0]


class TestRecordingLinks:
    def test_valid_signature(self):
        expires, sig = signed_query(recordings.signed_recording_path("src-1", now=1000))
        assert expires == 1000 + recordings.LINK_TTL_SECONDS
        assert recordings.verify_signature("src-1", expires, sig, now=1000)

    def test_expired_link_rejected(self):
        expires, sig = signed_query(recordings.signed_recording_path("src-1", now=1000))
        assert not recordings.verify_signature("src-1", expires, sig, now=expires + 1)

    def test_signature_is_bound_to_source(self):
        expires, sig = signed_query(recordings.signed_recording_path("src-1", now=1000))
        assert not recordings.verify_signature("src-2", expires, sig, now=1000)

    def test_recording_file_lookup(self, recordings_dir):
        assert recordings.recording_file("src-1") is None
        (recordings_dir / "src-1.mp4").write_bytes(b"video")
        assert recordings.recording_file("src-1") == recordings_dir / "src-1.mp4"


class TestGetMeeting:
    def test_returns_transcript_summary_and_no_recording(self, db_session, director, meeting):
        data = run(meetings.get_meeting(meeting.id, db=db_session, user=director))
        assert data["title"] == "Quinzenal"
        assert data["transcript"].startswith("0:01 - Debora")
        assert data["summary"] == "Resumo"
        assert data["recording"] is None

    def test_stored_file_gets_signed_link(self, db_session, director, meeting, recordings_dir):
        (recordings_dir / f"{meeting.id}.mp4").write_bytes(b"video")
        data = run(meetings.get_meeting(meeting.id, db=db_session, user=director))
        assert data["recording"]["type"] == "file"
        assert data["recording"]["url"].startswith(f"/api/recordings/{meeting.id}?expires=")

    def test_external_link_when_no_file(self, db_session, director, meeting):
        meeting.recording_url = "https://fathom.video/share/abc"
        db_session.commit()
        data = run(meetings.get_meeting(meeting.id, db=db_session, user=director))
        assert data["recording"] == {"type": "external", "url": "https://fathom.video/share/abc"}

    def test_non_member_is_forbidden(self, db_session, architect, meeting):
        with pytest.raises(HTTPException) as exc:
            run(meetings.get_meeting(meeting.id, db=db_session, user=architect))
        assert exc.value.status_code == 403


class TestStreamRecording:
    def test_streams_file_with_valid_link(self, meeting, recordings_dir):
        (recordings_dir / f"{meeting.id}.mp4").write_bytes(b"video")
        expires, sig = signed_query(recordings.signed_recording_path(str(meeting.id)))
        response = run(meetings.stream_recording(meeting.id, expires=expires, signature=sig))
        assert isinstance(response, FileResponse)
        assert response.media_type == "video/mp4"

    def test_bad_signature_is_forbidden(self, meeting, recordings_dir):
        (recordings_dir / f"{meeting.id}.mp4").write_bytes(b"video")
        expires, _ = signed_query(recordings.signed_recording_path(str(meeting.id)))
        with pytest.raises(HTTPException) as exc:
            run(meetings.stream_recording(meeting.id, expires=expires, signature="0" * 64))
        assert exc.value.status_code == 403

    def test_missing_file_is_not_found(self, meeting):
        expires, sig = signed_query(recordings.signed_recording_path(str(meeting.id)))
        with pytest.raises(HTTPException) as exc:
            run(meetings.stream_recording(meeting.id, expires=expires, signature=sig))
        assert exc.value.status_code == 404
