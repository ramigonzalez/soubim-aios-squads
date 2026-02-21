"""Pytest configuration and shared fixtures."""

import pytest
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

from app.database.models import Base

# PostgreSQL integration test support
_PG_URL = os.getenv("TEST_DATABASE_URL") or os.getenv("DATABASE_URL", "")
_POSTGRES_AVAILABLE = bool(_PG_URL and "postgresql" in _PG_URL.lower())


@pytest.fixture(scope="function")
def db_session() -> Session:
    """
    Provide a clean database session for each test.

    Uses PostgreSQL from DATABASE_URL environment variable.
    Falls back to SQLite in-memory if DATABASE_URL not set.
    """
    # Check if using external database
    test_db_url = os.getenv("TEST_DATABASE_URL") or os.getenv("DATABASE_URL")

    # If DATABASE_URL is SQLite, use in-memory SQLite
    # Otherwise, assume PostgreSQL is available
    if test_db_url and "sqlite" in test_db_url.lower():
        # Use in-memory SQLite for fast unit tests
        engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
    elif test_db_url and "postgresql" in test_db_url.lower():
        # Use PostgreSQL
        engine = create_engine(test_db_url, echo=False)
        try:
            # Try to connect and create tables
            with engine.begin() as conn:
                Base.metadata.create_all(bind=conn)
        except Exception:
            # If PostgreSQL not available, fall back to SQLite
            engine = create_engine(
                "sqlite:///:memory:",
                connect_args={"check_same_thread": False},
                poolclass=StaticPool,
            )
    else:
        # Default to SQLite in-memory
        engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )

    # Create all tables
    try:
        Base.metadata.create_all(bind=engine)
    except Exception as e:
        # If table creation fails, clean up and reraise
        raise

    # Create session
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    yield db

    # Cleanup
    db.close()
    try:
        Base.metadata.drop_all(bind=engine)
    except:
        pass  # Ignore cleanup errors


@pytest.fixture(scope="function")
def pg_engine():
    """
    PostgreSQL engine for integration tests.
    Skips automatically if PostgreSQL is not configured via TEST_DATABASE_URL or DATABASE_URL.
    """
    if not _POSTGRES_AVAILABLE:
        pytest.skip(
            "PostgreSQL not configured. "
            "Set TEST_DATABASE_URL=postgresql://... to run PostgreSQL integration tests."
        )
    engine = create_engine(_PG_URL, echo=False)
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
