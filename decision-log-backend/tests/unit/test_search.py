"""Promem revamp Phase 4d: global search (⌘K) — what it finds, and what it must never show."""

from datetime import datetime

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.database.models import Project, ProjectItem, Source, User
from app.services.search import normalize, terms_of
from app.utils.security import create_access_token, hash_password
from tests.org_helpers import default_org_id, make_org, make_org_member


@pytest.fixture
def client(pg_session):
    from app.main import app

    return TestClient(app)


def _user(db: Session, email: str, role: str = "admin", org=None):
    user = User(email=email, password_hash=hash_password("password"), name=email.split("@")[0].title(), role="director")
    db.add(user)
    make_org_member(db, user, role, org)
    db.commit()
    return user, {"Authorization": "Bearer " + create_access_token(str(user.id), user.email, user.role)}


def _project(db: Session, name: str, org_id, description: str = ""):
    project = Project(owner_organization_id=org_id, name=name, description=description)
    db.add(project)
    db.commit()
    meeting = Source(project_id=project.id, owner_organization_id=org_id, source_type="meeting", title=f"Revisão da fundação — {name}",
                     occurred_at=datetime(2026, 2, 6, 10), ingestion_status="processed", visibility="internal")
    db.add(meeting)
    db.commit()
    return project, meeting


def _item(db: Session, project, source, statement: str, **over):
    item = ProjectItem(project_id=project.id, source_id=source.id, owner_organization_id=project.owner_organization_id, statement=statement,
                       who="Carlos", item_type=over.pop("item_type", "decision"), source_type="meeting", affected_disciplines=["structural"],
                       discipline="structural", why="Motivo.", consensus={}, **over)
    db.add(item)
    db.commit()
    return item


def test_normalize_and_terms():
    assert normalize("Fundação ÁGUA") == "fundacao agua"
    assert terms_of("  concreto   C50 ") == ["concreto", "c50"]


def test_finds_projects_items_and_meetings_ignoring_case_and_accents(client, pg_session: Session):
    _, headers = _user(pg_session, "gabriela@soubim.com")
    project, meeting = _project(pg_session, "Residential Tower Alpha", default_org_id(pg_session), "Torre de 50 pavimentos")
    _item(pg_session, project, meeting, "Concreto C50 nos pilares da fundação", title="Concreto C50", is_milestone=True)
    _item(pg_session, project, meeting, "Paleta da fachada")

    body = client.get("/api/search", params={"q": "FUNDACAO c50"}, headers=headers).json()
    assert [i["title"] for i in body["items"]] == ["Concreto C50"]
    assert body["items"][0]["project_name"] == "Residential Tower Alpha"
    assert body["items"][0]["is_milestone"] is True
    assert body["projects"] == []  # every word must match the same row

    body = client.get("/api/search", params={"q": "fundacao"}, headers=headers).json()
    assert [m["title"] for m in body["meetings"]] == ["Revisão da fundação — Residential Tower Alpha"]

    body = client.get("/api/search", params={"q": "torre alpha"}, headers=headers).json()
    assert [p["name"] for p in body["projects"]] == ["Residential Tower Alpha"]


def test_never_shows_what_the_user_cannot_see(client, pg_session: Session):
    _, headers = _user(pg_session, "gabriela@soubim.com")
    mine, my_meeting = _project(pg_session, "Torre Alpha", default_org_id(pg_session))
    _item(pg_session, mine, my_meeting, "Viga de transição aprovada")
    _item(pg_session, mine, my_meeting, "Viga de transição recusada", review_status="rejected")

    other_org = make_org(pg_session, "Outro Escritório")
    theirs, their_meeting = _project(pg_session, "Torre Beta", other_org.id)
    _item(pg_session, theirs, their_meeting, "Viga de transição do outro escritório")

    body = client.get("/api/search", params={"q": "viga transicao"}, headers=headers).json()
    assert [i["statement"] for i in body["items"]] == ["Viga de transição aprovada"]
    body = client.get("/api/search", params={"q": "torre"}, headers=headers).json()
    assert [p["name"] for p in body["projects"]] == ["Torre Alpha"]
    assert all(m["project_name"] == "Torre Alpha" for m in body["meetings"])


def test_members_only_see_projects_they_are_assigned_to(client, pg_session: Session):
    _, headers = _user(pg_session, "membro@soubim.com", role="member")
    _project(pg_session, "Torre Alpha", default_org_id(pg_session))
    body = client.get("/api/search", params={"q": "torre"}, headers=headers).json()
    assert body["projects"] == [] and body["meetings"] == []


def test_short_queries_and_wildcards(client, pg_session: Session):
    _, headers = _user(pg_session, "gabriela@soubim.com")
    project, meeting = _project(pg_session, "Torre Alpha", default_org_id(pg_session))
    _item(pg_session, project, meeting, "Reduzir 10% do custo")
    assert client.get("/api/search", params={"q": "t"}, headers=headers).json()["projects"] == []
    # "%" is matched literally, not as a wildcard
    assert [i["statement"] for i in client.get("/api/search", params={"q": "10%"}, headers=headers).json()["items"]] == ["Reduzir 10% do custo"]
    assert client.get("/api/search", params={"q": "%"}, headers=headers).json()["items"] == []


def test_limit_and_more_flags(client, pg_session: Session):
    _, headers = _user(pg_session, "gabriela@soubim.com")
    project, meeting = _project(pg_session, "Torre Alpha", default_org_id(pg_session))
    for n in range(4):
        _item(pg_session, project, meeting, f"Pilar {n} reforçado")
    body = client.get("/api/search", params={"q": "pilar", "limit": 3}, headers=headers).json()
    assert len(body["items"]) == 3 and body["more"]["items"] is True


def test_requires_login(client):
    assert client.get("/api/search", params={"q": "torre"}).status_code == 401
