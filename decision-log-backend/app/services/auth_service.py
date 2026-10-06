"""Authentication service for user login and token management."""

from sqlalchemy.orm import Session
from sqlalchemy.exc import NoResultFound

from app.database.models import User
from app.utils.security import verify_password, hash_password


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
    try:
        user = db.query(User).filter(User.email == email, User.deleted_at.is_(None)).one()
    except NoResultFound:
        raise UserNotFoundError(f"User with email '{email}' not found")

    if not verify_password(password, user.password_hash):
        raise AuthenticationError("Invalid password")

    return user


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
