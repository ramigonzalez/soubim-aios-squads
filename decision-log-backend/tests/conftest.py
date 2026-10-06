"""Pytest configuration and shared fixtures.

Story 7.18 — every test run uses a throwaway database, never the dev database.

- PostgreSQL reachable (TEST_DATABASE_URL > DATABASE_URL > .env.development): a fresh
  database ``decisionlog_test_<random>`` is created on that server for this run and
  dropped at the end, so PostgreSQL-specific features are still exercised (TEST-003).
- Otherwise: in-memory SQLite.

``DATABASE_URL`` is pointed at the throwaway database *before any app module is
imported*, so the app's own engine/SessionLocal (used by services, middleware and
tests that import ``app.database.session``) also never reaches the dev database.

Every create_all/drop_all goes through ``assert_test_database`` and refuses to run on
a database whose name does not start with ``decisionlog_test``.

To force SQLite: TEST_DATABASE_URL=sqlite:// pytest
"""

import os
import pathlib
import uuid

import pytest
from dotenv import dotenv_values
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine, make_url
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

_BACKEND_DIR = pathlib.Path(__file__).parent.parent
_ENV_DEV = _BACKEND_DIR / ".env.development"
TEST_DB_PREFIX = "decisionlog_test"
SQLITE_MEMORY_URL = "sqlite://"


def _resolve_server_url() -> str:
    """Database server to use: TEST_DATABASE_URL > DATABASE_URL (env) > .env.development."""
    url = os.getenv("TEST_DATABASE_URL") or os.getenv("DATABASE_URL")
    if url:
        return url
    if _ENV_DEV.exists():
        return dotenv_values(_ENV_DEV).get("DATABASE_URL", "") or ""
    return ""


def _admin_engine(server_url: str) -> Engine:
    """Engine on the server's maintenance database, for CREATE/DROP DATABASE."""
    return create_engine(
        make_url(server_url).set(database="postgres"),
        isolation_level="AUTOCOMMIT",
        connect_args={"connect_timeout": 3},
    )


def _create_throwaway_database(server_url: str) -> str:
    """Create an empty test database on the PostgreSQL server; return its URL ("" if unreachable)."""
    name = f"{TEST_DB_PREFIX}_{uuid.uuid4().hex[:10]}"
    try:
        admin = _admin_engine(server_url)
        with admin.connect() as conn:
            conn.execute(text(f'CREATE DATABASE "{name}"'))
        admin.dispose()
    except Exception:
        return ""
    test_url = make_url(server_url).set(database=name).render_as_string(hide_password=False)
    probe = create_engine(test_url)
    with probe.begin() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))  # project_items.embedding
    probe.dispose()
    return test_url


def _drop_throwaway_database(server_url: str, test_url: str) -> None:
    name = make_url(test_url).database
    assert name and name.startswith(TEST_DB_PREFIX), f"refusing to drop non-test database {name!r}"
    admin = _admin_engine(server_url)
    with admin.connect() as conn:
        conn.execute(text(f'DROP DATABASE IF EXISTS "{name}" WITH (FORCE)'))
    admin.dispose()


def assert_test_database(bind) -> None:
    """Refuse to create/drop tables anywhere but a throwaway test database."""
    url = bind.engine.url if hasattr(bind, "engine") else bind.url
    if url.get_backend_name() == "sqlite":
        return
    if not (url.database or "").startswith(TEST_DB_PREFIX):
        raise RuntimeError(
            f"Refusing to create/drop tables in database {url.database!r}: "
            f"tests only run against '{TEST_DB_PREFIX}*' databases"
        )


_SERVER_URL = _resolve_server_url()
_DB_URL = ""
if _SERVER_URL and make_url(_SERVER_URL).get_backend_name() == "postgresql":
    _DB_URL = _create_throwaway_database(_SERVER_URL)
_POSTGRES_AVAILABLE = bool(_DB_URL)

# Point the app at the throwaway database before any app module reads settings.
os.environ["DATABASE_URL"] = _DB_URL or SQLITE_MEMORY_URL
# Story 13.11: the suite must not hit rate limits; tests/unit/test_rate_limit.py switches them on explicitly.
os.environ["RATE_LIMIT_ENABLED"] = "false"

from app.database.models import Base  # noqa: E402  (must follow the DATABASE_URL override)


def pytest_configure(config):
    """Register custom markers."""
    config.addinivalue_line(
        "markers", "postgresql: mark test as requiring PostgreSQL (skipped if unavailable)"
    )


def pytest_unconfigure(config):
    """Drop this run's throwaway database."""
    if _POSTGRES_AVAILABLE:
        from app.database.session import engine as app_engine

        app_engine.dispose()
        _drop_throwaway_database(_SERVER_URL, _DB_URL)


def pytest_collection_modifyitems(config, items):
    """Auto-skip tests marked @pytest.mark.postgresql when PostgreSQL is unavailable."""
    if _POSTGRES_AVAILABLE:
        return
    skip_pg = pytest.mark.skip(
        reason="PostgreSQL not available. Set TEST_DATABASE_URL or start Docker Compose."
    )
    for item in items:
        if "postgresql" in item.keywords:
            item.add_marker(skip_pg)


@pytest.fixture(scope="function")
def db_session() -> Session:
    """
    Provide a clean database session for each test.

    Uses this run's throwaway PostgreSQL database when available, else in-memory SQLite.
    """
    if _POSTGRES_AVAILABLE:
        engine = create_engine(_DB_URL, echo=False)
    else:
        engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )

    assert_test_database(engine)
    Base.metadata.create_all(bind=engine)

    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    yield db

    db.close()
    try:
        Base.metadata.drop_all(bind=engine)
    except Exception:
        pass
    engine.dispose()


@pytest.fixture(scope="function")
def pg_engine():
    """
    PostgreSQL engine (this run's throwaway database) for integration tests.
    Skips automatically if PostgreSQL is not reachable.
    """
    if not _POSTGRES_AVAILABLE:
        pytest.skip(
            "PostgreSQL not configured. "
            "Set TEST_DATABASE_URL=postgresql://... or run: docker compose up -d db"
        )
    engine = create_engine(_DB_URL, echo=False)
    assert_test_database(engine)
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as exc:
        pytest.skip(f"PostgreSQL connection failed: {exc}")
    yield engine
    try:
        Base.metadata.drop_all(bind=engine)
    except Exception:
        pass
    engine.dispose()


@pytest.fixture(scope="function")
def pg_session(pg_engine) -> Session:
    """
    PostgreSQL-only ORM session. Skips if PostgreSQL not configured.
    Use this instead of db_session when a test requires PostgreSQL-specific features
    (GIN indexes, @> operator, vector search, transactional DDL).
    """
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=pg_engine)
    db = SessionLocal()
    yield db
    db.close()


# ──────────────────────────────────────────────────────────────────────────────
# TEST-002: V1 schema fixture for migration SQL execution tests
# Creates V1 (pre-migration) schema in an isolated PostgreSQL schema namespace
# so actual UPGRADE_SQL/DOWNGRADE_SQL can be executed and verified.
# ──────────────────────────────────────────────────────────────────────────────

V1_SCHEMA_DDL = """
-- V1 Schema (pre-migration 001): recreates the database state that existed
-- before Story 5.1 migration. Used to test that UPGRADE_SQL works correctly.

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('director', 'architect', 'client')),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    last_login_at TIMESTAMP,
    deleted_at TIMESTAMP
);

CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    project_type VARCHAR(100),
    actual_stage_id UUID,
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    archived_at TIMESTAMP
);

CREATE TABLE transcripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id VARCHAR(255) UNIQUE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    meeting_id VARCHAR(255),
    meeting_type VARCHAR(50),
    meeting_title VARCHAR(255),
    participants JSON NOT NULL,
    transcript_text TEXT NOT NULL,
    duration_minutes VARCHAR,
    meeting_date TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE TABLE decisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    transcript_id UUID REFERENCES transcripts(id) ON DELETE CASCADE,
    decision_statement TEXT NOT NULL,
    who VARCHAR(255) NOT NULL,
    timestamp VARCHAR(20) NOT NULL,
    discipline VARCHAR(100) NOT NULL,
    why TEXT NOT NULL,
    causation TEXT,
    impacts JSON,
    consensus JSON NOT NULL,
    confidence FLOAT,
    similar_decisions JSON,
    consistency_notes TEXT,
    anomaly_flags JSON,
    embedding vector(384),
    created_at TIMESTAMP NOT NULL DEFAULT now(),
    updated_at TIMESTAMP NOT NULL DEFAULT now(),
    CONSTRAINT ck_confidence_range CHECK (confidence BETWEEN 0 AND 1)
);

CREATE INDEX idx_decisions_project ON decisions(project_id);
CREATE INDEX idx_decisions_discipline ON decisions(discipline);
CREATE INDEX idx_decisions_confidence ON decisions(confidence);
CREATE INDEX idx_decisions_created ON decisions(created_at);
CREATE INDEX idx_decisions_composite ON decisions(project_id, discipline, created_at);
"""

V1_SEED_DATA = """
INSERT INTO projects (id, name, description)
VALUES ('11111111-1111-1111-1111-111111111111', 'Migration Test Project',
        'Project for testing V1 to V2 migration SQL');

INSERT INTO transcripts (id, webhook_id, project_id, meeting_type, meeting_title,
    participants, transcript_text, duration_minutes, meeting_date, created_at)
VALUES (
    '22222222-2222-2222-2222-222222222222',
    'wh_migration_test_001',
    '11111111-1111-1111-1111-111111111111',
    'Design Review',
    'Structural Design Review',
    '[{"name": "Carlos", "role": "Engineer"}, {"name": "André", "role": "Architect"}]',
    'Full transcript text for migration testing...',
    '45',
    '2025-12-01 10:00:00',
    '2025-12-01 10:00:00'
);

INSERT INTO decisions (id, project_id, transcript_id, decision_statement, who,
    timestamp, discipline, why, consensus, confidence)
VALUES
    ('33333333-3333-3333-3333-333333333333',
     '11111111-1111-1111-1111-111111111111',
     '22222222-2222-2222-2222-222222222222',
     'Use steel framing for main structure', 'Carlos', '00:05:00', 'structural',
     'Cost efficiency and construction speed',
     '{"structural":"AGREE","architecture":"AGREE"}', 0.85),
    ('44444444-4444-4444-4444-444444444444',
     '11111111-1111-1111-1111-111111111111',
     '22222222-2222-2222-2222-222222222222',
     'Interior wall placement follows structural grid', 'André', '00:10:00', 'interior',
     'Space planning consistency with structure',
     '{"interior":"AGREE"}', 0.75),
    ('55555555-5555-5555-5555-555555555555',
     '11111111-1111-1111-1111-111111111111',
     '22222222-2222-2222-2222-222222222222',
     'HVAC routing through ceiling void', 'Carlos', '00:15:00', 'mep',
     'Minimize floor-to-floor height impact',
     '{"mep":"STRONGLY_AGREE","structural":"AGREE"}', 0.90);
"""


def _strip_tx(sql: str) -> str:
    """Strip BEGIN/COMMIT from migration SQL — SQLAlchemy manages the transaction."""
    return sql.replace("BEGIN;", "").replace("COMMIT;", "").strip()


def _exec_migration_sql(conn, sql: str):
    """Execute raw migration SQL via DBAPI cursor (bypasses SQLAlchemy text() parsing).

    Migration SQL contains :null in comments and complex PostgreSQL syntax
    that SQLAlchemy's text() misinterprets as bind parameters. Using the raw
    DBAPI cursor avoids all parameter binding issues.
    """
    stripped = _strip_tx(sql)
    raw_conn = conn.connection.dbapi_connection
    with raw_conn.cursor() as cur:
        cur.execute(stripped)


@pytest.fixture(scope="function")
def v1_pg_schema(pg_engine):
    """
    TEST-002: V1 schema in an isolated PostgreSQL schema namespace.

    Creates the pre-migration database state (decisions table, V1 indexes)
    in a separate schema so actual migration SQL can be executed and verified
    without affecting the public schema or dev data.

    Yields a connection with search_path set to the test schema.
    """
    schema_name = "test_v1_migration"

    with pg_engine.connect() as conn:
        # Create isolated schema
        conn.execute(text(f"DROP SCHEMA IF EXISTS {schema_name} CASCADE"))
        conn.execute(text(f"CREATE SCHEMA {schema_name}"))
        conn.execute(text(f"SET search_path TO {schema_name}, public"))

        # Create V1 tables and seed data
        conn.execute(text(V1_SCHEMA_DDL))
        conn.execute(text(V1_SEED_DATA))
        conn.commit()

        yield conn

        # Cleanup: reset search_path and drop test schema
        conn.execute(text("SET search_path TO public"))
        conn.execute(text(f"DROP SCHEMA IF EXISTS {schema_name} CASCADE"))
        conn.commit()
