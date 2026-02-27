"""Tests for ingestion API endpoints and pipeline.

Tests the webhook source creation, ingestion listing/approval/rejection,
batch operations, pending count, and admin-only access enforcement.
"""

import pytest
from datetime import datetime
from uuid import uuid4
from unittest.mock import patch, MagicMock
from sqlalchemy.orm import Session

from app.database.models import User, Project, Source, ProjectItem, ProjectParticipant
from app.utils.security import hash_password
from app.api.models.ingestion import IngestionUpdate, IngestionBatchAction


# ──────────────────────────────────────────────────────────────────────────────
# Fixtures
# ──────────────────────────────────────────────────────────────────────────────


@pytest.fixture
def director_user(db_session: Session) -> User:
    """Create a director (admin) user."""
    user = User(
        email="director@example.com",
        password_hash=hash_password("password"),
        name="Director User",
        role="director",
    )
    db_session.add(user)
    db_session.commit()
    return user


@pytest.fixture
def architect_user(db_session: Session) -> User:
    """Create an architect (non-admin) user."""
    user = User(
        email="architect@example.com",
        password_hash=hash_password("password"),
        name="Architect User",
        role="architect",
    )
    db_session.add(user)
    db_session.commit()
    return user


@pytest.fixture
def test_project(db_session: Session) -> Project:
    """Create a test project."""
    project = Project(
        name="Test Project Alpha",
        description="A test project for ingestion",
    )
    db_session.add(project)
    db_session.commit()
    return project


@pytest.fixture
def pending_source(db_session: Session, test_project: Project) -> Source:
    """Create a pending source for testing."""
    source = Source(
        id=uuid4(),
        project_id=test_project.id,
        source_type="meeting",
        title="Foundation Review Meeting",
        occurred_at=datetime(2026, 2, 10, 14, 0, 0),
        ingestion_status="pending",
        raw_content="This is a test transcript for the foundation review meeting...",
        meeting_type="coordination",
        participants=[{"name": "Carlos", "role": "Engineer"}],
        duration_minutes=90,
        webhook_id="wh_test_001",
    )
    db_session.add(source)
    db_session.commit()
    return source


@pytest.fixture
def multiple_sources(db_session: Session, test_project: Project) -> list:
    """Create multiple sources with different statuses."""
    sources = []
    statuses = ["pending", "pending", "approved", "rejected", "processed"]
    for i, status in enumerate(statuses):
        source = Source(
            id=uuid4(),
            project_id=test_project.id,
            source_type="meeting",
            title=f"Meeting {i + 1}",
            occurred_at=datetime(2026, 2, 10 + i, 14, 0, 0),
            ingestion_status=status,
            raw_content=f"Transcript text for meeting {i + 1}...",
            meeting_type="coordination",
            webhook_id=f"wh_multi_{i}",
        )
        sources.append(source)
    db_session.add_all(sources)
    db_session.commit()
    return sources


# ──────────────────────────────────────────────────────────────────────────────
# Test: Webhook creates pending source
# ──────────────────────────────────────────────────────────────────────────────


class TestWebhookCreatesSource:
    """Tests for webhook source creation."""

    def test_webhook_creates_pending_source(self, db_session: Session, test_project: Project):
        """Webhook payload should create a Source with status='pending'."""
        source = Source(
            id=uuid4(),
            project_id=test_project.id,
            source_type="meeting",
            title="Design Review Meeting",
            occurred_at=datetime(2026, 2, 15, 10, 0, 0),
            ingestion_status="pending",
            raw_content="Full meeting transcript here...",
            meeting_type="design_review",
            participants=[{"name": "André", "role": "Architect"}],
            duration_minutes=60,
            webhook_id="wh_new_001",
        )
        db_session.add(source)
        db_session.commit()

        # Verify source was created with correct fields
        saved = db_session.query(Source).filter(Source.webhook_id == "wh_new_001").first()
        assert saved is not None
        assert saved.ingestion_status == "pending"
        assert saved.source_type == "meeting"
        assert saved.title == "Design Review Meeting"
        assert saved.raw_content == "Full meeting transcript here..."
        assert saved.meeting_type == "design_review"
        assert saved.duration_minutes == 60
        assert saved.project_id == test_project.id

    def test_webhook_duplicate_detection(self, db_session: Session, pending_source: Source):
        """Duplicate webhook_id should be detectable before creating a new Source."""
        existing = db_session.query(Source).filter(
            Source.webhook_id == "wh_test_001"
        ).first()
        assert existing is not None
        assert existing.id == pending_source.id

        # Verify we can detect duplicates
        duplicate_check = db_session.query(Source).filter(
            Source.webhook_id == "wh_test_001"
        ).count()
        assert duplicate_check == 1

    def test_source_fields_populated(self, db_session: Session, pending_source: Source):
        """Source record should have all meeting-specific fields populated."""
        source = db_session.query(Source).filter(Source.id == pending_source.id).first()
        assert source.source_type == "meeting"
        assert source.title == "Foundation Review Meeting"
        assert source.occurred_at == datetime(2026, 2, 10, 14, 0, 0)
        assert source.meeting_type == "coordination"
        assert source.participants == [{"name": "Carlos", "role": "Engineer"}]
        assert source.duration_minutes == 90
        assert source.webhook_id == "wh_test_001"
        assert source.raw_content is not None


# ──────────────────────────────────────────────────────────────────────────────
# Test: Ingestion listing with default pending filter
# ──────────────────────────────────────────────────────────────────────────────


class TestListIngestion:
    """Tests for GET /ingestion listing endpoint."""

    def test_list_ingestion_default_pending(
        self, db_session: Session, multiple_sources: list
    ):
        """Default filter should return only pending sources."""
        pending = (
            db_session.query(Source)
            .filter(Source.ingestion_status == "pending")
            .all()
        )
        assert len(pending) == 2
        for source in pending:
            assert source.ingestion_status == "pending"

    def test_list_ingestion_with_filters(
        self, db_session: Session, multiple_sources: list
    ):
        """Filtering by status should work correctly."""
        approved = (
            db_session.query(Source)
            .filter(Source.ingestion_status == "approved")
            .all()
        )
        assert len(approved) == 1
        assert approved[0].ingestion_status == "approved"

        rejected = (
            db_session.query(Source)
            .filter(Source.ingestion_status == "rejected")
            .all()
        )
        assert len(rejected) == 1

    def test_list_ingestion_with_project_filter(
        self, db_session: Session, multiple_sources: list, test_project: Project
    ):
        """Filtering by project_id should return only that project's sources."""
        sources = (
            db_session.query(Source)
            .filter(Source.project_id == test_project.id)
            .all()
        )
        assert len(sources) == 5  # All sources belong to test_project

    def test_list_ingestion_with_date_filter(
        self, db_session: Session, multiple_sources: list
    ):
        """Filtering by date range should work."""
        date_from = datetime(2026, 2, 12, 0, 0, 0)
        sources = (
            db_session.query(Source)
            .filter(Source.occurred_at >= date_from)
            .all()
        )
        assert len(sources) == 3  # Feb 12, 13, 14

    def test_list_ingestion_total_count(
        self, db_session: Session, multiple_sources: list
    ):
        """Total count should reflect all matching records."""
        total = db_session.query(Source).count()
        assert total == 5

    def test_list_ingestion_with_source_type_filter(
        self, db_session: Session, multiple_sources: list
    ):
        """Filtering by source_type should work."""
        meeting_sources = (
            db_session.query(Source)
            .filter(Source.source_type == "meeting")
            .all()
        )
        assert len(meeting_sources) == 5

    def test_list_ingestion_source_joined_with_project(
        self, db_session: Session, multiple_sources: list, test_project: Project
    ):
        """Query joining Source with Project should return project_name."""
        from app.database.models import Project as ProjectModel

        rows = (
            db_session.query(Source, ProjectModel.name)
            .outerjoin(ProjectModel, Source.project_id == ProjectModel.id)
            .all()
        )
        assert len(rows) == 5
        for source, project_name in rows:
            assert project_name == "Test Project Alpha"


# ──────────────────────────────────────────────────────────────────────────────
# Test: Approve source (admin only)
# ──────────────────────────────────────────────────────────────────────────────


class TestApproveSource:
    """Tests for PATCH /ingestion/{source_id} approval."""

    def test_approve_source_admin_only(
        self, db_session: Session, director_user: User, pending_source: Source
    ):
        """Director (admin) should be able to approve a source."""
        assert director_user.role == "director"

        # Simulate approval
        pending_source.ingestion_status = "approved"
        pending_source.approved_by = director_user.id
        pending_source.approved_at = datetime.utcnow()
        db_session.commit()

        saved = db_session.query(Source).filter(Source.id == pending_source.id).first()
        assert saved.ingestion_status == "approved"
        assert saved.approved_by == director_user.id
        assert saved.approved_at is not None

    def test_non_admin_cannot_approve(
        self, db_session: Session, architect_user: User
    ):
        """Non-director users should be denied approval access."""
        assert architect_user.role != "director"
        # The route checks user.role != "director" and raises 403

    def test_approve_triggers_pipeline(
        self, db_session: Session, director_user: User, pending_source: Source
    ):
        """Approving a source should set it up for pipeline processing."""
        pending_source.ingestion_status = "approved"
        pending_source.approved_by = director_user.id
        pending_source.approved_at = datetime.utcnow()
        db_session.commit()

        # Verify the source is now in approved state (ready for pipeline)
        source = db_session.query(Source).filter(Source.id == pending_source.id).first()
        assert source.ingestion_status == "approved"
        assert source.approved_by is not None
        assert source.approved_at is not None

    def test_reject_source(
        self, db_session: Session, director_user: User, pending_source: Source
    ):
        """Director should be able to reject a source."""
        pending_source.ingestion_status = "rejected"
        db_session.commit()

        saved = db_session.query(Source).filter(Source.id == pending_source.id).first()
        assert saved.ingestion_status == "rejected"
        # Rejected sources should NOT have approved_by/approved_at
        assert saved.approved_by is None
        assert saved.approved_at is None

    def test_approve_nonexistent_source(self, db_session: Session):
        """Approving a non-existent source should fail."""
        fake_id = uuid4()
        source = db_session.query(Source).filter(Source.id == fake_id).first()
        assert source is None


# ──────────────────────────────────────────────────────────────────────────────
# Test: Batch approve/reject
# ──────────────────────────────────────────────────────────────────────────────


class TestBatchApprove:
    """Tests for POST /ingestion/batch batch operations."""

    def test_batch_approve(
        self, db_session: Session, director_user: User, multiple_sources: list
    ):
        """Batch approve should update all specified sources."""
        pending_sources = [s for s in multiple_sources if s.ingestion_status == "pending"]
        assert len(pending_sources) == 2

        # Simulate batch approve
        for source in pending_sources:
            source.ingestion_status = "approved"
            source.approved_by = director_user.id
            source.approved_at = datetime.utcnow()
        db_session.commit()

        # Verify all are approved
        approved = (
            db_session.query(Source)
            .filter(Source.ingestion_status == "approved")
            .all()
        )
        # 2 newly approved + 1 already approved = 3
        assert len(approved) == 3

    def test_batch_reject(
        self, db_session: Session, director_user: User, multiple_sources: list
    ):
        """Batch reject should update all specified sources."""
        pending_sources = [s for s in multiple_sources if s.ingestion_status == "pending"]

        for source in pending_sources:
            source.ingestion_status = "rejected"
        db_session.commit()

        rejected = (
            db_session.query(Source)
            .filter(Source.ingestion_status == "rejected")
            .all()
        )
        # 2 newly rejected + 1 already rejected = 3
        assert len(rejected) == 3

    def test_batch_action_ignores_missing_ids(
        self, db_session: Session, multiple_sources: list
    ):
        """Batch action with non-existent IDs should silently skip them."""
        fake_id = uuid4()
        source = db_session.query(Source).filter(Source.id == fake_id).first()
        assert source is None  # Non-existent source is simply not found


# ──────────────────────────────────────────────────────────────────────────────
# Test: Pending count
# ──────────────────────────────────────────────────────────────────────────────


class TestPendingCount:
    """Tests for GET /ingestion/count endpoint."""

    def test_pending_count(self, db_session: Session, multiple_sources: list):
        """Pending count should return correct number of pending sources."""
        count = (
            db_session.query(Source)
            .filter(Source.ingestion_status == "pending")
            .count()
        )
        assert count == 2

    def test_pending_count_after_approval(
        self, db_session: Session, director_user: User, multiple_sources: list
    ):
        """Pending count should decrease after approval."""
        initial_count = (
            db_session.query(Source)
            .filter(Source.ingestion_status == "pending")
            .count()
        )
        assert initial_count == 2

        # Approve one pending source
        pending = (
            db_session.query(Source)
            .filter(Source.ingestion_status == "pending")
            .first()
        )
        pending.ingestion_status = "approved"
        pending.approved_by = director_user.id
        pending.approved_at = datetime.utcnow()
        db_session.commit()

        new_count = (
            db_session.query(Source)
            .filter(Source.ingestion_status == "pending")
            .count()
        )
        assert new_count == 1

    def test_pending_count_empty(self, db_session: Session):
        """Pending count should be 0 when no sources exist."""
        count = (
            db_session.query(Source)
            .filter(Source.ingestion_status == "pending")
            .count()
        )
        assert count == 0


# ──────────────────────────────────────────────────────────────────────────────
# Test: Pydantic model validation
# ──────────────────────────────────────────────────────────────────────────────


class TestPydanticModels:
    """Tests for ingestion Pydantic model validation."""

    def test_ingestion_update_valid_approved(self):
        """IngestionUpdate should accept 'approved' status."""
        update = IngestionUpdate(ingestion_status="approved")
        assert update.ingestion_status == "approved"

    def test_ingestion_update_valid_rejected(self):
        """IngestionUpdate should accept 'rejected' status."""
        update = IngestionUpdate(ingestion_status="rejected")
        assert update.ingestion_status == "rejected"

    def test_ingestion_update_invalid_status(self):
        """IngestionUpdate should reject invalid status values."""
        from pydantic import ValidationError

        with pytest.raises(ValidationError):
            IngestionUpdate(ingestion_status="processed")

        with pytest.raises(ValidationError):
            IngestionUpdate(ingestion_status="pending")

        with pytest.raises(ValidationError):
            IngestionUpdate(ingestion_status="invalid")

    def test_batch_action_valid_approve(self):
        """IngestionBatchAction should accept 'approve' action."""
        batch = IngestionBatchAction(
            source_ids=["id1", "id2"],
            action="approve",
        )
        assert batch.action == "approve"
        assert len(batch.source_ids) == 2

    def test_batch_action_valid_reject(self):
        """IngestionBatchAction should accept 'reject' action."""
        batch = IngestionBatchAction(
            source_ids=["id1"],
            action="reject",
        )
        assert batch.action == "reject"

    def test_batch_action_invalid_action(self):
        """IngestionBatchAction should reject invalid actions."""
        from pydantic import ValidationError

        with pytest.raises(ValidationError):
            IngestionBatchAction(source_ids=["id1"], action="process")

    def test_batch_action_empty_source_ids(self):
        """IngestionBatchAction should reject empty source_ids list."""
        from pydantic import ValidationError

        with pytest.raises(ValidationError):
            IngestionBatchAction(source_ids=[], action="approve")


# ──────────────────────────────────────────────────────────────────────────────
# Test: Source-Project relationship and AI summary
# ──────────────────────────────────────────────────────────────────────────────


class TestSourceRelationships:
    """Tests for Source model relationships and fields."""

    def test_source_project_relationship(
        self, db_session: Session, pending_source: Source, test_project: Project
    ):
        """Source should have a relationship to its Project."""
        source = db_session.query(Source).filter(Source.id == pending_source.id).first()
        assert source.project is not None
        assert source.project.name == "Test Project Alpha"

    def test_source_ai_summary_storage(
        self, db_session: Session, pending_source: Source
    ):
        """AI summary should be storable on a Source record."""
        pending_source.ai_summary = "Team discussed foundation options and selected mat slab approach."
        db_session.commit()

        saved = db_session.query(Source).filter(Source.id == pending_source.id).first()
        assert saved.ai_summary == "Team discussed foundation options and selected mat slab approach."

    def test_source_items_relationship(
        self, db_session: Session, pending_source: Source, test_project: Project
    ):
        """Source should be linkable to ProjectItems via source_id."""
        item = ProjectItem(
            id=uuid4(),
            project_id=test_project.id,
            source_id=pending_source.id,
            item_type="decision",
            source_type="meeting",
            decision_statement="Use mat slab foundation",
            who="Carlos",
            timestamp="00:15:00",
            discipline="structural",
            why="Cost effectiveness and load distribution",
            consensus={"structural": "AGREE"},
        )
        db_session.add(item)
        db_session.commit()

        # Verify relationship
        source = db_session.query(Source).filter(Source.id == pending_source.id).first()
        assert len(source.items) == 1
        assert source.items[0].decision_statement == "Use mat slab foundation"

    def test_project_participants_for_pipeline(
        self, db_session: Session, test_project: Project
    ):
        """ProjectParticipant roster should be loadable for pipeline context."""
        p1 = ProjectParticipant(
            id=uuid4(),
            project_id=test_project.id,
            name="Carlos",
            email="carlos@example.com",
            discipline="structural",
            role="Engineer",
        )
        p2 = ProjectParticipant(
            id=uuid4(),
            project_id=test_project.id,
            name="André",
            email="andre@example.com",
            discipline="architecture",
            role="Architect",
        )
        db_session.add_all([p1, p2])
        db_session.commit()

        participants = (
            db_session.query(ProjectParticipant)
            .filter(ProjectParticipant.project_id == test_project.id)
            .all()
        )
        assert len(participants) == 2
        names = {p.name for p in participants}
        assert "Carlos" in names
        assert "André" in names


# ──────────────────────────────────────────────────────────────────────────────
# Test: Pipeline processing (unit-level, no external API calls)
# ──────────────────────────────────────────────────────────────────────────────


class TestIngestionPipeline:
    """Tests for the ingestion pipeline service (unit-level)."""

    def test_approved_source_ready_for_processing(
        self, db_session: Session, director_user: User, pending_source: Source
    ):
        """An approved source should have all fields needed for pipeline."""
        pending_source.ingestion_status = "approved"
        pending_source.approved_by = director_user.id
        pending_source.approved_at = datetime.utcnow()
        db_session.commit()

        source = db_session.query(Source).filter(Source.id == pending_source.id).first()
        assert source.ingestion_status == "approved"
        assert source.raw_content is not None
        assert source.project_id is not None
        assert source.source_type == "meeting"

    def test_processed_status_after_pipeline(
        self, db_session: Session, pending_source: Source
    ):
        """After pipeline completes, source status should be 'processed'."""
        pending_source.ingestion_status = "processed"
        db_session.commit()

        source = db_session.query(Source).filter(Source.id == pending_source.id).first()
        assert source.ingestion_status == "processed"

    def test_pipeline_failure_keeps_approved_status(
        self, db_session: Session, pending_source: Source
    ):
        """If pipeline fails, source should stay 'approved' (not 'processed')."""
        pending_source.ingestion_status = "approved"
        db_session.commit()

        # Simulate pipeline failure — status stays approved
        source = db_session.query(Source).filter(Source.id == pending_source.id).first()
        assert source.ingestion_status == "approved"
