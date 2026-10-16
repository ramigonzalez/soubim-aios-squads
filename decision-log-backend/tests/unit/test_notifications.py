"""Promem revamp Phase 4e: Notificações computed on read, read state, and visibility."""

from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.database.models import Project, ProjectItem, Source, User
from app.utils.security import create_access_token, hash_password
from tests.org_helpers import assign_to_project, default_org_id, make_org, make_org_member


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


def _project(db: Session, org_id, name="Torre Alpha"):
    project = Project(owner_organization_id=org_id, name=name)
    db.add(project)
    db.commit()
    return project


def _source(db: Session, project, status="processed", title="Revisão estrutural", created_by=None, created_at=None):
    source = Source(project_id=project.id, owner_organization_id=project.owner_organization_id, source_type="meeting", title=title,
                    occurred_at=datetime.utcnow(), ingestion_status=status, visibility="internal", created_by=created_by)
    if created_at:
        source.created_at = created_at
    db.add(source)
    db.commit()
    return source


def _item(db: Session, project, source, statement="Concreto C50", **over):
    item = ProjectItem(project_id=project.id, source_id=source.id if source else None, owner_organization_id=project.owner_organization_id,
                       statement=statement, who="Carlos", item_type="decision", source_type="meeting", affected_disciplines=["structural"],
                       discipline="structural", why="Motivo.", consensus={}, **over)
    db.add(item)
    db.commit()
    return item


def test_events_of_the_last_two_weeks(client, pg_session: Session):
    me, headers = _user(pg_session, "gabriela@soubim.com")
    other, _ = _user(pg_session, "carlos@soubim.com")
    project = _project(pg_session, default_org_id(pg_session))
    _source(pg_session, project, status="pending", title="Coordenação MEP")
    meeting = _source(pg_session, project)
    item = _item(pg_session, project, meeting)
    _item(pg_session, project, meeting, "Viga de transição")
    item.is_milestone, item.milestone_at, item.milestone_by = True, datetime.utcnow(), other.id
    pg_session.commit()
    # my own upload and anything older than 14 days don't notify
    _source(pg_session, project, status="pending", title="Meu upload", created_by=me.id)
    _source(pg_session, project, status="pending", title="Antiga", created_at=datetime.utcnow() - timedelta(days=20))

    body = client.get("/api/notifications", headers=headers).json()
    kinds = {n["kind"]: n for n in body["notifications"]}
    assert set(kinds) == {"pending_source", "extracted", "milestone"}
    assert kinds["pending_source"]["source"]["title"] == "Coordenação MEP"
    assert kinds["extracted"]["count"] == 2 and kinds["extracted"]["source"]["title"] == "Revisão estrutural"
    assert kinds["milestone"]["by"] == "Carlos" and kinds["milestone"]["item"]["title"] == "Concreto C50"
    assert body["unread"] == 3
    titles = [n.get("source", {}).get("title") for n in body["notifications"]]
    assert "Meu upload" not in titles and "Antiga" not in titles


def test_read_one_and_read_all(client, pg_session: Session):
    _, headers = _user(pg_session, "gabriela@soubim.com")
    project = _project(pg_session, default_org_id(pg_session))
    _source(pg_session, project, status="pending", title="A")
    _source(pg_session, project, status="pending", title="B")
    body = client.get("/api/notifications", headers=headers).json()
    assert body["unread"] == 2
    first = body["notifications"][0]["key"]
    body = client.post("/api/notifications/read", headers=headers, json={"keys": [first]}).json()
    assert body["unread"] == 1 and next(n for n in body["notifications"] if n["key"] == first)["read"] is True
    body = client.post("/api/notifications/read", headers=headers, json={"all": True}).json()
    assert body["unread"] == 0
    # something new after "all" is unread again
    _source(pg_session, project, status="pending", title="C")
    assert client.get("/api/notifications", headers=headers).json()["unread"] == 1


def test_marking_a_milestone_records_who_and_when(client, pg_session: Session):
    me, headers = _user(pg_session, "gabriela@soubim.com")
    project = _project(pg_session, default_org_id(pg_session))
    item = _item(pg_session, project, _source(pg_session, project))
    assert client.patch(f"/api/projects/{project.id}/items/{item.id}", headers=headers, json={"is_milestone": True}).status_code == 200
    pg_session.refresh(item)
    assert item.milestone_by == me.id and item.milestone_at is not None
    # my own marco doesn't notify me
    assert all(n["kind"] != "milestone" for n in client.get("/api/notifications", headers=headers).json()["notifications"])


def test_only_what_the_user_can_see_and_review(client, pg_session: Session):
    member, member_headers = _user(pg_session, "membro@soubim.com", role="member")
    _, admin_headers = _user(pg_session, "gabriela@soubim.com")
    project = _project(pg_session, default_org_id(pg_session))
    _source(pg_session, project, status="pending", title="Pendente")
    meeting = _source(pg_session, project)
    _item(pg_session, project, meeting)
    # not assigned: sees nothing of the project
    assert client.get("/api/notifications", headers=member_headers).json()["notifications"] == []
    # assigned as a plain member: sees the extracted items, but can't review → no pending row
    assign_to_project(pg_session, member, project, role="member")
    pg_session.commit()
    kinds = [n["kind"] for n in client.get("/api/notifications", headers=member_headers).json()["notifications"]]
    assert kinds == ["extracted"]
    # another organization's project never shows up
    other_org = make_org(pg_session, "Outro")
    theirs = _project(pg_session, other_org.id, "Torre Beta")
    _source(pg_session, theirs, status="pending", title="Deles")
    names = {n["project"]["name"] for n in client.get("/api/notifications", headers=admin_headers).json()["notifications"]}
    assert names == {"Torre Alpha"}


def test_requires_login(client):
    assert client.get("/api/notifications").status_code == 401
