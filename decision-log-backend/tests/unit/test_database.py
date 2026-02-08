"""Tests for database schema and models."""

import pytest
from sqlalchemy import inspect, text
from datetime import datetime
from uuid import uuid4

from app.database.session import engine, SessionLocal
from app.database.models import User, Project, ProjectMember, Transcript, Decision, DecisionRelationship, Base
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
        required = {"id", "name", "description", "created_at", "archived_at"}
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
        # Should fail without valid project_id and user_id
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


class TestDecisionsTable:
    """Test decisions table schema and pgvector."""

    def test_decisions_table_exists(self, db_session):
        """Verify decisions table exists."""
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        assert "decisions" in tables

    def test_decision_required_columns(self, db_session):
        """Verify all required columns exist."""
        inspector = inspect(engine)
        columns = {col["name"] for col in inspector.get_columns("decisions")}
        required = {
            "id", "project_id", "transcript_id",
            "decision_statement", "who", "timestamp", "discipline",
            "why", "causation", "impacts", "consensus",
            "confidence", "similar_decisions", "consistency_notes", "anomaly_flags",
            "embedding", "created_at", "updated_at"
        }
        assert required.issubset(columns)

    def test_decision_confidence_constraint(self, db_session):
        """Verify confidence CHECK constraint (0-1)."""
        project = Project(name="Test Project")
        db_session.add(project)
        db_session.commit()

        # Invalid: confidence = 1.5
        decision = Decision(
            project_id=project.id,
            decision_statement="Test decision",
            who="Test User",
            timestamp="00:00:00",
            discipline="architecture",
            why="Test reasoning",
            consensus={"architecture": "AGREE"},
            confidence=1.5,  # Invalid!
        )
        db_session.add(decision)

        with pytest.raises(Exception):  # IntegrityError
            db_session.commit()

    def test_decision_vector_embedding(self, db_session):
        """Verify pgvector embedding column (384-dim)."""
        project = Project(name="Test Project")
        db_session.add(project)
        db_session.commit()

        # Create mock 384-dimensional vector
        embedding = [0.1] * 384

        decision = Decision(
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
        db_session.add(decision)
        db_session.commit()

        retrieved = db_session.query(Decision).first()
        assert retrieved.embedding is not None
        # Note: pgvector stores as list


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

        decision1 = Decision(
            project_id=project.id,
            decision_statement="Decision 1",
            who="Test User",
            timestamp="00:00:00",
            discipline="architecture",
            why="Test reasoning",
            consensus={"architecture": "AGREE"},
        )
        decision2 = Decision(
            project_id=project.id,
            decision_statement="Decision 2",
            who="Test User",
            timestamp="00:05:00",
            discipline="mep",
            why="Test reasoning",
            consensus={"mep": "AGREE"},
        )
        db_session.add_all([decision1, decision2])
        db_session.commit()

        relationship = DecisionRelationship(
            from_decision_id=decision1.id,
            to_decision_id=decision2.id,
            relationship_type="triggered",
        )
        db_session.add(relationship)
        db_session.commit()

        retrieved = db_session.query(DecisionRelationship).first()
        assert retrieved.from_decision_id == decision1.id
        assert retrieved.to_decision_id == decision2.id


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

    def test_decision_indexes_exist(self, db_session):
        """Verify decision indexes exist."""
        inspector = inspect(engine)
        indexes = {idx["name"] for idx in inspector.get_indexes("decisions")}
        expected = {
            "idx_decisions_project",
            "idx_decisions_discipline",
            "idx_decisions_confidence",
            "idx_decisions_created",
            "idx_decisions_composite",
        }
        assert expected.issubset(indexes)


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

        # Query only non-deleted users
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

        # Delete project
        db_session.delete(project)
        db_session.commit()

        # Verify member is deleted
        members = db_session.query(ProjectMember).all()
        assert len(members) == 0

    def test_cascade_delete_decisions(self, db_session):
        """Verify deleting project deletes decisions."""
        project = Project(name="Test Project")
        db_session.add(project)
        db_session.commit()

        decision = Decision(
            project_id=project.id,
            decision_statement="Test decision",
            who="Test User",
            timestamp="00:00:00",
            discipline="architecture",
            why="Test reasoning",
            consensus={"architecture": "AGREE"},
        )
        db_session.add(decision)
        db_session.commit()

        # Delete project
        db_session.delete(project)
        db_session.commit()

        # Verify decision is deleted
        decisions = db_session.query(Decision).all()
        assert len(decisions) == 0
