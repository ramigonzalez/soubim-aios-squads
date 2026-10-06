"""Organization invitations (Story 12.5).

Flow: an owner/admin invites an email with a role → a single-use token (stored hashed,
expires) is put in a link → the invitee opens it → existing user: logs in and accepts;
new user: sets name + password and the account is created → membership created.
A company without an organization is invited by a platform admin with ``organization_name``;
the organization is created on acceptance and the invitee becomes its ``owner``.
"""

import hashlib
import re
import secrets
from datetime import datetime, timedelta
from typing import Optional, Tuple

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import settings
from app.database.models import Organization, OrganizationInvitation, OrganizationMember, User
from app.services.email_sender import EmailSender, get_email_sender
from app.services.organizations import ROLES, can_manage_role, get_role
from app.utils.security import hash_password


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def normalize_email(email: str) -> str:
    return email.strip().lower()


def invite_url(token: str) -> str:
    return f"{settings.frontend_url.rstrip('/')}/invite/{token}"


def now() -> datetime:
    return datetime.utcnow()


def status_of(invitation: OrganizationInvitation) -> str:
    if invitation.accepted_at is not None:
        return "accepted"
    if invitation.revoked_at is not None:
        return "revoked"
    if invitation.expires_at <= now():
        return "expired"
    return "pending"


def _slugify(name: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return slug[:80] or "organization"


def _unique_slug(db: Session, name: str) -> str:
    base = _slugify(name)
    slug, n = base, 2
    while db.query(Organization.id).filter(Organization.slug == slug).first():
        slug = f"{base}-{n}"
        n += 1
    return slug


def create_invitation(
    db: Session,
    inviter: User,
    email: str,
    role: str,
    organization: Optional[Organization] = None,
    organization_name: Optional[str] = None,
    sender: Optional[EmailSender] = None,
) -> Tuple[OrganizationInvitation, str]:
    """Create an invitation (revoking earlier pending ones for the same target) and send it.

    Returns ``(invitation, raw_token)``; the raw token is shown to the inviter once.
    Authorization is the caller's job (route): organization admin, or platform admin for a new company.
    """
    if role not in ROLES:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid role")
    email = normalize_email(email)
    if organization is not None:
        if not can_manage_role(get_role(db, inviter, organization.id), role):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only an owner can grant the owner role")
        already = (
            db.query(OrganizationMember)
            .join(User, User.id == OrganizationMember.user_id)
            .filter(
                OrganizationMember.organization_id == organization.id,
                func.lower(User.email) == email,
                User.deleted_at.is_(None),
            )
            .first()
        )
        if already:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User is already a member")
        target = OrganizationInvitation.organization_id == organization.id
        org_name = organization.name
    else:
        name = (organization_name or "").strip()
        if not name:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Organization name required")
        role = "owner"  # the first person of a new company owns it
        target = func.lower(OrganizationInvitation.organization_name) == name.lower()
        org_name = name

    # one live invitation per email and target: a new one replaces (revokes) the previous
    for old in (
        db.query(OrganizationInvitation)
        .filter(
            func.lower(OrganizationInvitation.email) == email,
            target,
            OrganizationInvitation.accepted_at.is_(None),
            OrganizationInvitation.revoked_at.is_(None),
        )
        .all()
    ):
        old.revoked_at = now()

    token = secrets.token_urlsafe(32)
    invitation = OrganizationInvitation(
        organization_id=organization.id if organization is not None else None,
        organization_name=None if organization is not None else org_name,
        email=email,
        role=role,
        token_hash=hash_token(token),
        invited_by=inviter.id,
        expires_at=now() + timedelta(days=settings.invitation_expire_days),
    )
    db.add(invitation)
    db.commit()
    db.refresh(invitation)

    (sender or get_email_sender()).send(
        to=email,
        subject=f"You were invited to {org_name} on DecisionLog",
        body=f"{inviter.name} invited you to join {org_name} as {role}.\nAccept: {invite_url(token)}",
    )
    return invitation, token


def find_by_token(db: Session, token: str) -> OrganizationInvitation:
    """Usable invitation for ``token``: 404 unknown, 410 used / revoked / expired."""
    invitation = (
        db.query(OrganizationInvitation).filter(OrganizationInvitation.token_hash == hash_token(token)).first()
    )
    if invitation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invitation not found")
    state = status_of(invitation)
    if state != "pending":
        raise HTTPException(status_code=status.HTTP_410_GONE, detail=f"Invitation {state}")
    return invitation


def invitation_org_name(invitation: OrganizationInvitation) -> str:
    return invitation.organization.name if invitation.organization is not None else invitation.organization_name


def account_exists(db: Session, email: str) -> bool:
    found = db.query(User.id).filter(func.lower(User.email) == normalize_email(email), User.deleted_at.is_(None))
    return found.first() is not None


def _join(db: Session, invitation: OrganizationInvitation, user: User) -> Organization:
    """Create the membership (and the organization of a new company); mark the invitation used."""
    org = invitation.organization
    if org is None:
        org = Organization(name=invitation.organization_name, slug=_unique_slug(db, invitation.organization_name))
        db.add(org)
        db.flush()
    existing = (
        db.query(OrganizationMember)
        .filter(OrganizationMember.organization_id == org.id, OrganizationMember.user_id == user.id)
        .first()
    )
    if existing is None:
        db.add(OrganizationMember(user_id=user.id, organization_id=org.id, role=invitation.role))
    invitation.accepted_at = now()
    db.commit()
    return org


def accept_as_existing_user(db: Session, token: str, user: User) -> Organization:
    invitation = find_by_token(db, token)
    if normalize_email(user.email) != normalize_email(invitation.email):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This invitation was sent to another email")
    return _join(db, invitation, user)


def accept_as_new_user(db: Session, token: str, name: str, password: str) -> Tuple[User, Organization]:
    invitation = find_by_token(db, token)
    if account_exists(db, invitation.email):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Account already exists: log in to accept")
    if len(password) < 8:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Password must have at least 8 characters"
        )
    if not name.strip():
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Name required")
    # users.role is legacy (not used for authorization since 12.2); invitees get the least privileged value
    user = User(email=invitation.email, password_hash=hash_password(password), name=name.strip(), role="client")
    db.add(user)
    db.flush()
    org = _join(db, invitation, user)
    return user, org
