"""Initialize database tables and seed with test data."""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from app.database.models import Base
from app.database.session import engine
from app.database.seed import seed_database


def init_db():
    """Create all database tables and seed with test data."""
    print("🔧 Initializing database...")

    # Create all tables
    print("📋 Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables created successfully!")

    # Seed with test data
    print("\n🌱 Seeding database with test data...")
    os.environ["DEMO_MODE"] = "true"  # Enable demo mode for seeding
    seed_database()


if __name__ == "__main__":
    init_db()
