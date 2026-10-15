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


class ChangePasswordError(Exception):
    """Story 12.13: change-password refused; ``code`` is a stable reason the frontend translates."""

    def __init__(self, code: str):
        super().__init__(code)
        self.code = code


def _password_matches(password: str, password_hash: str) -> bool:
    """``verify_password`` that answers False instead of raising (bcrypt 5 raises above 72 bytes,
    malformed hashes raise too)."""
    try:
        return verify_password(password, password_hash)
    except ValueError:
        return False


def change_password(db: Session, user: User, current_password: str, new_password: str) -> None:
    """Story 12.13: the logged-in user changes their own password. Commits.

    Raises ChangePasswordError: ``no_password_set`` (account without a usable password: Google sign-in /
    ``--no-password``), ``invalid_current_password`` (nothing else is revealed), ``password_too_short`` /
    ``password_too_long`` (same rules as the invitation accept, Story 12.5), ``password_unchanged``.
    Passwords are never logged.
    """
    from app.services.invitations import PASSWORD_MAX_BYTES, PASSWORD_MIN_LENGTH

    if not user.has_password:
        raise ChangePasswordError("no_password_set")
    if not _password_matches(current_password, user.password_hash):
        raise ChangePasswordError("invalid_current_password")
    if len(new_password) < PASSWORD_MIN_LENGTH:
        raise ChangePasswordError("password_too_short")
    if len(new_password.encode("utf-8")) > PASSWORD_MAX_BYTES:
        raise ChangePasswordError("password_too_long")
    if new_password == current_password:
        raise ChangePasswordError("password_unchanged")
    user.password_hash = hash_password(new_password)
    db.commit()


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


def user_response(db: Session, user: User):
    """``UserResponse`` for login, /auth/me and invitation accept (Story 12.13: operator flag and
    organizations with their status)."""
    from app.api.models.auth import OrganizationSummary, UserResponse
    from app.services.organizations import get_memberships

    return UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
        projects=get_user_projects(db, str(user.id)),
        is_platform_operator=bool(user.is_platform_operator),
        organizations=[
            OrganizationSummary(
                id=m.organization.id,
                name=m.organization.name,
                slug=m.organization.slug,
                role=m.role,
                status=m.organization.status,
            )
            for m in get_memberships(db, user)
        ],
    )


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
