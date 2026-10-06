"""Authentication service for user login and token management."""

from sqlalchemy import func
from sqlalchemy.orm import Session
from sqlalchemy.exc import NoResultFound

from app.database.models import User
from app.utils.security import verify_password, hash_password, normalize_email


class AuthenticationError(Exception):
    """Raised when authentication fails."""
    pass


class UserNotFoundError(Exception):
    """Raised when user is not found."""
    pass


def authenticate_user(db: Session, email: str, password: str) -> User:
    """
    Authenticate user by email and password.

    Args:
        db: Database session
        email: User email address
        password: Plain text password

    Returns:
        User object if authentication succeeds

    Raises:
        UserNotFoundError: If user with email not found
        AuthenticationError: If password is incorrect
    """
    user = find_active_user_by_email(db, email)
    if user is None:
        raise UserNotFoundError("User not found")

    if not verify_password(password, user.password_hash):
        raise AuthenticationError("Invalid password")

    return user


def find_active_user_by_email(db: Session, email: str):
    """Active (not soft-deleted) user with this email, case-insensitively (Story 12.8); None if none."""
    return (
        db.query(User)
        .filter(func.lower(User.email) == normalize_email(email), User.deleted_at.is_(None))
        .first()
    )


def get_user_by_id(db: Session, user_id: str) -> User:
    """
    Get user by ID (for middleware).

    Args:
        db: Database session
        user_id: User UUID

    Returns:
        User object

    Raises:
        UserNotFoundError: If user not found
    """
    try:
        user = db.query(User).filter(User.id == user_id, User.deleted_at.is_(None)).one()
    except NoResultFound:
        raise UserNotFoundError(f"User with id '{user_id}' not found")

    return user


def get_user_projects(db: Session, user_id: str) -> list:
    """
    Get all projects accessible to user.

    Args:
        db: Database session
        user_id: User UUID

    Returns:
        List of project IDs
    """
    from app.database.models import Project
    from app.services.access import accessible_projects_filter

    user = get_user_by_id(db, user_id)

    # Story 12.2: projects of the user's organizations (see app/services/access.py)
    projects = (
        db.query(Project.id)
        .filter(Project.archived_at.is_(None), accessible_projects_filter(user))
        .all()
    )
    return [p[0] for p in projects]
