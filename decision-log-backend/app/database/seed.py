"""Seed initial data for development and testing."""

from sqlalchemy.orm import Session
from uuid import uuid4
from datetime import datetime
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from app.database.models import User, Project, ProjectMember
from app.database.session import SessionLocal, engine
from app.utils.security import hash_password


def seed_database():
    """Seed database with initial test data."""
    db = SessionLocal()

    try:
        # Check if data already seeded
        existing_user = db.query(User).filter(User.email == "test@example.com").first()
        if existing_user:
            print("✓ Database already seeded. Skipping...")
            return

        print("🌱 Seeding database...")

        # Create test user (director)
        test_user = User(
            id=uuid4(),
            email="test@example.com",
            password_hash=hash_password("password"),
            name="Test User",
            role="director",
            created_at=datetime.utcnow(),
        )
        db.add(test_user)
        db.flush()
        print(f"  ✓ Created user: test@example.com")

        # Create additional test users
        gabriela = User(
            id=uuid4(),
            email="gabriela@soubim.com",
            password_hash=hash_password("password"),
            name="Gabriela",
            role="director",
            created_at=datetime.utcnow(),
        )
        db.add(gabriela)
        db.flush()
        print(f"  ✓ Created user: gabriela@soubim.com")

        carlos = User(
            id=uuid4(),
            email="carlos@mep.com",
            password_hash=hash_password("password"),
            name="Carlos",
            role="architect",
            created_at=datetime.utcnow(),
        )
        db.add(carlos)
        db.flush()
        print(f"  ✓ Created user: carlos@mep.com")

        # Create test project
        project1 = Project(
            id=uuid4(),
            name="Residential Tower Alpha",
            description="50-floor residential tower in downtown",
            created_at=datetime.utcnow(),
        )
        db.add(project1)
        db.flush()
        print(f"  ✓ Created project: Residential Tower Alpha")

        # Create second project
        project2 = Project(
            id=uuid4(),
            name="Commercial Plaza Beta",
            description="Mixed-use commercial development",
            created_at=datetime.utcnow(),
        )
        db.add(project2)
        db.flush()
        print(f"  ✓ Created project: Commercial Plaza Beta")

        # Add project members
        member1 = ProjectMember(
            project_id=project1.id,
            user_id=test_user.id,
            role="owner",
            created_at=datetime.utcnow(),
        )
        db.add(member1)

        member2 = ProjectMember(
            project_id=project1.id,
            user_id=gabriela.id,
            role="owner",
            created_at=datetime.utcnow(),
        )
        db.add(member2)

        member3 = ProjectMember(
            project_id=project1.id,
            user_id=carlos.id,
            role="member",
            created_at=datetime.utcnow(),
        )
        db.add(member3)

        member4 = ProjectMember(
            project_id=project2.id,
            user_id=gabriela.id,
            role="owner",
            created_at=datetime.utcnow(),
        )
        db.add(member4)

        db.commit()
        print(f"  ✓ Created project memberships")

        print("✅ Database seeded successfully!")

    except Exception as e:
        db.rollback()
        print(f"❌ Error seeding database: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
