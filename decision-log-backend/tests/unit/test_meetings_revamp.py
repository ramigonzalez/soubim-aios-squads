"""Promem revamp Phase 3c: meetings list (G3), participants and speaker corrections (G4)."""

from datetime import datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.database.models import Project, ProjectItem, ProjectParticipant, Source, TranscriptSpeakerCorrection, User
from app.services.meeting_view import apply_speaker_corrections
from app.utils.security import create_access_token, hash_password
from tests.org_helpers import assign_to_project, default_org_id, make_org_member

TRANSCRIPT = "Revisão\n0:05 - Gabriela\n  Vamos começar.\n1:02:03 - ⚠️ Lucia [vozes sobrepostas]\n  Concordo com o C50.\n2:10 - Carlos\n  Ok."


def test_apply_speaker_corrections():
    fixed = apply_speaker_corrections(TRANSCRIPT, {3723: "Gabriela"})
    assert "1:02:03 - Gabriela" in fixed
    assert "⚠️" not in fixed
    assert "0:05 - Gabriela" in fixed
    assert apply_speaker_corrections(TRANSCRIPT, {}) == TRANSCRIPT
    assert apply_speaker_corrections(None, {1: "x"}) is None


@pytest.fixture
def client(pg_session):
    from app.main import app

    return TestClient(app)


def _setup(db: Session, role: str = "admin"):
    user = User(email=f"{role}@x.com", password_hash=hash_password("password"), name="Gabriela", role="director")
    db.add(user)
    make_org_member(db, user, role)
    project = Project(owner_organization_id=default_org_id(db), name="Residential Tower Alpha")
    db.add(project)
    db.commit()
    meeting = Source(
        project_id=project.id,
        owner_organization_id=project.owner_organization_id,
        source_type="meeting",
        title="Revisão do projeto estrutural",
        occurred_at=datetime(2026, 2, 6, 10),
        ingestion_status="processed",
        duration_minutes=45,
        participants=[{"name": "Gabriela", "email": "g@x.com"}, "Lucia"],
        source_label="Fireflies",
        raw_content=TRANSCRIPT,
    )
    pending = Source(
        project_id=project.id,
        owner_organization_id=project.owner_organization_id,
        source_type="meeting",
        title="Ainda pendente",
        occurred_at=datetime(2026, 2, 7, 10),
        ingestion_status="pending",
    )
    db.add_all([meeting, pending])
    db.commit()
    for kind in ["decision", "decision", "action_item"]:
        db.add(
            ProjectItem(
                project_id=project.id,
                source_id=meeting.id,
                owner_organization_id=project.owner_organization_id,
                statement=f"{kind} item",
                who="Carlos",
                item_type=kind,
                source_type="meeting",
                affected_disciplines=["structural"],
                discipline="structural",
                why="x",
                consensus={},
            )
        )
    db.commit()
    headers = {"Authorization": "Bearer " + create_access_token(str(user.id), user.email, user.role)}
    return user, project, meeting, headers


def test_meetings_list(client, pg_session: Session):
    _, project, meeting, headers = _setup(pg_session)
    response = client.get(f"/api/projects/{project.id}/meetings", headers=headers)
    assert response.status_code == 200
    [entry] = response.json()["meetings"]
    assert entry["id"] == str(meeting.id)
    assert entry["duration_minutes"] == 45
    assert entry["label"] == "Fireflies"
    assert entry["participants"] == ["Gabriela", "Lucia"]
    assert entry["item_counts"] == {"decision": 2, "action_item": 1}
    assert entry["item_count"] == 3


def test_meeting_carries_participants_candidates_and_corrections(client, pg_session: Session):
    user, project, meeting, headers = _setup(pg_session)
    body = client.get(f"/api/sources/{meeting.id}/meeting", headers=headers).json()
    assert body["participants"] == ["Gabriela", "Lucia"]
    assert body["speaker_candidates"] == ["Gabriela", "Lucia"]
    assert body["can_correct_speakers"] is True
    assert "⚠️ Lucia" in body["transcript"]

    saved = client.put(f"/api/sources/{meeting.id}/speakers", headers=headers, json={"start": 3723, "speaker": "Gabriela"})
    assert saved.status_code == 200
    again = client.put(f"/api/sources/{meeting.id}/speakers", headers=headers, json={"start": 3723, "speaker": "Lucia"})
    assert again.json() == {"start": 3723, "speaker": "Lucia"}
    assert pg_session.query(TranscriptSpeakerCorrection).count() == 1

    body = client.get(f"/api/sources/{meeting.id}/meeting", headers=headers).json()
    assert "1:02:03 - Lucia" in body["transcript"]
    assert "⚠️" not in body["transcript"]
    pg_session.refresh(meeting)
    assert "⚠️ Lucia" in meeting.raw_content  # the stored transcript never changes


def test_candidates_fall_back_to_project_participants(client, pg_session: Session):
    _, project, meeting, headers = _setup(pg_session)
    meeting.participants = None
    pg_session.add(ProjectParticipant(project_id=project.id, name="Miguel", email="m@x.com", discipline="electrical"))
    pg_session.commit()
    body = client.get(f"/api/sources/{meeting.id}/meeting", headers=headers).json()
    assert body["speaker_candidates"] == ["Miguel"]
