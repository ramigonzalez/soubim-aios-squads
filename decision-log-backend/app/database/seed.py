"""Seed initial data for development and testing.

V2 Migration (Story 5.1): Uses ProjectItem model with V2 fields
(item_type, source_type, affected_disciplines, statement, is_milestone, is_done).
Includes Source records linked to transcripts and ProjectParticipant records.
"""

from sqlalchemy.orm import Session
from uuid import uuid4
import uuid
from datetime import datetime
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))

from app.database.models import (
    User, Project, ProjectMember, ProjectItem, Transcript,
    Source, ProjectParticipant,
)
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
            project_type="residential",
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
            project_type="commercial",
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

        # ── Project Participants (V2) ───────────────────────────────────
        participants_p1 = [
            ProjectParticipant(project_id=project1.id, name="Carlos", email="carlos@mep.com", discipline="structural", role="Structural Engineer"),
            ProjectParticipant(project_id=project1.id, name="Gabriela", email="gabriela@soubim.com", discipline="architecture", role="Project Director"),
            ProjectParticipant(project_id=project1.id, name="André", discipline="mep", role="MEP Engineer"),
            ProjectParticipant(project_id=project1.id, name="Lucia", discipline="architecture", role="Architect"),
            ProjectParticipant(project_id=project1.id, name="Roberto", discipline="plumbing", role="Plumbing Engineer"),
            ProjectParticipant(project_id=project1.id, name="Marina", discipline="landscape", role="Landscape Architect"),
            ProjectParticipant(project_id=project1.id, name="Miguel", discipline="electrical", role="Electrical Engineer"),
        ]
        participants_p2 = [
            ProjectParticipant(project_id=project2.id, name="Gabriela", email="gabriela@soubim.com", discipline="architecture", role="Architect"),
            ProjectParticipant(project_id=project2.id, name="Carlos", email="carlos@mep.com", discipline="sustainability", role="Sustainability Engineer"),
        ]
        db.add_all(participants_p1 + participants_p2)
        db.flush()
        print(f"  ✓ Created {len(participants_p1) + len(participants_p2)} project participants")

        # ── Transcripts for Project 1 (Residential Tower Alpha) ──────────

        t1 = Transcript(
            id=uuid4(),
            project_id=project1.id,
            webhook_id="wh_struct_review_001",
            meeting_title="Structural Design Review",
            meeting_type="Design Review",
            participants=[
                {"name": "Carlos", "role": "Structural Engineer"},
                {"name": "Gabriela", "role": "Project Director"},
                {"name": "André", "role": "MEP Engineer"},
                {"name": "Lucia", "role": "Architect"},
                {"name": "Roberto", "role": "Plumbing Engineer"},
                {"name": "Marina", "role": "Landscape Architect"},
            ],
            transcript_text="[structural design review transcript]",
            duration_minutes="45",
            meeting_date=datetime(2026, 2, 6, 9, 0, 0),
            created_at=datetime(2026, 2, 6, 9, 0, 0),
        )
        db.add(t1)

        t2 = Transcript(
            id=uuid4(),
            project_id=project1.id,
            webhook_id="wh_mep_coord_001",
            meeting_title="MEP Coordination",
            meeting_type="Coordination",
            participants=[
                {"name": "Carlos", "role": "MEP Engineer"},
                {"name": "Gabriela", "role": "Project Director"},
                {"name": "Roberto", "role": "Plumbing Engineer"},
                {"name": "Miguel", "role": "Electrical Engineer"},
            ],
            transcript_text="[mep coordination transcript]",
            duration_minutes="60",
            meeting_date=datetime(2026, 2, 6, 14, 0, 0),
            created_at=datetime(2026, 2, 6, 14, 0, 0),
        )
        db.add(t2)

        t3 = Transcript(
            id=uuid4(),
            project_id=project1.id,
            webhook_id="wh_client_align_001",
            meeting_title="Client Alignment - Electrical",
            meeting_type="Client Meeting",
            participants=[
                {"name": "Gabriela", "role": "Project Director"},
                {"name": "Carlos", "role": "MEP Engineer"},
                {"name": "Miguel", "role": "Electrical Engineer"},
            ],
            transcript_text="[client alignment transcript]",
            duration_minutes="30",
            meeting_date=datetime(2026, 2, 7, 10, 0, 0),
            created_at=datetime(2026, 2, 7, 10, 0, 0),
        )
        db.add(t3)

        t4 = Transcript(
            id=uuid4(),
            project_id=project1.id,
            webhook_id="wh_landscape_review_001",
            meeting_title="Landscape Design Review",
            meeting_type="Design Review",
            participants=[
                {"name": "Gabriela", "role": "Project Director"},
                {"name": "Marina", "role": "Landscape Architect"},
                {"name": "Carlos", "role": "Structural Engineer"},
            ],
            transcript_text="[landscape design review transcript]",
            duration_minutes="40",
            meeting_date=datetime(2026, 2, 7, 15, 0, 0),
            created_at=datetime(2026, 2, 7, 15, 0, 0),
        )
        db.add(t4)

        # ── Transcripts for Project 2 (Commercial Plaza Beta) ──────────

        t5 = Transcript(
            id=uuid4(),
            project_id=project2.id,
            webhook_id="wh_facade_review_001",
            meeting_title="Facade Design Review",
            meeting_type="Design Review",
            participants=[
                {"name": "Gabriela", "role": "Architect"},
            ],
            transcript_text="[facade design review transcript]",
            duration_minutes="50",
            meeting_date=datetime(2026, 2, 5, 11, 0, 0),
            created_at=datetime(2026, 2, 5, 11, 0, 0),
        )
        db.add(t5)

        t6 = Transcript(
            id=uuid4(),
            project_id=project2.id,
            webhook_id="wh_sustainability_001",
            meeting_title="Sustainability Planning",
            meeting_type="Coordination",
            participants=[
                {"name": "Carlos", "role": "Sustainability Engineer"},
            ],
            transcript_text="[sustainability planning transcript]",
            duration_minutes="35",
            meeting_date=datetime(2026, 2, 5, 15, 0, 0),
            created_at=datetime(2026, 2, 5, 15, 0, 0),
        )
        db.add(t6)

        db.flush()
        print(f"  ✓ Created 6 transcripts with meeting titles")

        # ── Source records from transcripts (V2) ────────────────────────
        s1 = Source(
            id=uuid4(), project_id=project1.id, source_type="meeting",
            title="Structural Design Review", occurred_at=datetime(2026, 2, 6, 9, 0, 0),
            ingestion_status="processed", raw_content="[structural design review transcript]",
            meeting_type="Design Review", webhook_id="wh_struct_review_001",
            participants=[
                {"name": "Carlos", "role": "Structural Engineer"},
                {"name": "Gabriela", "role": "Project Director"},
                {"name": "André", "role": "MEP Engineer"},
                {"name": "Lucia", "role": "Architect"},
                {"name": "Roberto", "role": "Plumbing Engineer"},
                {"name": "Marina", "role": "Landscape Architect"},
            ],
            duration_minutes=45,
            created_at=datetime(2026, 2, 6, 9, 0, 0),
        )
        s2 = Source(
            id=uuid4(), project_id=project1.id, source_type="meeting",
            title="MEP Coordination", occurred_at=datetime(2026, 2, 6, 14, 0, 0),
            ingestion_status="processed", raw_content="[mep coordination transcript]",
            meeting_type="Coordination", webhook_id="wh_mep_coord_001",
            participants=[
                {"name": "Carlos", "role": "MEP Engineer"},
                {"name": "Gabriela", "role": "Project Director"},
                {"name": "Roberto", "role": "Plumbing Engineer"},
                {"name": "Miguel", "role": "Electrical Engineer"},
            ],
            duration_minutes=60,
            created_at=datetime(2026, 2, 6, 14, 0, 0),
        )
        s3 = Source(
            id=uuid4(), project_id=project1.id, source_type="meeting",
            title="Client Alignment - Electrical", occurred_at=datetime(2026, 2, 7, 10, 0, 0),
            ingestion_status="processed", raw_content="[client alignment transcript]",
            meeting_type="Client Meeting", webhook_id="wh_client_align_001",
            participants=[
                {"name": "Gabriela", "role": "Project Director"},
                {"name": "Carlos", "role": "MEP Engineer"},
                {"name": "Miguel", "role": "Electrical Engineer"},
            ],
            duration_minutes=30,
            created_at=datetime(2026, 2, 7, 10, 0, 0),
        )
        s4 = Source(
            id=uuid4(), project_id=project1.id, source_type="meeting",
            title="Landscape Design Review", occurred_at=datetime(2026, 2, 7, 15, 0, 0),
            ingestion_status="processed", raw_content="[landscape design review transcript]",
            meeting_type="Design Review", webhook_id="wh_landscape_review_001",
            participants=[
                {"name": "Gabriela", "role": "Project Director"},
                {"name": "Marina", "role": "Landscape Architect"},
                {"name": "Carlos", "role": "Structural Engineer"},
            ],
            duration_minutes=40,
            created_at=datetime(2026, 2, 7, 15, 0, 0),
        )
        s5 = Source(
            id=uuid4(), project_id=project2.id, source_type="meeting",
            title="Facade Design Review", occurred_at=datetime(2026, 2, 5, 11, 0, 0),
            ingestion_status="processed", raw_content="[facade design review transcript]",
            meeting_type="Design Review", webhook_id="wh_facade_review_001",
            participants=[{"name": "Gabriela", "role": "Architect"}],
            duration_minutes=50,
            created_at=datetime(2026, 2, 5, 11, 0, 0),
        )
        s6 = Source(
            id=uuid4(), project_id=project2.id, source_type="meeting",
            title="Sustainability Planning", occurred_at=datetime(2026, 2, 5, 15, 0, 0),
            ingestion_status="processed", raw_content="[sustainability planning transcript]",
            meeting_type="Coordination", webhook_id="wh_sustainability_001",
            participants=[{"name": "Carlos", "role": "Sustainability Engineer"}],
            duration_minutes=35,
            created_at=datetime(2026, 2, 5, 15, 0, 0),
        )
        db.add_all([s1, s2, s3, s4, s5, s6])
        db.flush()
        print(f"  ✓ Created 6 source records from transcripts")

        # ── Project Items (V2) — formerly Decisions ─────────────────────
        # All existing decisions get: item_type='decision', source_type='meeting',
        # affected_disciplines=[discipline], statement=decision_statement,
        # consensus in V2 format: {"key": {"status": "AGREE", "notes": null}}

        # Feb 6 AM — from Structural Design Review (t1/s1)
        item1 = ProjectItem(
            id=uuid.uuid4(), project_id=project1.id,
            transcript_id=t1.id, source_id=s1.id,
            item_type="decision", source_type="meeting",
            decision_statement="Use high-strength concrete (C50) for the main structural columns to handle 50-floor load",
            statement="Use high-strength concrete (C50) for the main structural columns to handle 50-floor load",
            who="Carlos (Structural Engineer)", timestamp="00:05:32",
            discipline="structural", affected_disciplines=["structural"],
            why="The building requires 50 floors with heavy loads. C50 provides optimal strength-to-cost ratio",
            causation="Load calculations showed requirement of 50+ MPa compression strength",
            impacts={"budget": "+15% material cost", "schedule": "-2 weeks (faster construction)", "performance": "Increased structural safety margin"},
            consensus={"engineer": {"status": "AGREE", "notes": None}, "architect": {"status": "AGREE", "notes": None}, "client": {"status": "AGREE", "notes": None}},
            confidence=0.95, is_milestone=True,
            created_at=datetime(2026, 2, 6, 9, 5, 32), updated_at=datetime(2026, 2, 6, 9, 5, 32),
        )
        db.add(item1)

        item1b = ProjectItem(
            id=uuid.uuid4(), project_id=project1.id,
            transcript_id=t1.id, source_id=s1.id,
            item_type="decision", source_type="meeting",
            decision_statement="Use post-tensioned slabs to reduce floor thickness by 2 inches",
            statement="Use post-tensioned slabs to reduce floor thickness by 2 inches",
            who="Carlos (Structural Engineer)", timestamp="00:22:10",
            discipline="structural", affected_disciplines=["structural"],
            why="Height restriction from zoning requires optimized structure. Reduces overall building height.",
            causation="Zoning limits require thinner slabs to fit 50 floors within height envelope",
            impacts={"budget": "+$450K for post-tensioning system", "schedule": "Specialized contractor required"},
            consensus={"engineer": {"status": "AGREE", "notes": None}, "contractor": {"status": "MIXED", "notes": None}, "client": {"status": "AGREE", "notes": None}},
            confidence=0.85,
            created_at=datetime(2026, 2, 6, 9, 22, 10), updated_at=datetime(2026, 2, 6, 9, 22, 10),
        )
        db.add(item1b)

        item1c = ProjectItem(
            id=uuid.uuid4(), project_id=project1.id,
            transcript_id=t1.id, source_id=s1.id,
            item_type="decision", source_type="meeting",
            decision_statement="Adopt seismic isolation bearings for ground floor columns",
            statement="Adopt seismic isolation bearings for ground floor columns",
            who="Carlos (Structural Engineer)", timestamp="00:28:45",
            discipline="structural", affected_disciplines=["structural"],
            why="Seismic zone 3 classification requires enhanced protection for 50-floor structures",
            causation="Updated seismic hazard map reclassified site from zone 2 to zone 3",
            impacts={"budget": "+$800K for isolation system", "safety": "Significant reduction in lateral forces on superstructure"},
            consensus={"engineer": {"status": "STRONGLY_AGREE", "notes": None}, "architect": {"status": "AGREE", "notes": None}, "client": {"status": "AGREE", "notes": None}},
            confidence=0.91, is_milestone=True,
            created_at=datetime(2026, 2, 6, 9, 28, 45), updated_at=datetime(2026, 2, 6, 9, 28, 45),
        )
        db.add(item1c)

        item1d = ProjectItem(
            id=uuid.uuid4(), project_id=project1.id,
            transcript_id=t1.id, source_id=s1.id,
            item_type="decision", source_type="meeting",
            decision_statement="Use BIM Level 3 coordination for all structural connections",
            statement="Use BIM Level 3 coordination for all structural connections",
            who="Lucia (Architect)", timestamp="00:32:10",
            discipline="architecture", affected_disciplines=["architecture", "structural"],
            why="Reduces RFIs by 60% during construction phase based on industry benchmarks",
            causation="Previous project saw 45 structural RFIs that could have been avoided with BIM",
            impacts={"schedule": "-3 weeks from reduced RFI turnaround", "quality": "Clash-free structural model before construction"},
            consensus={"architect": {"status": "STRONGLY_AGREE", "notes": None}, "engineer": {"status": "AGREE", "notes": None}, "contractor": {"status": "AGREE", "notes": None}},
            confidence=0.88,
            created_at=datetime(2026, 2, 6, 9, 32, 10), updated_at=datetime(2026, 2, 6, 9, 32, 10),
        )
        db.add(item1d)

        item1e = ProjectItem(
            id=uuid.uuid4(), project_id=project1.id,
            transcript_id=t1.id, source_id=s1.id,
            item_type="decision", source_type="meeting",
            decision_statement="Specify grade 60 rebar for all structural elements",
            statement="Specify grade 60 rebar for all structural elements",
            who="Carlos (Structural Engineer)", timestamp="00:36:20",
            discipline="structural", affected_disciplines=["structural"],
            why="Higher grade reduces rebar quantity by 15% while maintaining safety factor",
            causation="Material cost analysis showed net savings despite higher unit price",
            impacts={"budget": "-$120K net material savings", "construction": "Easier placement due to fewer bars"},
            consensus={"engineer": {"status": "AGREE", "notes": None}, "contractor": {"status": "AGREE", "notes": None}},
            confidence=0.93,
            created_at=datetime(2026, 2, 6, 9, 36, 20), updated_at=datetime(2026, 2, 6, 9, 36, 20),
        )
        db.add(item1e)

        item1f = ProjectItem(
            id=uuid.uuid4(), project_id=project1.id,
            transcript_id=t1.id, source_id=s1.id,
            item_type="decision", source_type="meeting",
            decision_statement="Add transfer beams at level 5 to accommodate retail podium layout",
            statement="Add transfer beams at level 5 to accommodate retail podium layout",
            who="Carlos (Structural Engineer)", timestamp="00:40:55",
            discipline="structural", affected_disciplines=["structural", "architecture"],
            why="Retail tenant requires column-free spans of 12m on lower floors",
            causation="Retail lease agreement specifies open floor plans without interior columns",
            impacts={"budget": "+$350K for heavy transfer beams", "schedule": "+1 week for specialized formwork"},
            consensus={"engineer": {"status": "AGREE", "notes": None}, "architect": {"status": "STRONGLY_AGREE", "notes": None}, "client": {"status": "AGREE", "notes": None}},
            confidence=0.87, is_milestone=True,
            created_at=datetime(2026, 2, 6, 9, 40, 55), updated_at=datetime(2026, 2, 6, 9, 40, 55),
        )
        db.add(item1f)

        item1g = ProjectItem(
            id=uuid.uuid4(), project_id=project1.id,
            transcript_id=t1.id, source_id=s1.id,
            item_type="decision", source_type="meeting",
            decision_statement="Install structural health monitoring sensors on key columns",
            statement="Install structural health monitoring sensors on key columns",
            who="Gabriela (Project Director)", timestamp="00:44:30",
            discipline="structural", affected_disciplines=["structural"],
            why="Long-term monitoring ensures safety and provides data for maintenance planning",
            causation="Insurance provider offers 10% premium discount with continuous monitoring",
            impacts={"budget": "+$180K for sensor network", "maintenance": "Real-time alerts for structural anomalies"},
            consensus={"engineer": {"status": "AGREE", "notes": None}, "client": {"status": "STRONGLY_AGREE", "notes": None}},
            confidence=0.84,
            created_at=datetime(2026, 2, 6, 9, 44, 30), updated_at=datetime(2026, 2, 6, 9, 44, 30),
        )
        db.add(item1g)

        # Feb 6 PM — from MEP Coordination (t2/s2)
        item2 = ProjectItem(
            id=uuid.uuid4(), project_id=project1.id,
            transcript_id=t2.id, source_id=s2.id,
            item_type="decision", source_type="meeting",
            decision_statement="Install central HVAC system with zone-based temperature control",
            statement="Install central HVAC system with zone-based temperature control",
            who="Carlos (MEP Engineer)", timestamp="00:18:45",
            discipline="mep", affected_disciplines=["mep"],
            why="Optimize comfort while reducing energy consumption in 50-floor building",
            causation="Building size requires centralized system; zone control improves efficiency",
            impacts={"comfort": "Independent temperature control per floor", "efficiency": "25% energy savings vs conventional", "cost": "+$500K installation, -$200K/year operational"},
            consensus={"engineer": {"status": "STRONGLY_AGREE", "notes": None}, "architect": {"status": "AGREE", "notes": None}, "client": {"status": "AGREE", "notes": None}},
            confidence=0.88, is_milestone=True,
            created_at=datetime(2026, 2, 6, 14, 18, 45), updated_at=datetime(2026, 2, 6, 14, 18, 45),
        )
        db.add(item2)

        item2b = ProjectItem(
            id=uuid.uuid4(), project_id=project1.id,
            transcript_id=t2.id, source_id=s2.id,
            item_type="decision", source_type="meeting",
            decision_statement="Implement rainwater harvesting system for irrigation",
            statement="Implement rainwater harvesting system for irrigation",
            who="Carlos (MEP Engineer)", timestamp="00:35:20",
            discipline="plumbing", affected_disciplines=["plumbing", "landscape"],
            why="Reduces potable water consumption by 40% and earns LEED points",
            causation="Sustainability goals and local water conservation incentives",
            impacts={"water": "40% reduction in municipal water usage", "cost": "+$95K for collection and filtration system"},
            consensus={"plumbing": {"status": "AGREE", "notes": None}, "landscape": {"status": "AGREE", "notes": None}, "client": {"status": "AGREE", "notes": None}},
            confidence=0.92,
            created_at=datetime(2026, 2, 6, 14, 35, 20), updated_at=datetime(2026, 2, 6, 14, 35, 20),
        )
        db.add(item2b)

        # Feb 7 AM — from Client Alignment (t3/s3)
        item3 = ProjectItem(
            id=uuid.uuid4(), project_id=project1.id,
            transcript_id=t3.id, source_id=s3.id,
            item_type="decision", source_type="meeting",
            decision_statement="Install LED lighting system with smart controls for energy efficiency",
            statement="Install LED lighting system with smart controls for energy efficiency",
            who="Gabriela (Project Director)", timestamp="00:12:15",
            discipline="electrical", affected_disciplines=["electrical"],
            why="Reduce operational costs by 40% and meet green building standards",
            causation="Energy audit showed 30% of operational budget goes to lighting",
            impacts={"cost_savings": "40% reduction in energy consumption", "sustainability": "Meets LEED Gold requirements", "maintenance": "Reduced bulb replacement frequency"},
            consensus={"engineer": {"status": "AGREE", "notes": None}, "architect": {"status": "STRONGLY_AGREE", "notes": None}, "client": {"status": "AGREE", "notes": None}},
            confidence=0.92, is_milestone=True,
            created_at=datetime(2026, 2, 7, 10, 12, 15), updated_at=datetime(2026, 2, 7, 10, 12, 15),
        )
        db.add(item3)

        # Feb 7 PM — from Landscape Design Review (t4/s4)
        item4 = ProjectItem(
            id=uuid.uuid4(), project_id=project1.id,
            transcript_id=t4.id, source_id=s4.id,
            item_type="decision", source_type="meeting",
            decision_statement="Preserve existing trees on site and install green roof on podium",
            statement="Preserve existing trees on site and install green roof on podium",
            who="Gabriela (Project Director)", timestamp="00:08:30",
            discipline="landscape", affected_disciplines=["landscape", "structural"],
            why="Environmental benefits, community requirement, and LEED stormwater credits",
            causation="Community feedback and environmental assessment identified 5 heritage trees",
            impacts={"environment": "Preserve 5 heritage trees", "cost": "+$350K for waterproofing and planting", "certification": "LEED stormwater management points"},
            consensus={"landscape": {"status": "AGREE", "notes": None}, "structural": {"status": "AGREE", "notes": None}, "client": {"status": "AGREE", "notes": None}},
            confidence=0.90,
            created_at=datetime(2026, 2, 7, 15, 8, 30), updated_at=datetime(2026, 2, 7, 15, 8, 30),
        )
        db.add(item4)

        db.flush()
        print(f"  ✓ Created 11 project items (decisions) linked to transcripts/sources (Project 1)")

        # ── V2 mixed item types for Project 1 ──────────────────────────
        # Add non-decision item types: topic, idea, action_item, information
        topic1 = ProjectItem(
            id=uuid.uuid4(), project_id=project1.id,
            transcript_id=t1.id, source_id=s1.id,
            item_type="topic", source_type="meeting",
            decision_statement="Foundation depth requirements for seismic zone 3",
            statement="Foundation depth requirements for seismic zone 3",
            who="Carlos (Structural Engineer)", timestamp="00:15:00",
            discipline="structural", affected_disciplines=["structural", "civil"],
            why="Open discussion about foundation depth needed for seismic performance",
            consensus={}, confidence=0.70,
            created_at=datetime(2026, 2, 6, 9, 15, 0), updated_at=datetime(2026, 2, 6, 9, 15, 0),
        )

        idea1 = ProjectItem(
            id=uuid.uuid4(), project_id=project1.id,
            transcript_id=t2.id, source_id=s2.id,
            item_type="idea", source_type="meeting",
            decision_statement="Consider geothermal heat pump system for ground floors",
            statement="Consider geothermal heat pump system for ground floors",
            who="André (MEP Engineer)", timestamp="00:42:00",
            discipline="mep", affected_disciplines=["mep", "sustainability"],
            why="Could reduce heating costs by 60% for retail podium",
            consensus={}, confidence=0.65,
            created_at=datetime(2026, 2, 6, 14, 42, 0), updated_at=datetime(2026, 2, 6, 14, 42, 0),
        )

        action1 = ProjectItem(
            id=uuid.uuid4(), project_id=project1.id,
            transcript_id=t3.id, source_id=s3.id,
            item_type="action_item", source_type="meeting",
            decision_statement="Prepare electrical load analysis for LED conversion by Feb 14",
            statement="Prepare electrical load analysis for LED conversion by Feb 14",
            who="Miguel (Electrical Engineer)", timestamp="00:20:00",
            discipline="electrical", affected_disciplines=["electrical"],
            why="Need load analysis before finalizing LED system specifications",
            consensus={}, confidence=0.95,
            owner="Miguel (Electrical Engineer)", is_done=False,
            created_at=datetime(2026, 2, 7, 10, 20, 0), updated_at=datetime(2026, 2, 7, 10, 20, 0),
        )

        info1 = ProjectItem(
            id=uuid.uuid4(), project_id=project1.id,
            transcript_id=t4.id, source_id=s4.id,
            item_type="information", source_type="meeting",
            decision_statement="City arborist report confirms 5 heritage trees on site",
            statement="City arborist report confirms 5 heritage trees on site",
            who="Marina (Landscape Architect)", timestamp="00:05:00",
            discipline="landscape", affected_disciplines=["landscape"],
            why="Informational item shared during meeting for team awareness",
            consensus={}, confidence=0.99,
            created_at=datetime(2026, 2, 7, 15, 5, 0), updated_at=datetime(2026, 2, 7, 15, 5, 0),
        )

        db.add_all([topic1, idea1, action1, info1])
        db.flush()
        print(f"  ✓ Created 4 V2 mixed item types (topic, idea, action_item, information)")

        # ── Project Items for Project 2 ─────────────────────────────────

        item5 = ProjectItem(
            id=uuid.uuid4(), project_id=project2.id,
            transcript_id=t5.id, source_id=s5.id,
            item_type="decision", source_type="meeting",
            decision_statement="Use glass and steel curtain wall for iconic facade",
            statement="Use glass and steel curtain wall for iconic facade",
            who="Gabriela (Architect)", timestamp="00:08:20",
            discipline="architecture", affected_disciplines=["architecture"],
            why="Create distinctive building identity and maximize natural light for retail spaces",
            causation="Market analysis shows glass buildings attract 25% more retail tenants",
            impacts={"aesthetics": "Iconic appearance increases property value", "cost": "+$2M material and installation", "maintenance": "Quarterly professional cleaning required"},
            consensus={"engineer": {"status": "AGREE", "notes": None}, "architect": {"status": "STRONGLY_AGREE", "notes": None}, "client": {"status": "STRONGLY_AGREE", "notes": None}},
            confidence=0.96, is_milestone=True,
            created_at=datetime(2026, 2, 5, 11, 8, 20), updated_at=datetime(2026, 2, 5, 11, 8, 20),
        )
        db.add(item5)

        item6 = ProjectItem(
            id=uuid.uuid4(), project_id=project2.id,
            transcript_id=t6.id, source_id=s6.id,
            item_type="decision", source_type="meeting",
            decision_statement="Implement rooftop solar panels and rainwater harvesting",
            statement="Implement rooftop solar panels and rainwater harvesting",
            who="Carlos (Sustainability Engineer)", timestamp="00:22:10",
            discipline="landscape", affected_disciplines=["landscape", "sustainability"],
            why="Generate 30% of building energy and reduce water consumption by 50%",
            causation="Site analysis identified excellent solar exposure and large roof area",
            impacts={"energy": "30% renewable energy generation", "water": "50% reduction in municipal water usage", "roi": "7-year payback period, +30% property value"},
            consensus={"engineer": {"status": "AGREE", "notes": None}, "architect": {"status": "AGREE", "notes": None}, "client": {"status": "STRONGLY_AGREE", "notes": None}},
            confidence=0.90,
            created_at=datetime(2026, 2, 5, 15, 22, 10), updated_at=datetime(2026, 2, 5, 15, 22, 10),
        )
        db.add(item6)

        # V2 mixed types for Project 2
        topic2 = ProjectItem(
            id=uuid.uuid4(), project_id=project2.id,
            transcript_id=t5.id, source_id=s5.id,
            item_type="topic", source_type="meeting",
            decision_statement="Facade maintenance access system options",
            statement="Facade maintenance access system options",
            who="Gabriela (Architect)", timestamp="00:30:00",
            discipline="architecture", affected_disciplines=["architecture"],
            why="Discussion about BMU vs rope access for facade maintenance",
            consensus={}, confidence=0.60,
            created_at=datetime(2026, 2, 5, 11, 30, 0), updated_at=datetime(2026, 2, 5, 11, 30, 0),
        )

        action2 = ProjectItem(
            id=uuid.uuid4(), project_id=project2.id,
            transcript_id=t6.id, source_id=s6.id,
            item_type="action_item", source_type="meeting",
            decision_statement="Get solar panel vendor quotes by Feb 20",
            statement="Get solar panel vendor quotes by Feb 20",
            who="Carlos (Sustainability Engineer)", timestamp="00:30:00",
            discipline="sustainability", affected_disciplines=["sustainability"],
            why="Need vendor quotes for budget approval",
            consensus={}, confidence=0.90,
            owner="Carlos (Sustainability Engineer)", is_done=False,
            created_at=datetime(2026, 2, 5, 15, 30, 0), updated_at=datetime(2026, 2, 5, 15, 30, 0),
        )

        db.add_all([topic2, action2])
        db.flush()
        print(f"  ✓ Created 4 project items (Project 2) incl. V2 types")

        db.commit()
        print(f"  ✓ Committed all data")

        print("✅ Database seeded successfully!")

    except Exception as e:
        db.rollback()
        print(f"❌ Error seeding database: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
