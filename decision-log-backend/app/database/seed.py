"""Seed initial data for development and testing."""

from sqlalchemy.orm import Session
from uuid import uuid4
import uuid
from datetime import datetime
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from app.database.models import User, Project, ProjectMember, Decision
from app.database.session import SessionLocal, engine
from app.utils.security import hash_password
from app.config import settings


def seed_database():
    """Seed database with initial test data.

    ⚠️ SECURITY: Only runs if DEMO_MODE setting is enabled.
    This prevents accidentally seeding production databases with known passwords.
    """
    # Check if demo mode is enabled (from settings or environment variable)
    demo_mode = settings.demo_mode or os.getenv("DEMO_MODE", "false").lower() == "true"
    if not demo_mode:
        print("❌ DEMO_MODE not enabled. Seeding skipped.")
        print("   Set DEMO_MODE=true in .env or environment to seed development data.")
        return

    db = SessionLocal()

    try:
        # Check if data already seeded
        existing_user = db.query(User).filter(User.email == "test@example.com").first()
        if existing_user:
            print("✓ Database already seeded. Skipping...")
            return

        print("🌱 Seeding database (DEMO_MODE=true)...")

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
        db.flush()

        print(f"  ✓ Created project memberships")

        # Create test decisions for Residential Tower Alpha
        decision1 = Decision(
            id=uuid.uuid4(),
            project_id=project1.id,
            decision_statement="Use high-strength concrete (C50) for the main structural columns to handle 50-floor load",
            who="Carlos (Structural Engineer)",
            timestamp="00:05:32",
            discipline="structural",
            why="The building requires 50 floors with heavy loads. C50 provides optimal strength-to-cost ratio",
            causation="Load calculations showed requirement of 50+ MPa compression strength",
            impacts={
                "budget": "+15% material cost",
                "schedule": "-2 weeks (faster construction)",
                "performance": "Increased structural safety margin"
            },
            consensus={
                "engineer": "AGREE",
                "architect": "AGREE",
                "client": "AGREE"
            },
            confidence=0.95,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(decision1)
        db.flush()
        print(f"  ✓ Created decision 1: Structural concrete spec")

        decision2 = Decision(
            id=uuid.uuid4(),
            project_id=project1.id,
            decision_statement="Install LED lighting system with smart controls for energy efficiency",
            who="Gabriela (Project Director)",
            timestamp="00:12:15",
            discipline="electrical",
            why="Reduce operational costs by 40% and meet green building standards",
            causation="Energy audit showed 30% of operational budget goes to lighting",
            impacts={
                "cost_savings": "40% reduction in energy consumption",
                "sustainability": "Meets LEED Gold requirements",
                "maintenance": "Reduced bulb replacement frequency"
            },
            consensus={
                "engineer": "AGREE",
                "architect": "STRONGLY_AGREE",
                "client": "AGREE"
            },
            confidence=0.92,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(decision2)
        db.flush()
        print(f"  ✓ Created decision 2: LED lighting system")

        decision3 = Decision(
            id=uuid.uuid4(),
            project_id=project1.id,
            decision_statement="Install central HVAC system with zone-based temperature control",
            who="Carlos (MEP Engineer)",
            timestamp="00:18:45",
            discipline="mep",
            why="Optimize comfort while reducing energy consumption in 50-floor building",
            causation="Building size requires centralized system; zone control improves efficiency",
            impacts={
                "comfort": "Independent temperature control per floor",
                "efficiency": "25% energy savings vs conventional",
                "cost": "+$500K installation, -$200K/year operational"
            },
            consensus={
                "engineer": "STRONGLY_AGREE",
                "architect": "AGREE",
                "client": "AGREE"
            },
            confidence=0.88,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(decision3)
        db.flush()
        print(f"  ✓ Created decision 3: HVAC system design")

        # Create test decisions for Commercial Plaza Beta
        decision4 = Decision(
            id=uuid.uuid4(),
            project_id=project2.id,
            decision_statement="Use glass and steel curtain wall for iconic facade",
            who="Gabriela (Architect)",
            timestamp="00:08:20",
            discipline="architecture",
            why="Create distinctive building identity and maximize natural light for retail spaces",
            causation="Market analysis shows glass buildings attract 25% more retail tenants",
            impacts={
                "aesthetics": "Iconic appearance increases property value",
                "cost": "+$2M material and installation",
                "maintenance": "Quarterly professional cleaning required"
            },
            consensus={
                "engineer": "AGREE",
                "architect": "STRONGLY_AGREE",
                "client": "STRONGLY_AGREE"
            },
            confidence=0.96,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(decision4)
        db.flush()
        print(f"  ✓ Created decision 4: Curtain wall design")

        decision5 = Decision(
            id=uuid.uuid4(),
            project_id=project2.id,
            decision_statement="Implement rooftop solar panels and rainwater harvesting",
            who="Carlos (Sustainability Engineer)",
            timestamp="00:22:10",
            discipline="landscape",
            why="Generate 30% of building energy and reduce water consumption by 50%",
            causation="Site analysis identified excellent solar exposure and large roof area",
            impacts={
                "energy": "30% renewable energy generation",
                "water": "50% reduction in municipal water usage",
                "roi": "7-year payback period, +30% property value"
            },
            consensus={
                "engineer": "AGREE",
                "architect": "AGREE",
                "client": "STRONGLY_AGREE"
            },
            confidence=0.90,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(decision5)
        db.flush()
        print(f"  ✓ Created decision 5: Solar and water systems")

        db.commit()
        print(f"  ✓ Created decisions")

        print("✅ Database seeded successfully!")

    except Exception as e:
        db.rollback()
        print(f"❌ Error seeding database: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
