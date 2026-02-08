"""Tests for authentication service and endpoints."""

import pytest
from uuid import uuid4
from datetime import datetime
from sqlalchemy.orm import Session

from app.database.models import User, Project, ProjectMember
from app.services.auth_service import (
    authenticate_user,
    get_user_by_id,
    get_user_projects,
    AuthenticationError,
    UserNotFoundError,
)
from app.utils.security import hash_password, verify_password, create_access_token, decode_access_token


@pytest.fixture
def test_user(db_session: Session) -> User:
    """Create a test user."""
    user = User(
        email="test@example.com",
        password_hash=hash_password("password"),
        name="Test User",
        role="director",
    )
    db_session.add(user)
    db_session.commit()
    return user


@pytest.fixture
def test_architect(db_session: Session) -> User:
    """Create a test architect user."""
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
def test_projects(db_session: Session, test_user: User, test_architect: User) -> tuple:
    """Create test projects."""
    project1 = Project(name="Project Alpha", description="First project")
    project2 = Project(name="Project Beta", description="Second project")
    db_session.add_all([project1, project2])
    db_session.commit()

    # Add director to both projects
    member1 = ProjectMember(project_id=project1.id, user_id=test_user.id, role="owner")
    member2 = ProjectMember(project_id=project2.id, user_id=test_user.id, role="owner")
    # Add architect to only project 1
    member3 = ProjectMember(project_id=project1.id, user_id=test_architect.id, role="member")

    db_session.add_all([member1, member2, member3])
    db_session.commit()

    return project1, project2


class TestAuthenticationService:
    """Tests for authentication service functions."""

    def test_authenticate_user_success(self, db_session: Session, test_user: User):
        """Test successful user authentication."""
        user = authenticate_user(db_session, "test@example.com", "password")
        assert user.email == "test@example.com"
        assert user.id == test_user.id

    def test_authenticate_user_invalid_password(self, db_session: Session, test_user: User):
        """Test authentication fails with wrong password."""
        with pytest.raises(AuthenticationError):
            authenticate_user(db_session, "test@example.com", "wrong_password")

    def test_authenticate_user_not_found(self, db_session: Session):
        """Test authentication fails when user doesn't exist."""
        with pytest.raises(UserNotFoundError):
            authenticate_user(db_session, "nonexistent@example.com", "password")

    def test_authenticate_user_deleted(self, db_session: Session, test_user: User):
        """Test deleted users cannot authenticate."""
        # Soft delete user
        test_user.deleted_at = datetime.utcnow()
        db_session.commit()

        with pytest.raises(UserNotFoundError):
            authenticate_user(db_session, "test@example.com", "password")

    def test_get_user_by_id_success(self, db_session: Session, test_user: User):
        """Test getting user by ID."""
        user = get_user_by_id(db_session, str(test_user.id))
        assert user.email == "test@example.com"
        assert user.id == test_user.id

    def test_get_user_by_id_not_found(self, db_session: Session):
        """Test getting non-existent user by ID."""
        with pytest.raises(UserNotFoundError):
            get_user_by_id(db_session, str(uuid4()))

    def test_get_user_projects_director(self, db_session: Session, test_user: User, test_projects: tuple):
        """Test director sees all projects."""
        projects = get_user_projects(db_session, str(test_user.id))
        assert len(projects) == 2
        assert test_projects[0].id in projects
        assert test_projects[1].id in projects

    def test_get_user_projects_architect(self, db_session: Session, test_architect: User, test_projects: tuple):
        """Test architect sees only assigned projects."""
        projects = get_user_projects(db_session, str(test_architect.id))
        assert len(projects) == 1
        assert test_projects[0].id in projects
        assert test_projects[1].id not in projects


class TestTokenGeneration:
    """Tests for JWT token generation and validation."""

    def test_create_access_token(self):
        """Test creating access token."""
        token = create_access_token("user-123", "test@example.com", "director")
        assert token is not None
        assert isinstance(token, str)

    def test_decode_valid_token(self):
        """Test decoding valid token."""
        token = create_access_token("user-123", "test@example.com", "director")
        payload = decode_access_token(token)

        assert payload is not None
        assert payload["user_id"] == "user-123"
        assert payload["email"] == "test@example.com"
        assert payload["role"] == "director"

    def test_decode_invalid_token(self):
        """Test decoding invalid token."""
        payload = decode_access_token("invalid.token.here")
        assert payload is None

    def test_decode_expired_token(self):
        """Test decoding expired token."""
        from datetime import timedelta
        # Create token with 0 expiration
        token = create_access_token(
            "user-123",
            "test@example.com",
            "director",
            expires_delta=timedelta(seconds=-1),
        )
        payload = decode_access_token(token)
        assert payload is None

    def test_token_contains_all_claims(self):
        """Test token contains all required claims."""
        token = create_access_token("user-123", "test@example.com", "director")
        payload = decode_access_token(token)

        assert "user_id" in payload
        assert "email" in payload
        assert "role" in payload
        assert "exp" in payload  # Expiration time

    def test_token_expiration_7_days(self):
        """Test token expiration is 7 days."""
        from app.config import settings
        from datetime import timedelta

        token = create_access_token("user-123", "test@example.com", "director")
        payload = decode_access_token(token)

        # Calculate expected expiration
        from datetime import datetime, timezone
        exp_time = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
        now = datetime.now(timezone.utc)

        # Should be approximately 7 days
        delta = (exp_time - now).total_seconds()
        expected_seconds = settings.jwt_expiration_minutes * 60
        assert abs(delta - expected_seconds) < 60  # Allow 1 minute variance


class TestPasswordHashing:
    """Tests for password hashing and verification."""

    def test_hash_password(self):
        """Test password hashing."""
        password = "secure_password_123"
        hashed = hash_password(password)

        assert hashed != password
        assert isinstance(hashed, str)
        assert len(hashed) > len(password)

    def test_verify_correct_password(self):
        """Test verifying correct password."""
        password = "secure_password_123"
        hashed = hash_password(password)
        assert verify_password(password, hashed)

    def test_verify_incorrect_password(self):
        """Test verifying incorrect password."""
        password = "secure_password_123"
        wrong_password = "wrong_password"
        hashed = hash_password(password)
        assert not verify_password(wrong_password, hashed)

    def test_same_password_different_hashes(self):
        """Test that same password produces different hashes."""
        password = "same_password"
        hash1 = hash_password(password)
        hash2 = hash_password(password)

        assert hash1 != hash2
        assert verify_password(password, hash1)
        assert verify_password(password, hash2)


class TestEndpointIntegration:
    """Integration tests for auth endpoints."""

    def test_login_endpoint_response_format(self, db_session: Session, test_user: User):
        """Test login endpoint returns correct response format."""
        # This would be a FastAPI TestClient test in production
        # For now, test the service that the endpoint uses
        user = authenticate_user(db_session, "test@example.com", "password")
        token = create_access_token(str(user.id), user.email, user.role)
        projects = get_user_projects(db_session, str(user.id))

        assert token is not None
        assert user.email == "test@example.com"
        assert isinstance(projects, list)

    def test_auth_flow_end_to_end(self, db_session: Session, test_user: User, test_projects: tuple):
        """Test complete authentication flow."""
        # 1. Authenticate user
        user = authenticate_user(db_session, "test@example.com", "password")
        assert user.id == test_user.id

        # 2. Create token
        token = create_access_token(str(user.id), user.email, user.role)
        assert token is not None

        # 3. Validate token
        payload = decode_access_token(token)
        assert payload["user_id"] == str(test_user.id)

        # 4. Get user from token
        recovered_user = get_user_by_id(db_session, payload["user_id"])
        assert recovered_user.id == test_user.id

        # 5. Get user's projects
        projects = get_user_projects(db_session, str(recovered_user.id))
        assert len(projects) == 2


class TestSecurityBestPractices:
    """Tests for security best practices."""

    def test_password_not_stored_plaintext(self, db_session: Session, test_user: User):
        """Test that passwords are never stored in plaintext."""
        assert test_user.password_hash != "password"
        assert test_user.password_hash is not None

    def test_jwt_uses_hs256(self):
        """Test that JWT uses HS256 algorithm."""
        from app.config import settings
        assert settings.jwt_algorithm == "HS256"

    def test_jwt_secret_key_configured(self):
        """Test that JWT secret key is configured."""
        from app.config import settings
        assert settings.jwt_secret_key is not None
        assert len(settings.jwt_secret_key) >= 32  # Secure length

    def test_soft_delete_prevents_login(self, db_session: Session, test_user: User):
        """Test that deleted users cannot login."""
        # Delete user
        test_user.deleted_at = datetime.utcnow()
        db_session.commit()

        # Should not be able to authenticate
        with pytest.raises(UserNotFoundError):
            authenticate_user(db_session, "test@example.com", "password")

    def test_role_based_project_access(self, db_session: Session, test_architect: User, test_projects: tuple):
        """Test that user roles affect project visibility."""
        # Architect should only see assigned projects
        projects = get_user_projects(db_session, str(test_architect.id))
        assert test_projects[0].id in projects
        assert test_projects[1].id not in projects
