"""Pytest configuration and shared fixtures."""

import pytest
import os
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool

from app.database.models import Base


@pytest.fixture(scope="function")
def db_session() -> Session:
    """
    Provide a clean database session for each test.

    Uses SQLite in-memory for fast unit tests.
    Can be overridden with TEST_DATABASE_URL env var for integration tests.
    """
    # Check if using external database
    test_db_url = os.getenv("TEST_DATABASE_URL")

    if test_db_url:
        # Use external database (e.g., PostgreSQL)
        engine = create_engine(test_db_url, echo=False)
    else:
        # Use in-memory SQLite for fast unit tests
        engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )

    # Create all tables
    Base.metadata.create_all(bind=engine)

    # Create session
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    yield db

    # Cleanup
    db.close()
    Base.metadata.drop_all(bind=engine)
