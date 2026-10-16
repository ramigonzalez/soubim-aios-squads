"""Promem revamp Phase 3b: source details on items, manual item title and date."""

from datetime import datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.services.meeting_view import participant_names
from app.database.models import Project, ProjectItem, Source, User
from app.utils.security import create_access_token, hash_password
from tests.org_helpers import default_org_id, make_org_member


def test_participant_names_accepts_strings_and_dicts():
    assert participant_names(["Gabriela", " Carlos ", {"name": "Ana", "email": "ana@x.com"}, {"email": "lu@x.com"}, "Gabriela", None]) == [
        "Gabriela",
        "Carlos",
        "Ana",
        "lu@x.com",
    ]
    assert participant_names(None) == []


@pytest.fixture
def client(pg_session):
    from app.main import app

    return TestClient(app)


def _setup(db: Session):
    user = User(email="gabriela@x.com", password_hash=hash_password("password"), name="Gabriela", role="director")
    db.add(user)
    make_org_member(db, user, "admin")
    project = Project(owner_organization_id=default_org_id(db), name="Residential Tower Alpha")
    db.add(project)
    db.commit()
    headers = {"Authorization": "Bearer " + create_access_token(str(user.id), user.email, user.role)}
    return user, project, headers


def test_items_carry_source_duration_participants_and_tool(client, pg_session: Session):
    _, project, headers = _setup(pg_session)
    source = Source(
        project_id=project.id,
        owner_organization_id=project.owner_organization_id,
        source_type="meeting",
        title="Revisão do projeto estrutural",
        occurred_at=datetime(2026, 2, 6, 10),
        ingestion_status="processed",
        duration_minutes=45,
        participants=[{"name": "Gabriela", "email": "g@x.com"}, "Carlos"],
        source_label="Fathom",
        meeting_type="Design Review",
    )
    pg_session.add(source)
    pg_session.commit()
    pg_session.add(
        ProjectItem(
            project_id=project.id,
            source_id=source.id,
            owner_organization_id=project.owner_organization_id,
            statement="Concreto C50",
            who="Carlos",
            item_type="decision",
            source_type="meeting",
            affected_disciplines=["structural"],
            discipline="structural",
            why="carga",
            consensus={},
        )
    )
    pg_session.commit()
    [entry] = client.get(f"/api/projects/{project.id}/items", headers=headers).json()["items"]
    assert entry["source"]["duration_minutes"] == 45
    assert entry["source"]["participants"] == ["Gabriela", "Carlos"]
    assert entry["source"]["label"] == "Fathom"
    assert entry["source"]["meeting_type"] == "Design Review"
    assert entry["occurred_at"] is None


def test_manual_item_keeps_title_and_date(client, pg_session: Session):
    _, project, headers = _setup(pg_session)
    response = client.post(
        f"/api/projects/{project.id}/items",
        headers=headers,
        json={
            "statement": "Na visita à obra, o cliente pediu para manter o piso original do térreo.",
            "title": "Manter o piso original do térreo",
            "occurred_at": "2026-02-20T00:00:00",
            "item_type": "decision",
            "who": "Gabriela",
            "affected_disciplines": ["architecture", "client"],
        },
    )
    assert response.status_code == 201
    body = response.json()
    assert body["title"] == "Manter o piso original do térreo"
    assert body["occurred_at"].startswith("2026-02-20")
    assert body["source_type"] == "manual_input"
