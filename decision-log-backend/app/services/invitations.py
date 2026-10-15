"""Organization invitations (Story 12.5).

Flow: an owner/admin invites an email with a role → a single-use token (stored hashed,
expires) is put in a link → the invitee opens it → existing user: logs in and accepts;
new user: sets name + password and the account is created → membership created.
A company without an organization is invited by a platform admin with ``organization_name``;
the organization is created on acceptance and the invitee becomes its ``owner``.

Story 12.15 — project invitation (``project_id`` set, role ``external``): an owner/admin of the project's
owning organization invites any email to that one project. Accepting makes the invitee an ``external``
member of the organization (unless they already are, for another project) assigned to the project with
``project_members.access = 'viewer'``. Same token / expiry / single use / revoke as above; the invitee may
also reject it (``rejected_at``, shown as "recusado"). One live invitation per email and project.
"""

import hashlib
import re
import secrets
from datetime import datetime, timedelta
from typing import Optional, Tuple

from fastapi import HTTPException, status
from sqlalchemy import and_, func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import settings
from app.database.models import Organization, OrganizationInvitation, OrganizationMember, Project, ProjectMember, User
from app.services.email_sender import EmailSender, get_email_sender
from app.services.organizations import (
    BLOCKED,
    EXTERNAL,
    ORGANIZATION_BLOCKED,
    ROLES,
    can_manage_role,
    get_role,
)

OPERATOR_CANNOT_JOIN = "operator_cannot_join"  # Story 12.13: the platform operator belongs to no organization
# Story 12.15: project invitation conflicts
ALREADY_MEMBER = "already_member"  # a regular member of the owning organization (already reaches its projects)
ALREADY_INVITED = "already_invited"  # already an external person on this project
EXTERNAL_VIEWER = "viewer"  # access given on acceptance
from app.utils.security import hash_password, normalize_email  # noqa: F401  (normalize_email re-exported)


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def invite_url(token: str) -> str:
    return f"{settings.frontend_url.rstrip('/')}/invite/{token}"


def now() -> datetime:
    return datetime.utcnow()


def status_of(invitation: OrganizationInvitation) -> str:
    if invitation.accepted_at is not None:
        return "accepted"
    if invitation.revoked_at is not None:
        return "revoked"
    if invitation.rejected_at is not None:  # Story 12.15
        return "rejected"
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
        target = and_(  # Story 12.15: project invitations are separate targets
            OrganizationInvitation.organization_id == organization.id, OrganizationInvitation.project_id.is_(None)
        )
        org_name = organization.name
    else:
        name = (organization_name or "").strip()
        if not name:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Organization name required")
        if len(name) > 255:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Organization name is too long")
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


def _membership(db: Session, organization_id, email: str) -> Optional[OrganizationMember]:
    """Membership of the (active) account with ``email`` in the organization, if any."""
    return (
        db.query(OrganizationMember)
        .join(User, User.id == OrganizationMember.user_id)
        .filter(
            OrganizationMember.organization_id == str(organization_id),
            func.lower(User.email) == normalize_email(email),
            User.deleted_at.is_(None),
        )
        .first()
    )


def _is_external_on(db: Session, project_id, user_id) -> bool:
    """The user has an external assignment (``access`` set) on the project."""
    return (
        db.query(ProjectMember.user_id)
        .filter(
            ProjectMember.project_id == str(project_id),
            ProjectMember.user_id == str(user_id),
            ProjectMember.access.isnot(None),
        )
        .first()
        is not None
    )


def _check_project_invitee(db: Session, project: Project, email: str) -> None:
    """Story 12.15: 409 ``already_member`` (regular member of the owning organization) /
    ``already_invited`` (already external on this project)."""
    membership = _membership(db, project.owner_organization_id, email)
    if membership is None:
        return
    if membership.role != EXTERNAL:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=ALREADY_MEMBER)
    if _is_external_on(db, project.id, membership.user_id):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=ALREADY_INVITED)


def create_project_invitation(
    db: Session, inviter: User, project: Project, email: str, sender: Optional[EmailSender] = None
) -> Tuple[OrganizationInvitation, str]:
    """Story 12.15: invite ``email`` to ``project`` as an external person (viewer). Revokes earlier live
    (pending or rejected) invitations of the same email to the project. Authorization (owning organization's
    owner/admin) is the route's job. Returns ``(invitation, raw_token)``."""
    email = normalize_email(email)
    _check_project_invitee(db, project, email)
    for old in (
        db.query(OrganizationInvitation)
        .filter(
            func.lower(OrganizationInvitation.email) == email,
            OrganizationInvitation.project_id == project.id,
            OrganizationInvitation.accepted_at.is_(None),
            OrganizationInvitation.revoked_at.is_(None),
        )
        .all()
    ):
        old.revoked_at = now()

    token = secrets.token_urlsafe(32)
    invitation = OrganizationInvitation(
        organization_id=project.owner_organization_id,
        project_id=project.id,
        email=email,
        role=EXTERNAL,
        token_hash=hash_token(token),
        invited_by=inviter.id,
        expires_at=now() + timedelta(days=settings.invitation_expire_days),
    )
    db.add(invitation)
    db.commit()
    db.refresh(invitation)

    org_name = invitation.organization.name
    (sender or get_email_sender()).send(
        to=email,
        subject=f"{org_name} invited you to the project {project.name} on DecisionLog",
        body=f"{inviter.name} invited you to follow the project {project.name} of {org_name}.\n"
        f"Accept: {invite_url(token)}",
    )
    return invitation, token


def reject_invitation(db: Session, token: str) -> OrganizationInvitation:
    """Story 12.15: the invitee rejects a pending project invitation (the token identifies them). Commits.
    Organization invitations cannot be rejected (404, as if unknown)."""
    invitation = find_by_token(db, token)
    if invitation.project_id is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invitation not found")
    rejected = (
        db.query(OrganizationInvitation)
        .filter(
            OrganizationInvitation.id == invitation.id,
            OrganizationInvitation.accepted_at.is_(None),
            OrganizationInvitation.revoked_at.is_(None),
            OrganizationInvitation.rejected_at.is_(None),
        )
        .update({OrganizationInvitation.rejected_at: now()}, synchronize_session=False)
    )
    if rejected != 1:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Invitation no longer valid")
    db.commit()
    db.refresh(invitation)
    return invitation


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


def ensure_can_accept(db: Session, invitation: OrganizationInvitation, user: Optional[User] = None) -> None:
    """Story 12.13: refuse an acceptance before any account or membership is created (403).

    - ``organization_blocked``: the invitation's organization is blocked (new-company invitations,
      without an organization yet, are not affected);
    - ``operator_cannot_join``: the accepting user, or the account of the invited email, is the
      platform operator (it belongs to no organization).
    """
    if invitation.organization is not None and invitation.organization.status == BLOCKED:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=ORGANIZATION_BLOCKED)
    if user is not None and user.is_platform_operator:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=OPERATOR_CANNOT_JOIN)
    operator = db.query(User.id).filter(
        func.lower(User.email) == normalize_email(invitation.email), User.is_platform_operator.is_(True)
    )
    if operator.first() is not None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=OPERATOR_CANNOT_JOIN)


def invitation_org_name(invitation: OrganizationInvitation) -> str:
    return invitation.organization.name if invitation.organization is not None else invitation.organization_name


def account_exists(db: Session, email: str) -> bool:
    found = db.query(User.id).filter(func.lower(User.email) == normalize_email(email), User.deleted_at.is_(None))
    return found.first() is not None


def _claim(db: Session, invitation: OrganizationInvitation) -> None:
    """Mark the invitation used atomically (single use under concurrency).

    Conditional UPDATE: only one transaction can move a pending invitation to accepted; a
    concurrent accept / revoke that got there first leaves 0 rows here → 410, and everything
    done in this transaction so far is rolled back.
    """
    claimed = (
        db.query(OrganizationInvitation)
        .filter(
            OrganizationInvitation.id == invitation.id,
            OrganizationInvitation.accepted_at.is_(None),
            OrganizationInvitation.revoked_at.is_(None),
            OrganizationInvitation.rejected_at.is_(None),  # Story 12.15
            OrganizationInvitation.expires_at > now(),
        )
        .update({OrganizationInvitation.accepted_at: now()}, synchronize_session=False)
    )
    if claimed != 1:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="Invitation no longer valid")


def _join(db: Session, invitation: OrganizationInvitation, user: User) -> Organization:
    """Create the membership (and the organization of a new company); the invitation must be claimed."""
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
    if invitation.project_id is not None:  # Story 12.15: external person on one project
        if existing is not None and existing.role != EXTERNAL:
            db.rollback()
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=ALREADY_MEMBER)
        if existing is None:
            db.add(OrganizationMember(user_id=user.id, organization_id=org.id, role=EXTERNAL))
        assignment = (
            db.query(ProjectMember)
            .filter(ProjectMember.project_id == invitation.project_id, ProjectMember.user_id == user.id)
            .first()
        )
        if assignment is None:
            # role 'external': an external-only row, never an assignment for a shared organization (access.py)
            db.add(ProjectMember(project_id=invitation.project_id, user_id=user.id, role=EXTERNAL,
                                 access=EXTERNAL_VIEWER))
        elif assignment.access is None:  # assigned by a shared organization: add the external grant, keep that
            assignment.access = EXTERNAL_VIEWER
    elif existing is None:
        db.add(OrganizationMember(user_id=user.id, organization_id=org.id, role=invitation.role))
    try:
        db.commit()
    except IntegrityError:  # Story 12.15: two first accepts of the same user raced (membership / row exists)
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Invitation accepted concurrently")
    db.refresh(invitation)
    return org


def ensure_not_member(db: Session, invitation: OrganizationInvitation, user: User) -> None:
    """Story 12.15: a project invitation cannot be accepted by a regular member of the organization (409
    ``already_member``: they already reach its projects through their role)."""
    if invitation.project_id is None:
        return
    role = get_role(db, user, invitation.organization_id)
    if role is not None and role != EXTERNAL:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=ALREADY_MEMBER)


def accept_as_existing_user(db: Session, token: str, user: User) -> Organization:
    return accept_for_user(db, find_by_token(db, token), user)


def accept_for_user(db: Session, invitation: OrganizationInvitation, user: User) -> Organization:
    """Accept a pending invitation for an existing user with the invited email. Commits."""
    if normalize_email(user.email) != normalize_email(invitation.email):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This invitation was sent to another email")
    ensure_can_accept(db, invitation, user)  # Story 12.13
    ensure_not_member(db, invitation, user)  # Story 12.15: before using the invitation
    _claim(db, invitation)
    return _join(db, invitation, user)


PASSWORD_MIN_LENGTH = 8
PASSWORD_MAX_BYTES = 72  # bcrypt input limit (bcrypt 5 raises above it)


def _email_taken(db: Session, email: str) -> bool:
    """Any account with this email, soft-deleted included (``users.email`` is unique)."""
    return db.query(User.id).filter(func.lower(User.email) == normalize_email(email)).first() is not None


def accept_as_new_user(db: Session, token: str, name: str, password: str) -> Tuple[User, Organization]:
    invitation = find_by_token(db, token)
    ensure_can_accept(db, invitation)  # Story 12.13 (before the "account exists" answer)
    if _email_taken(db, invitation.email):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Account already exists: log in to accept")
    if len(password) < PASSWORD_MIN_LENGTH:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Password must have at least 8 characters"
        )
    if len(password.encode("utf-8")) > PASSWORD_MAX_BYTES:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Password is too long")
    name = name.strip()
    if not name:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Name required")
    if len(name) > 255:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Name is too long")
    password_hash = hash_password(password)  # slow: before taking the invitation
    return create_invited_user(db, invitation, name, password_hash)


def create_invited_user(
    db: Session, invitation: OrganizationInvitation, name: str, password_hash: str, has_password: bool = True
) -> Tuple[User, Organization]:
    """Claim the invitation, create the invitee's account and membership. Commits.

    The caller has checked that no account uses the invited email and validated ``name``
    (password accept above; Google sign-in, Story 12.8, with an unusable random password).
    """
    ensure_can_accept(db, invitation)  # Story 12.13
    _claim(db, invitation)
    # users.role is legacy (not used for authorization since 12.2); invitees get the least privileged value
    user = User(email=invitation.email, password_hash=password_hash, name=name, role="client", has_password=has_password)
    db.add(user)
    try:
        db.flush()
    except IntegrityError:  # the email was registered concurrently (another invitation)
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Account already exists: log in to accept")
    org = _join(db, invitation, user)
    return user, org
