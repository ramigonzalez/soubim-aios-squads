"""Tests for database schema and models.

V2 Migration (Story 5.1): Updated for project_items table (formerly decisions),
plus new Source and ProjectParticipant models.
"""

import pytest
from sqlalchemy import inspect, text
from datetime import datetime
from uuid import uuid4

from app.database.session import engine, SessionLocal
from app.database.models import (
    User, Project, ProjectMember, Transcript,
    ProjectItem, Decision, DecisionRelationship,
    Source, ProjectParticipant, Base,
)
from app.utils.security import hash_password, verify_password


@pytest.fixture
def db_session():
    """Create a test database session."""
    # Create tables
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    yield db
    db.close()
    # Drop tables
    Base.metadata.drop_all(bind=engine)


class TestUserTable:
    """Test users table schema and constraints."""

    def test_user_table_exists(self, db_session):
        """Verify users table exists."""
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        assert "users" in tables

    def test_user_required_columns(self, db_session):
        """Verify all required columns exist."""
        inspector = inspect(engine)
        columns = {col["name"] for col in inspector.get_columns("users")}
        required = {"id", "email", "password_hash", "name", "role", "created_at", "last_login_at", "deleted_at"}
        assert required.issubset(columns)

    def test_user_email_unique(self, db_session):
        """Verify email column is unique."""
        user1 = User(
            email="test@example.com",
            password_hash=hash_password("password"),
            name="Test User",
            role="director",
        )
        user2 = User(
            email="test@example.com",
            password_hash=hash_password("password"),
            name="Another User",
            role="architect",
        )
        db_session.add(user1)
        db_session.commit()
        db_session.add(user2)

        with pytest.raises(Exception):  # IntegrityError
            db_session.commit()

    def test_user_role_constraint(self, db_session):
        """Verify role CHECK constraint works."""
        user = User(
            email="test@example.com",
            password_hash=hash_password("password"),
            name="Test User",
            role="invalid_role",
        )
        db_session.add(user)

        with pytest.raises(Exception):  # IntegrityError
            db_session.commit()

    def test_user_creation_timestamp(self, db_session):
        """Verify created_at is set automatically."""
        user = User(
            email="test@example.com",
            password_hash=hash_password("password"),
            name="Test User",
            role="director",
        )
        db_session.add(user)
        db_session.commit()

        assert user.created_at is not None
        assert isinstance(user.created_at, datetime)

    def test_password_hash_verification(self, db_session):
        """Verify password hashing works correctly."""
        password = "secure_password"
        user = User(
            email="test@example.com",
            password_hash=hash_password(password),
            name="Test User",
            role="director",
        )
        db_session.add(user)
        db_session.commit()

        assert verify_password(password, user.password_hash)
        assert not verify_password("wrong_password", user.password_hash)


class TestProjectTable:
    """Test projects table schema and constraints."""

    def test_project_table_exists(self, db_session):
        """Verify projects table exists."""
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        assert "projects" in tables

    def test_project_required_columns(self, db_session):
        """Verify all required columns exist."""
        inspector = inspect(engine)
        columns = {col["name"] for col in inspector.get_columns("projects")}
        required = {"id", "name", "description", "created_at", "archived_at", "project_type", "actual_stage_id"}
        assert required.issubset(columns)

    def test_project_soft_archive(self, db_session):
        """Verify soft archive functionality."""
        project = Project(
            name="Test Project",
            description="A test project",
        )
        db_session.add(project)
        db_session.commit()

        assert project.archived_at is None

        # Archive project
        project.archived_at = datetime.utcnow()
        db_session.commit()

        # Verify archived
        archived = db_session.query(Project).filter(Project.archived_at.isnot(None)).first()
        assert archived is not None
        assert archived.id == project.id


class TestProjectMembersTable:
    """Test project_members table schema and constraints."""

    def test_project_members_table_exists(self, db_session):
        """Verify project_members table exists."""
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        assert "project_members" in tables

    def test_project_member_foreign_keys(self, db_session):
        """Verify foreign key constraints work."""
        member = ProjectMember(
            project_id=uuid4(),
            user_id=uuid4(),
            role="member",
        )
        db_session.add(member)

        with pytest.raises(Exception):  # IntegrityError
            db_session.commit()

    def test_project_member_creation(self, db_session):
        """Verify project members can be created."""
        user = User(
            email="test@example.com",
            password_hash=hash_password("password"),
            name="Test User",
            role="director",
        )
        project = Project(name="Test Project")

        db_session.add_all([user, project])
        db_session.commit()

        member = ProjectMember(
            project_id=project.id,
            user_id=user.id,
            role="owner",
        )
        db_session.add(member)
        db_session.commit()

        assert member.project_id == project.id
        assert member.user_id == user.id


class TestTranscriptTable:
    """Test transcripts table schema."""

    def test_transcript_table_exists(self, db_session):
        """Verify transcripts table exists."""
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        assert "transcripts" in tables

    def test_transcript_jsonb_participants(self, db_session):
        """Verify JSONB participants column works."""
        project = Project(name="Test Project")
        db_session.add(project)
        db_session.commit()

        participants = [
            {"name": "Gabriela", "email": "gabriela@soubim.com", "role": "director"},
            {"name": "Carlos", "email": "carlos@mep.com", "role": "architect"},
        ]

        transcript = Transcript(
            project_id=project.id,
            meeting_id="meet_123",
            meeting_type="multi-disciplinary",
            participants=participants,
            transcript_text="Meeting transcript...",
            meeting_date=datetime.utcnow(),
        )
        db_session.add(transcript)
        db_session.commit()

        retrieved = db_session.query(Transcript).first()
        assert retrieved.participants == participants


class TestProjectItemsTable:
    """Test project_items table schema (V2, formerly decisions)."""

    def test_project_items_table_exists(self, db_session):
        """Verify project_items table exists (V2 renamed from decisions)."""
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        assert "project_items" in tables

    def test_project_item_required_columns(self, db_session):
        """Verify all required columns exist including V2 additions."""
        inspector = inspect(engine)
        columns = {col["name"] for col in inspector.get_columns("project_items")}
        # V1 columns
        v1_required = {
            "id", "project_id", "transcript_id",
            "decision_statement", "who", "timestamp", "discipline",
            "why", "causation", "impacts", "consensus",
            "confidence", "similar_decisions", "consistency_notes", "anomaly_flags",
            "embedding", "created_at", "updated_at"
        }
        # V2 new columns
        v2_required = {
            "item_type", "source_type", "is_milestone", "is_done",
            "affected_disciplines", "owner", "source_id", "source_excerpt",
            "statement",
        }
        assert v1_required.issubset(columns), f"Missing V1 columns: {v1_required - columns}"
        assert v2_required.issubset(columns), f"Missing V2 columns: {v2_required - columns}"

    def test_decision_alias_works(self, db_session):
        """Verify Decision alias still works (backward compatibility)."""
        assert Decision is ProjectItem

    def test_project_item_confidence_constraint(self, db_session):
        """Verify confidence CHECK constraint (0-1)."""
        project = Project(name="Test Project")
        db_session.add(project)
        db_session.commit()

        item = ProjectItem(
            project_id=project.id,
            decision_statement="Test decision",
            who="Test User",
            timestamp="00:00:00",
            discipline="architecture",
            why="Test reasoning",
            consensus={"architecture": "AGREE"},
            confidence=1.5,  # Invalid!
        )
        db_session.add(item)

        with pytest.raises(Exception):  # IntegrityError
            db_session.commit()

    def test_project_item_v2_defaults(self, db_session):
        """Verify V2 columns have correct defaults."""
        project = Project(name="Test Project")
        db_session.add(project)
        db_session.commit()

        item = ProjectItem(
            project_id=project.id,
            decision_statement="Test decision",
            who="Test User",
            timestamp="00:00:00",
            discipline="architecture",
            why="Test reasoning",
            consensus={"architecture": "AGREE"},
            confidence=0.85,
        )
        db_session.add(item)
        db_session.commit()

        retrieved = db_session.query(ProjectItem).first()
        assert retrieved.item_type == "decision"
        assert retrieved.source_type == "meeting"
        assert retrieved.is_milestone is False
        assert retrieved.is_done is False
        assert retrieved.affected_disciplines == []
        assert retrieved.owner is None
        assert retrieved.source_id is None

    def test_project_item_with_v2_fields(self, db_session):
        """Verify V2 fields can be set explicitly."""
        project = Project(name="Test Project")
        db_session.add(project)
        db_session.commit()

        item = ProjectItem(
            project_id=project.id,
            item_type="action_item",
            source_type="meeting",
            decision_statement="Prepare load analysis by Feb 14",
            statement="Prepare load analysis by Feb 14",
            who="Miguel",
            timestamp="00:20:00",
            discipline="electrical",
            affected_disciplines=["electrical", "mep"],
            why="Need analysis before finalizing specs",
            consensus={},
            owner="Miguel",
            is_done=False,
            is_milestone=False,
        )
        db_session.add(item)
        db_session.commit()

        retrieved = db_session.query(ProjectItem).first()
        assert retrieved.item_type == "action_item"
        assert retrieved.affected_disciplines == ["electrical", "mep"]
        assert retrieved.owner == "Miguel"
        assert retrieved.statement == "Prepare load analysis by Feb 14"

    def test_decision_vector_embedding(self, db_session):
        """Verify pgvector embedding column (384-dim)."""
        project = Project(name="Test Project")
        db_session.add(project)
        db_session.commit()

        embedding = [0.1] * 384

        item = ProjectItem(
            project_id=project.id,
            decision_statement="Test decision",
            who="Test User",
            timestamp="00:00:00",
            discipline="architecture",
            why="Test reasoning",
            consensus={"architecture": "AGREE"},
            confidence=0.95,
            embedding=embedding,
        )
        db_session.add(item)
        db_session.commit()

        retrieved = db_session.query(ProjectItem).first()
        assert retrieved.embedding is not None


class TestSourcesTable:
    """Test sources table schema (V2)."""

    def test_sources_table_exists(self, db_session):
        """Verify sources table exists."""
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        assert "sources" in tables

    def test_source_required_columns(self, db_session):
        """Verify all source columns exist."""
        inspector = inspect(engine)
        columns = {col["name"] for col in inspector.get_columns("sources")}
        required = {
            "id", "project_id", "source_type", "title", "occurred_at",
            "ingestion_status", "ai_summary", "approved_by", "approved_at",
            "raw_content", "meeting_type", "participants", "duration_minutes",
            "webhook_id", "email_from", "email_to", "email_cc", "email_thread_id",
            "file_url", "file_type", "file_size", "drive_folder_id",
            "created_at", "updated_at",
        }
        assert required.issubset(columns), f"Missing columns: {required - columns}"

    def test_source_creation(self, db_session):
        """Verify source records can be created."""
        project = Project(name="Test Project")
        db_session.add(project)
        db_session.commit()

        source = Source(
            project_id=project.id,
            source_type="meeting",
            title="Test Meeting",
            occurred_at=datetime.utcnow(),
            ingestion_status="processed",
            meeting_type="Design Review",
            participants=[{"name": "Carlos", "role": "Engineer"}],
            duration_minutes=45,
        )
        db_session.add(source)
        db_session.commit()

        retrieved = db_session.query(Source).first()
        assert retrieved.source_type == "meeting"
        assert retrieved.ingestion_status == "processed"
        assert retrieved.duration_minutes == 45

    def test_source_project_item_relationship(self, db_session):
        """Verify source → project_items relationship works."""
        project = Project(name="Test Project")
        db_session.add(project)
        db_session.commit()

        source = Source(
            project_id=project.id,
            source_type="meeting",
            title="Test Meeting",
            occurred_at=datetime.utcnow(),
            meeting_type="Design Review",
        )
        db_session.add(source)
        db_session.commit()

        item = ProjectItem(
            project_id=project.id,
            source_id=source.id,
            decision_statement="Test decision",
            who="Test User",
            timestamp="00:00:00",
            discipline="architecture",
            why="Test",
            consensus={},
        )
        db_session.add(item)
        db_session.commit()

        assert item.source_id == source.id


class TestProjectParticipantsTable:
    """Test project_participants table schema (V2)."""

    def test_participants_table_exists(self, db_session):
        """Verify project_participants table exists."""
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        assert "project_participants" in tables

    def test_participant_required_columns(self, db_session):
        """Verify all participant columns exist."""
        inspector = inspect(engine)
        columns = {col["name"] for col in inspector.get_columns("project_participants")}
        required = {"id", "project_id", "name", "email", "discipline", "role", "created_at", "updated_at"}
        assert required.issubset(columns)

    def test_participant_creation(self, db_session):
        """Verify participant records can be created."""
        project = Project(name="Test Project")
        db_session.add(project)
        db_session.commit()

        participant = ProjectParticipant(
            project_id=project.id,
            name="Carlos",
            email="carlos@mep.com",
            discipline="structural",
            role="Structural Engineer",
        )
        db_session.add(participant)
        db_session.commit()

        retrieved = db_session.query(ProjectParticipant).first()
        assert retrieved.name == "Carlos"
        assert retrieved.discipline == "structural"


class TestDecisionRelationshipsTable:
    """Test decision_relationships table schema."""

    def test_decision_relationships_table_exists(self, db_session):
        """Verify decision_relationships table exists."""
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        assert "decision_relationships" in tables

    def test_decision_relationship_creation(self, db_session):
        """Verify decision relationships can be created."""
        project = Project(name="Test Project")
        db_session.add(project)
        db_session.commit()

        item1 = ProjectItem(
            project_id=project.id,
            decision_statement="Decision 1",
            who="Test User",
            timestamp="00:00:00",
            discipline="architecture",
            why="Test reasoning",
            consensus={"architecture": "AGREE"},
        )
        item2 = ProjectItem(
            project_id=project.id,
            decision_statement="Decision 2",
            who="Test User",
            timestamp="00:05:00",
            discipline="mep",
            why="Test reasoning",
            consensus={"mep": "AGREE"},
        )
        db_session.add_all([item1, item2])
        db_session.commit()

        relationship = DecisionRelationship(
            from_decision_id=item1.id,
            to_decision_id=item2.id,
            relationship_type="triggered",
        )
        db_session.add(relationship)
        db_session.commit()

        retrieved = db_session.query(DecisionRelationship).first()
        assert retrieved.from_decision_id == item1.id
        assert retrieved.to_decision_id == item2.id


class TestIndexes:
    """Test that all indexes are created correctly."""

    def test_user_indexes_exist(self, db_session):
        """Verify user indexes exist."""
        inspector = inspect(engine)
        indexes = {idx["name"] for idx in inspector.get_indexes("users")}
        expected = {"idx_users_email", "idx_users_role", "idx_users_deleted"}
        assert expected.issubset(indexes)

    def test_project_indexes_exist(self, db_session):
        """Verify project indexes exist."""
        inspector = inspect(engine)
        indexes = {idx["name"] for idx in inspector.get_indexes("projects")}
        expected = {"idx_projects_created", "idx_projects_archived"}
        assert expected.issubset(indexes)

    def test_project_item_indexes_exist(self, db_session):
        """Verify project_items indexes exist (V2 renamed from decisions)."""
        inspector = inspect(engine)
        indexes = {idx["name"] for idx in inspector.get_indexes("project_items")}
        expected = {
            "idx_project_items_project",
            "idx_project_items_discipline",
            "idx_project_items_confidence",
            "idx_project_items_created",
            "idx_project_items_composite",
            # V2 new indexes
            "idx_project_items_type",
            "idx_project_items_source_type",
            "idx_project_items_source",
        }
        assert expected.issubset(indexes), f"Missing indexes: {expected - indexes}"

    def test_source_indexes_exist(self, db_session):
        """Verify sources indexes exist."""
        inspector = inspect(engine)
        indexes = {idx["name"] for idx in inspector.get_indexes("sources")}
        expected = {
            "idx_sources_project",
            "idx_sources_status",
            "idx_sources_type",
            "idx_sources_occurred",
        }
        assert expected.issubset(indexes), f"Missing indexes: {expected - indexes}"

    def test_participant_indexes_exist(self, db_session):
        """Verify project_participants indexes exist."""
        inspector = inspect(engine)
        indexes = {idx["name"] for idx in inspector.get_indexes("project_participants")}
        expected = {"idx_participants_project"}
        assert expected.issubset(indexes), f"Missing indexes: {expected - indexes}"


class TestSoftDelete:
    """Test soft delete functionality."""

    def test_soft_delete_query(self, db_session):
        """Verify soft delete WHERE clause works."""
        user1 = User(
            email="active@example.com",
            password_hash=hash_password("password"),
            name="Active User",
            role="director",
        )
        user2 = User(
            email="deleted@example.com",
            password_hash=hash_password("password"),
            name="Deleted User",
            role="director",
            deleted_at=datetime.utcnow(),
        )
        db_session.add_all([user1, user2])
        db_session.commit()

        active_users = db_session.query(User).filter(User.deleted_at.is_(None)).all()
        assert len(active_users) == 1
        assert active_users[0].email == "active@example.com"


class TestForeignKeyConstraints:
    """Test foreign key relationships."""

    def test_cascade_delete_project_members(self, db_session):
        """Verify deleting project deletes members."""
        user = User(
            email="test@example.com",
            password_hash=hash_password("password"),
            name="Test User",
            role="director",
        )
        project = Project(name="Test Project")
        db_session.add_all([user, project])
        db_session.commit()

        member = ProjectMember(
            project_id=project.id,
            user_id=user.id,
            role="owner",
        )
        db_session.add(member)
        db_session.commit()

        db_session.delete(project)
        db_session.commit()

        members = db_session.query(ProjectMember).all()
        assert len(members) == 0

    def test_cascade_delete_project_items(self, db_session):
        """Verify deleting project deletes project items."""
        project = Project(name="Test Project")
        db_session.add(project)
        db_session.commit()

        item = ProjectItem(
            project_id=project.id,
            decision_statement="Test decision",
            who="Test User",
            timestamp="00:00:00",
            discipline="architecture",
            why="Test reasoning",
            consensus={"architecture": "AGREE"},
        )
        db_session.add(item)
        db_session.commit()

        db_session.delete(project)
        db_session.commit()

        items = db_session.query(ProjectItem).all()
        assert len(items) == 0

    def test_cascade_delete_sources(self, db_session):
        """Verify deleting project deletes sources."""
        project = Project(name="Test Project")
        db_session.add(project)
        db_session.commit()

        source = Source(
            project_id=project.id,
            source_type="meeting",
            title="Test Meeting",
            occurred_at=datetime.utcnow(),
            meeting_type="Design Review",
        )
        db_session.add(source)
        db_session.commit()

        db_session.delete(project)
        db_session.commit()

        sources = db_session.query(Source).all()
        assert len(sources) == 0

    def test_cascade_delete_participants(self, db_session):
        """Verify deleting project deletes participants."""
        project = Project(name="Test Project")
        db_session.add(project)
        db_session.commit()

        participant = ProjectParticipant(
            project_id=project.id,
            name="Carlos",
            discipline="structural",
        )
        db_session.add(participant)
        db_session.commit()

        db_session.delete(project)
        db_session.commit()

        participants = db_session.query(ProjectParticipant).all()
        assert len(participants) == 0
