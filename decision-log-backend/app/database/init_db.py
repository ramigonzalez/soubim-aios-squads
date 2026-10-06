"""Initialize database tables and seed with test data.

Story 13.8 — production safety:
- development/test: create_all + demo seed (unchanged behaviour).
- anything else (production, staging): tables come from Alembic migrations
  (`alembic upgrade head`, a release command on Railway), never from create_all, and
  demo users are seeded ONLY if DEMO_MODE=true is set explicitly.
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from app.config import settings
from app.database.models import Base
from app.database.session import engine
from app.database.seed import seed_database

LOCAL_ENVIRONMENTS = {"development", "test"}


def is_local_environment() -> bool:
    """True when running in development or test (create_all + demo seeding allowed)."""
    return settings.environment.strip().lower() in LOCAL_ENVIRONMENTS


def should_seed_demo_data() -> bool:
    """Seed only in development/test, or when DEMO_MODE=true is set explicitly."""
    return (
        is_local_environment()
        or settings.demo_mode
        or os.getenv("DEMO_MODE", "false").lower() == "true"
    )


def init_db():
    """Create tables (local only) and seed demo data (local or explicit DEMO_MODE)."""
    print("🔧 Initializing database...")

    if is_local_environment():
        print("📋 Creating database tables...")
        Base.metadata.create_all(bind=engine)
        print("✅ Database tables created successfully!")
    else:
        print(f"ℹ️  ENVIRONMENT={settings.environment}: skipping create_all (schema is managed by Alembic)")

    if should_seed_demo_data():
        print("\n🌱 Seeding database with test data...")
        os.environ["DEMO_MODE"] = "true"  # Enable demo mode for seeding
        seed_database()
    else:
        print("ℹ️  Demo seeding skipped (set DEMO_MODE=true explicitly to enable outside development/test)")


if __name__ == "__main__":
    init_db()
