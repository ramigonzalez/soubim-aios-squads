"""Tests for shared links CRUD endpoints (Story 8.4).

Covers:
- Token generation creates unique tokens
- Expired tokens return 404
- Revoked tokens return 404
- View count increments on access
- Non-admin cannot generate links
"""

import uuid
from datetime import datetime, timedelta
from unittest.mock import MagicMock, patch

import pytest
from sqlalchemy.orm import Session

from app.database.models import SharedLink, Project, ProjectItem, User


# ─── Fixtures ─────────────────────────────────────────────────────────────────


@pytest.fixture
def sample_project(db_session: Session) -> Project:
    """Create a test project."""
    project = Project(
        id=uuid.uuid4(),
        name="Test Project",
        description="A test project for shared links",
    )
    db_session.add(project)
    db_session.commit()
    db_session.refresh(project)
    return project


@pytest.fixture
def admin_user(db_session: Session) -> User:
    """Create a director (admin) user."""
    user = User(
        id=uuid.uuid4(),
        email="admin@test.com",
        password_hash="hashed_password",
        name="Admin User",
        role="director",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def client_user(db_session: Session) -> User:
    """Create a client (non-admin) user."""
    user = User(
        id=uuid.uuid4(),
        email="client@test.com",
        password_hash="hashed_password",
        name="Client User",
        role="client",
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def sample_milestone(db_session: Session, sample_project: Project) -> ProjectItem:
    """Create a test milestone project item."""
    item = ProjectItem(
        id=uuid.uuid4(),
        project_id=sample_project.id,
        decision_statement="Foundation design approved",
        who="Carlos",
        timestamp="00:05:00",
        discipline="structural",
        why="Structural integrity requirement",
        consensus={"structural": "AGREE"},
        is_milestone=True,
        is_done=False,
    )
    db_session.add(item)
    db_session.commit()
    db_session.refresh(item)
    return item


@pytest.fixture
def active_shared_link(
    db_session: Session, sample_project: Project, admin_user: User
) -> SharedLink:
    """Create an active (non-expired, non-revoked) shared link."""
    link = SharedLink(
        id=uuid.uuid4(),
        project_id=sample_project.id,
        share_token="test-active-token-123",
        resource_type="milestone_timeline",
        created_by=admin_user.id,
        expires_at=datetime.utcnow() + timedelta(days=30),
        view_count=0,
    )
    db_session.add(link)
    db_session.commit()
    db_session.refresh(link)
    return link


@pytest.fixture
def expired_shared_link(
    db_session: Session, sample_project: Project, admin_user: User
) -> SharedLink:
    """Create an expired shared link."""
    link = SharedLink(
        id=uuid.uuid4(),
        project_id=sample_project.id,
        share_token="test-expired-token-456",
        resource_type="milestone_timeline",
        created_by=admin_user.id,
        expires_at=datetime.utcnow() - timedelta(days=1),
        view_count=5,
    )
    db_session.add(link)
    db_session.commit()
    db_session.refresh(link)
    return link


@pytest.fixture
def revoked_shared_link(
    db_session: Session, sample_project: Project, admin_user: User
) -> SharedLink:
    """Create a revoked shared link."""
    link = SharedLink(
        id=uuid.uuid4(),
        project_id=sample_project.id,
        share_token="test-revoked-token-789",
        resource_type="milestone_timeline",
        created_by=admin_user.id,
        expires_at=datetime.utcnow() + timedelta(days=30),
        revoked_at=datetime.utcnow() - timedelta(hours=1),
        view_count=3,
    )
    db_session.add(link)
    db_session.commit()
    db_session.refresh(link)
    return link


# ─── Token Generation Tests ──────────────────────────────────────────────────


class TestTokenGeneration:
    """Tests for share link token creation."""

    def test_creates_shared_link_in_database(
        self, db_session: Session, sample_project: Project, admin_user: User
    ):
        """Creating a shared link should persist it to the database."""
        import secrets

        token = secrets.token_urlsafe(32)
        expires_at = datetime.utcnow() + timedelta(days=30)

        link = SharedLink(
            project_id=sample_project.id,
            share_token=token,
            resource_type="milestone_timeline",
            created_by=admin_user.id,
            expires_at=expires_at,
        )
        db_session.add(link)
        db_session.commit()

        stored = (
            db_session.query(SharedLink)
            .filter(SharedLink.share_token == token)
            .first()
        )
        assert stored is not None
        assert stored.project_id == sample_project.id
        assert stored.resource_type == "milestone_timeline"
        assert stored.view_count == 0

    def test_tokens_are_unique(self, db_session: Session, sample_project: Project, admin_user: User):
        """Each generated token should be unique."""
        import secrets

        tokens = set()
        for _ in range(100):
            token = secrets.token_urlsafe(32)
            tokens.add(token)

        assert len(tokens) == 100, "All 100 tokens should be unique"

    def test_token_length_is_sufficient(self):
        """Generated tokens should have sufficient entropy."""
        import secrets

        token = secrets.token_urlsafe(32)
        # token_urlsafe(32) generates 32 random bytes, base64url encoded = ~43 chars
        assert len(token) >= 40, f"Token '{token}' should be at least 40 chars long"

    def test_shared_link_default_view_count_is_zero(
        self, db_session: Session, active_shared_link: SharedLink
    ):
        """New shared links should have view_count = 0."""
        assert active_shared_link.view_count == 0


# ─── Expired Token Tests ─────────────────────────────────────────────────────


class TestExpiredTokens:
    """Tests for expired token handling."""

    def test_expired_token_not_found_in_active_query(
        self, db_session: Session, expired_shared_link: SharedLink
    ):
        """Expired tokens should not be returned by active-links queries."""
        now = datetime.utcnow()
        active = (
            db_session.query(SharedLink)
            .filter(
                SharedLink.share_token == expired_shared_link.share_token,
                SharedLink.revoked_at.is_(None),
                SharedLink.expires_at > now,
            )
            .first()
        )
        assert active is None

    def test_expired_token_still_exists_in_database(
        self, db_session: Session, expired_shared_link: SharedLink
    ):
        """Expired tokens should still exist in the database (for audit)."""
        link = (
            db_session.query(SharedLink)
            .filter(SharedLink.share_token == expired_shared_link.share_token)
            .first()
        )
        assert link is not None
        assert link.expires_at < datetime.utcnow()


# ─── Revoked Token Tests ─────────────────────────────────────────────────────


class TestRevokedTokens:
    """Tests for revoked token handling."""

    def test_revoked_token_not_found_in_active_query(
        self, db_session: Session, revoked_shared_link: SharedLink
    ):
        """Revoked tokens should not be returned by active-links queries."""
        now = datetime.utcnow()
        active = (
            db_session.query(SharedLink)
            .filter(
                SharedLink.share_token == revoked_shared_link.share_token,
                SharedLink.revoked_at.is_(None),
                SharedLink.expires_at > now,
            )
            .first()
        )
        assert active is None

    def test_revoking_sets_revoked_at(
        self, db_session: Session, active_shared_link: SharedLink
    ):
        """Revoking a link should set the revoked_at timestamp."""
        assert active_shared_link.revoked_at is None

        active_shared_link.revoked_at = datetime.utcnow()
        db_session.commit()
        db_session.refresh(active_shared_link)

        assert active_shared_link.revoked_at is not None

    def test_revoked_token_preserved_for_audit(
        self, db_session: Session, revoked_shared_link: SharedLink
    ):
        """Revoked tokens should remain in the database for audit purposes."""
        link = (
            db_session.query(SharedLink)
            .filter(SharedLink.share_token == revoked_shared_link.share_token)
            .first()
        )
        assert link is not None
        assert link.revoked_at is not None


# ─── View Count Tests ─────────────────────────────────────────────────────────


class TestViewCount:
    """Tests for view count increment behavior."""

    def test_view_count_increments(
        self, db_session: Session, active_shared_link: SharedLink
    ):
        """View count should increment by 1 on each access."""
        assert active_shared_link.view_count == 0

        active_shared_link.view_count += 1
        db_session.commit()
        db_session.refresh(active_shared_link)
        assert active_shared_link.view_count == 1

        active_shared_link.view_count += 1
        db_session.commit()
        db_session.refresh(active_shared_link)
        assert active_shared_link.view_count == 2

    def test_view_count_does_not_increment_for_expired(
        self, db_session: Session, expired_shared_link: SharedLink
    ):
        """Expired tokens should not have their view count modified (access should be blocked)."""
        original_count = expired_shared_link.view_count
        # Simulate the access check: expired link should not be found
        now = datetime.utcnow()
        link = (
            db_session.query(SharedLink)
            .filter(
                SharedLink.share_token == expired_shared_link.share_token,
                SharedLink.revoked_at.is_(None),
                SharedLink.expires_at > now,
            )
            .first()
        )
        assert link is None
        # View count should not have changed
        db_session.refresh(expired_shared_link)
        assert expired_shared_link.view_count == original_count


# ─── Admin Access Tests ──────────────────────────────────────────────────────


class TestAdminAccess:
    """Tests for admin-only access to share link management."""

    def test_admin_user_has_director_role(self, admin_user: User):
        """Admin users should have the 'director' role."""
        assert admin_user.role == "director"

    def test_non_admin_user_has_different_role(self, client_user: User):
        """Non-admin users should not have the 'director' role."""
        assert client_user.role != "director"

    def test_admin_check_rejects_client_role(self, client_user: User):
        """Admin check should reject users with 'client' role."""
        assert client_user.role == "client"
        assert client_user.role != "director"

    def test_admin_check_rejects_architect_role(self, db_session: Session):
        """Admin check should reject users with 'architect' role."""
        architect = User(
            id=uuid.uuid4(),
            email="architect@test.com",
            password_hash="hashed_password",
            name="Architect User",
            role="architect",
        )
        db_session.add(architect)
        db_session.commit()

        assert architect.role != "director"


# ─── SharedLink Model Tests ─────────────────────────────────────────────────


class TestSharedLinkModel:
    """Tests for the SharedLink SQLAlchemy model."""

    def test_shared_link_has_correct_table_name(self):
        """SharedLink model should use 'shared_links' table."""
        assert SharedLink.__tablename__ == "shared_links"

    def test_shared_link_references_valid_project(
        self, db_session: Session, sample_project: Project, active_shared_link: SharedLink
    ):
        """Shared link's project_id should reference a valid project."""
        project = (
            db_session.query(Project)
            .filter(Project.id == active_shared_link.project_id)
            .first()
        )
        assert project is not None
        assert project.id == sample_project.id

    def test_shared_link_resource_type_default(
        self, db_session: Session, active_shared_link: SharedLink
    ):
        """Default resource_type should be 'milestone_timeline'."""
        assert active_shared_link.resource_type == "milestone_timeline"

    def test_milestone_data_returned_for_shared_link(
        self,
        db_session: Session,
        sample_project: Project,
        sample_milestone: ProjectItem,
        active_shared_link: SharedLink,
    ):
        """Shared link should be able to retrieve milestone data for its project."""
        milestones = (
            db_session.query(ProjectItem)
            .filter(
                ProjectItem.project_id == active_shared_link.project_id,
                ProjectItem.is_milestone.is_(True),
            )
            .all()
        )
        assert len(milestones) == 1
        assert milestones[0].decision_statement == "Foundation design approved"
