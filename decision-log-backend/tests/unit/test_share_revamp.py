"""Promem revamp Phase 3f: firm branding (G7), public payload (G7b), link expiry incl. never (G8)."""

import base64
from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.database.models import Organization, Project, ProjectItem, SharedLink, Source, User
from app.utils.security import create_access_token, hash_password
from tests.org_helpers import default_org_id, make_org_member

PNG = "data:image/png;base64," + base64.b64encode(b"\x89PNG\r\n\x1a\n" + b"0" * 64).decode()


@pytest.fixture
def client(pg_session):
    from app.main import app

    return TestClient(app)


def _setup(db: Session, role="admin"):
    user = User(email=f"{role}@soubim.com", password_hash=hash_password("password"), name="Gabriela", role="director")
    db.add(user)
    make_org_member(db, user, role)
    project = Project(owner_organization_id=default_org_id(db), name="Residential Tower Alpha", description="Torre")
    db.add(project)
    db.commit()
    source = Source(project_id=project.id, owner_organization_id=project.owner_organization_id, source_type="meeting", title="Revisão",
                    occurred_at=datetime(2026, 2, 6, 10), ingestion_status="processed", visibility="shared")
    db.add(source)
    db.commit()
    db.add(ProjectItem(project_id=project.id, source_id=source.id, owner_organization_id=project.owner_organization_id, statement="Concreto C50 nos pilares",
                       title="Concreto C50", who="Carlos", item_type="decision", source_type="meeting", affected_disciplines=["structural"],
                       discipline="structural", why="A carga de 50 pavimentos pede C50.", consensus={}, is_milestone=True))
    db.commit()
    return user, project, {"Authorization": "Bearer " + create_access_token(str(user.id), user.email, user.role)}


def test_branding_is_edited_by_admins_and_validated(client, pg_session: Session):
    user, _, headers = _setup(pg_session)
    org_id = default_org_id(pg_session)
    saved = client.put(f"/api/organizations/{org_id}/branding", headers=headers, json={"tagline": "Arquitetura e BIM", "contact_email": "contato@soubim.com", "logo": PNG})
    assert saved.status_code == 200
    assert saved.json() == {"name": "Test Org", "tagline": "Arquitetura e BIM", "contact_email": "contato@soubim.com", "logo": PNG}
    bad = client.put(f"/api/organizations/{org_id}/branding", headers=headers, json={"logo": "data:text/html;base64,PGI+"})
    assert bad.status_code == 400 and bad.json()["detail"] == "logo_type"
    big = "data:image/png;base64," + base64.b64encode(b"0" * (301 * 1024)).decode()
    assert client.put(f"/api/organizations/{org_id}/branding", headers=headers, json={"logo": big}).json()["detail"] == "logo_size"


def test_members_cannot_edit_branding(client, pg_session: Session):
    _, _, headers = _setup(pg_session, role="member")
    assert client.put(f"/api/organizations/{default_org_id(pg_session)}/branding", headers=headers, json={"tagline": "x"}).status_code == 403


def test_never_expiring_link_and_public_payload(client, pg_session: Session):
    _, project, headers = _setup(pg_session)
    org = pg_session.get(Organization, default_org_id(pg_session))
    org.tagline, org.contact_email = "Arquitetura e BIM", "contato@soubim.com"
    pg_session.commit()
    created = client.post(f"/api/projects/{project.id}/milestones/share", headers=headers, json={"expires_in_days": None}).json()
    assert created["expires_at"] is None
    [listed] = client.get(f"/api/projects/{project.id}/milestones/share", headers=headers).json()["links"]
    assert listed["expires_at"] is None

    body = client.get(f"/api/shared/milestones/{created['share_token']}").json()
    assert body["organization"]["name"] == "Test Org"
    assert body["organization"]["tagline"] == "Arquitetura e BIM"
    assert body["shared_by"] == "Gabriela"
    assert body["link"]["expires_at"] is None
    [milestone] = body["milestones"]
    assert milestone["title"] == "Concreto C50"
    assert milestone["item_type"] == "decision"
    assert milestone["why"] == "A carga de 50 pavimentos pede C50."
    assert milestone["date"].startswith("2026-02-06")


def test_change_expiry(client, pg_session: Session):
    _, project, headers = _setup(pg_session)
    token = client.post(f"/api/projects/{project.id}/milestones/share", headers=headers, json={}).json()["share_token"]
    never = client.patch(f"/api/projects/{project.id}/milestones/share/{token}", headers=headers, json={"expires_in_days": None})
    assert never.status_code == 200 and never.json()["expires_at"] is None
    ninety = client.patch(f"/api/projects/{project.id}/milestones/share/{token}", headers=headers, json={"expires_in_days": 90}).json()
    assert ninety["expires_at"].startswith((datetime.utcnow() + timedelta(days=90)).date().isoformat())


def test_expired_link_says_whose_it_was(client, pg_session: Session):
    user, project, _ = _setup(pg_session)
    pg_session.add(SharedLink(project_id=project.id, share_token="old", created_by=user.id, expires_at=datetime.utcnow() - timedelta(days=1)))
    pg_session.add(SharedLink(project_id=project.id, share_token="gone", created_by=user.id, expires_at=None, revoked_at=datetime.utcnow()))
    pg_session.commit()
    expired = client.get("/api/shared/milestones/old")
    assert expired.status_code == 410
    detail = expired.json()["detail"]
    assert detail["code"] == "expired" and detail["project"] == "Residential Tower Alpha" and detail["organization"]["name"] == "Test Org"
    assert client.get("/api/shared/milestones/gone").status_code == 404
    assert client.get("/api/shared/milestones/nope").status_code == 404
