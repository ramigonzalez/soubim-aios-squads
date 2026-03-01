"""Database session management and connection pooling."""

import logging
import os

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import NullPool, StaticPool

from app.config import settings

logger = logging.getLogger(__name__)

SQLITE_FALLBACK_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    "decisionlog_dev.db",
)
SQLITE_FALLBACK_URL = f"sqlite:///{SQLITE_FALLBACK_PATH}"


def _create_engine(url: str):
    """Create a SQLAlchemy engine, falling back to SQLite in development if PostgreSQL is unavailable."""
    if url.startswith("sqlite"):
        return create_engine(
            url,
            echo=settings.debug,
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )

    # Try PostgreSQL
    try:
        eng = create_engine(
            url,
            echo=settings.debug,
            pool_pre_ping=True,
            pool_recycle=3600,
            poolclass=NullPool if "serverless" in url else None,
        )
        with eng.connect() as conn:
            conn.execute(text("SELECT 1"))
        return eng
    except Exception:
        if settings.debug:
            logger.warning(
                "PostgreSQL unavailable. Falling back to SQLite at %s",
                SQLITE_FALLBACK_PATH,
            )
            return create_engine(
                SQLITE_FALLBACK_URL,
                echo=settings.debug,
                connect_args={"check_same_thread": False},
                poolclass=StaticPool,
            )
        raise


engine = _create_engine(settings.database_url)

# Create session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


def get_db() -> Session:
    """Get database session dependency."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
