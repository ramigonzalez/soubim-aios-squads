"""Create (or promote) the platform operator account (Story 12.13, Part A).

Usage (from decision-log-backend/, with the target DATABASE_URL in the environment):
  PYTHONPATH=. venv/bin/python scripts/create_platform_operator.py EMAIL [--name NAME]
  PYTHONPATH=. venv/bin/python scripts/create_platform_operator.py EMAIL --no-password     # Google sign-in only
  PYTHONPATH=. venv/bin/python scripts/create_platform_operator.py EMAIL --reset-password  # existing user: new password

- Works on an empty production database (only migrations applied).
- Missing user: creates it with **no organization membership**, sets ``is_platform_operator``, generates a
  strong random password and prints it ONCE (``--no-password``: an unusable password, log in with Google).
- Existing user: only sets the flag (memberships untouched); ``--reset-password`` prints a new password.
- Idempotent: running it again changes nothing and prints no password.

The flag is never settable through the API; this script (or a migration) is the only way.
"""
import argparse
import logging
import secrets
import sys
from dataclasses import dataclass
from typing import Optional

from sqlalchemy import func

from app.database.models import User
from app.utils.security import hash_password, normalize_email

PASSWORD_BYTES = 18  # token_urlsafe → 24 characters (~144 bits), under bcrypt's 72-byte limit


@dataclass
class Result:
    user: User
    created: bool
    promoted: bool  # the flag was off before
    password: Optional[str] = None  # set only when a new password was generated (print it once)


class OperatorError(Exception):
    pass


def ensure_operator(
    db, email: str, name: Optional[str] = None, no_password: bool = False, reset_password: bool = False
) -> Result:
    """Create or promote the operator. Commits."""
    email = normalize_email(email)
    if not email or "@" not in email:
        raise OperatorError("A valid email is required")
    user = db.query(User).filter(func.lower(User.email) == email).first()
    if user is not None and user.deleted_at is not None:
        raise OperatorError(f"{email} belongs to a deleted account; restore it or use another email")

    password = None
    if user is None:
        password = None if no_password else secrets.token_urlsafe(PASSWORD_BYTES)
        user = User(
            email=email,
            name=(name or email.split("@", 1)[0]).strip()[:255],
            # Google-only account: a random password nobody knows (same as Google invitees, Story 12.8)
            password_hash=hash_password(password or secrets.token_urlsafe(32)),
            role="client",  # legacy column, not used for authorization
            is_platform_operator=True,
            has_password=password is not None,
        )
        db.add(user)
        db.commit()
        db.refresh(user)
        return Result(user=user, created=True, promoted=True, password=password)

    promoted = not user.is_platform_operator
    user.is_platform_operator = True
    if name:
        user.name = name.strip()[:255]
    if reset_password:
        password = secrets.token_urlsafe(PASSWORD_BYTES)
        user.password_hash = hash_password(password)
        user.has_password = True
    db.commit()
    db.refresh(user)
    return Result(user=user, created=False, promoted=promoted, password=password)


def main(argv=None, session_factory=None, out=print) -> int:
    parser = argparse.ArgumentParser(description="Create or promote the DecisionLog platform operator.")
    parser.add_argument("email")
    parser.add_argument("--name", help="display name (new account; also updates an existing one)")
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--no-password", action="store_true", help="new account without a usable password (Google sign-in)")
    group.add_argument("--reset-password", action="store_true", help="existing account: generate and print a new password")
    args = parser.parse_args(argv)
    logging.disable(logging.INFO)  # keep the output to what the operator must read (the password)

    if session_factory is None:
        from app.database.session import SessionLocal as session_factory  # noqa: N813
    db = session_factory()
    try:
        result = ensure_operator(db, args.email, args.name, args.no_password, args.reset_password)
    except OperatorError as exc:
        out(f"error: {exc}")
        return 1
    finally:
        db.close()

    email = result.user.email if result.user is not None else args.email
    if result.created:
        out(f"Created platform operator {email} (no organization).")
    elif result.promoted:
        out(f"{email} is now the platform operator (memberships unchanged).")
    else:
        out(f"{email} is already the platform operator; nothing changed.")
    if result.password:
        out("Password (shown only once, store it in a password manager):")
        out(result.password)
    elif result.created:
        out("No usable password: sign in with Google.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
