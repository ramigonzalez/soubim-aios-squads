"""Timestamps behave the same whether a column is `timestamp` or `timestamptz`.

Databases built by create_all (dev, tests) have `timestamp without time zone` columns; a database
built only by Alembic (production) has some `timestamp with time zone` columns from migration 001.
Aware values from those columns used to break comparisons with naive `datetime.utcnow()`
(project detail and /api/notifications returned 500).
"""

from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database.models import Project, ProjectItem, Source, User, UTCDateTime
from app.utils.security import create_access_token, hash_password
from tests.org_helpers import default_org_id, make_org_member

# Columns migration 001 creates WITH time zone that still exist (decisions → project_items)
TZ_COLUMNS = {
    "users": ["created_at", "last_login_at", "deleted_at"],
    "projects": ["created_at", "archived_at"],
    "project_items": ["created_at", "updated_at"],
}


def test_aware_values_become_naive_utc():
    t = UTCDateTime()
    aware = datetime(2026, 10, 16, 12, 0, tzinfo=timezone(timedelta(hours=-3)))
    assert t.process_result_value(aware, None) == datetime(2026, 10, 16, 15, 0)
    assert t.process_bind_param(aware, None) == datetime(2026, 10, 16, 15, 0)
    naive = datetime(2026, 10, 16, 12, 0)
    assert t.process_result_value(naive, None) is naive
    assert t.process_result_value(None, None) is None


@pytest.fixture
def migrated_schema(pg_session: Session):
    """Turn the create_all columns into the timestamptz columns of an Alembic-built database."""
    def alter(kind: str):
        for table, cols in TZ_COLUMNS.items():
            for col in cols:
                pg_session.execute(text(f"ALTER TABLE {table} ALTER COLUMN {col} TYPE {kind} USING {col} AT TIME ZONE 'UTC'"))
        pg_session.commit()

    alter("timestamptz")
    try:
        yield
    finally:
        pg_session.rollback()
        alter("timestamp")


def test_project_detail_and_notifications_on_timestamptz_columns(migrated_schema, pg_session: Session):
    from app.main import app

    client = TestClient(app)
    user = User(email="gabriela@soubim.com", password_hash=hash_password("password"), name="Gabriela", role="director")
    pg_session.add(user)
    make_org_member(pg_session, user, "admin")
    project = Project(owner_organization_id=default_org_id(pg_session), name="Torre Alpha")
    pg_session.add(project)
    pg_session.commit()
    source = Source(project_id=project.id, owner_organization_id=project.owner_organization_id, source_type="meeting",
                    title="Revisão estrutural", occurred_at=datetime.utcnow(), ingestion_status="processed", visibility="internal")
    pg_session.add(source)
    pg_session.commit()
    pg_session.add(ProjectItem(project_id=project.id, source_id=source.id, owner_organization_id=project.owner_organization_id,
                               statement="Concreto C50", who="Carlos", item_type="decision", source_type="meeting",
                               affected_disciplines=["structural"], discipline="structural", why="Motivo.", consensus={},
                               is_milestone=True, milestone_at=datetime.utcnow(), milestone_by=user.id))
    pg_session.commit()

    loaded = pg_session.query(ProjectItem).filter(ProjectItem.project_id == project.id).one()
    pg_session.refresh(loaded)
    assert loaded.created_at.tzinfo is None  # read back from a timestamptz column, naive UTC

    headers = {"Authorization": "Bearer " + create_access_token(str(user.id), user.email, user.role)}
    assert client.get(f"/api/projects/{project.id}", headers=headers).status_code == 200
    response = client.get("/api/notifications", headers=headers)
    assert response.status_code == 200, response.text
