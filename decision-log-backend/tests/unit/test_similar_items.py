"""Promem revamp G11: similar items with a reason."""

from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.database.models import Project, ProjectItem, Source, User
from app.services.similar_items import SAME_DISCIPLINE, SAME_SOURCE, SIMILAR_TOPIC, cosine, similar_items
from app.utils.security import create_access_token, hash_password
from tests.org_helpers import default_org_id, make_org_member

NOW = datetime(2026, 3, 3, 12, 0)


def _setup(db: Session):
    user = User(email="gabriela@x.com", password_hash=hash_password("password"), name="Gabriela", role="director")
    db.add(user)
    make_org_member(db, user, "admin")
    project = Project(owner_organization_id=default_org_id(db), name="Residential Tower Alpha")
    db.add(project)
    db.commit()
    source = Source(
        project_id=project.id,
        owner_organization_id=project.owner_organization_id,
        source_type="meeting",
        title="Revisão do projeto estrutural",
        occurred_at=NOW,
        ingestion_status="processed",
    )
    other_source = Source(
        project_id=project.id,
        owner_organization_id=project.owner_organization_id,
        source_type="email",
        title="E-mail do cliente",
        occurred_at=NOW,
        ingestion_status="processed",
    )
    db.add_all([source, other_source])
    db.commit()
    return user, project, source, other_source


def _item(db, project, source, statement, disciplines, embedding=None, days=0):
    item = ProjectItem(
        project_id=project.id,
        source_id=source.id if source else None,
        owner_organization_id=project.owner_organization_id,
        statement=statement,
        who="Carlos",
        item_type="decision",
        source_type=source.source_type if source else "manual_input",
        affected_disciplines=disciplines,
        discipline=disciplines[0],
        why="porque",
        consensus={},
        embedding=embedding,
        created_at=NOW - timedelta(days=days),
    )
    db.add(item)
    db.commit()
    return item


def _vec(*head):
    return list(head) + [0.0] * (384 - len(head))


def test_cosine():
    assert cosine([1, 0], [1, 0]) == pytest.approx(1.0)
    assert cosine([1, 0], [0, 1]) == pytest.approx(0.0)
    assert cosine(None, [1]) is None
    assert cosine([1, 2], [1]) is None


def test_reasons_and_order(db_session: Session):
    user, project, source, other_source = _setup(db_session)
    base = _item(db_session, project, source, "Concreto C50 nos pilares", ["structural"], _vec(1, 0, 0))
    same_source = _item(db_session, project, source, "Laje protendida no pódio", ["architecture"], _vec(0, 1, 0))
    same_disc = _item(db_session, project, other_source, "Revisar carga das fundações", ["structural"], _vec(0, 0, 1))
    topic = _item(db_session, project, other_source, "Resistência do concreto", ["civil"], _vec(0.9, 0.1, 0))
    _item(db_session, project, other_source, "Paleta de cores da fachada", ["architecture"], _vec(0, 0, 1))

    result = similar_items(db_session, user, base)
    reasons = {item.id: reason for item, reason, _ in result}
    assert reasons == {same_source.id: SAME_SOURCE, same_disc.id: SAME_DISCIPLINE, topic.id: SIMILAR_TOPIC}
    assert result[0][0].id == topic.id  # closest embedding first


def test_without_embeddings_uses_source_and_discipline(db_session: Session):
    user, project, source, other_source = _setup(db_session)
    base = _item(db_session, project, source, "Concreto C50 nos pilares", ["structural"])
    same_source = _item(db_session, project, source, "Laje protendida", ["architecture"])
    _item(db_session, project, other_source, "Fachada", ["architecture"])

    result = similar_items(db_session, user, base)
    assert [(i.id, r) for i, r, _ in result] == [(same_source.id, SAME_SOURCE)]


@pytest.fixture
def client(pg_session):
    from app.main import app

    return TestClient(app)


def test_endpoint(client, pg_session: Session):
    user, project, source, _ = _setup(pg_session)
    base = _item(pg_session, project, source, "Concreto C50", ["structural"])
    other = _item(pg_session, project, source, "Laje", ["structural"])
    headers = {"Authorization": "Bearer " + create_access_token(str(user.id), user.email, user.role)}
    response = client.get(f"/api/projects/{project.id}/items/{base.id}/similar", headers=headers)
    assert response.status_code == 200
    [entry] = response.json()["items"]
    assert entry["id"] == str(other.id)
    assert entry["reason"] == SAME_SOURCE
    assert entry["source"]["title"] == "Revisão do projeto estrutural"
    missing = client.get(f"/api/projects/{project.id}/items/00000000-0000-0000-0000-000000000000/similar", headers=headers)
    assert missing.status_code == 404
