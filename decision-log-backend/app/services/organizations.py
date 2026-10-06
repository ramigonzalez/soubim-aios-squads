"""Organizations and memberships (Story 12.1); members and active organization (Story 12.5)."""

import uuid
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy import case, func, or_, select
from sqlalchemy.orm import Session

from app.database.models import (
    Organization,
    OrganizationMember,
    Project,
    ProjectMember,
    ProjectOrganization,
    User,
)

DEFAULT_ORGANIZATION_NAME = "souBIM"
DEFAULT_ORGANIZATION_SLUG = "soubim"
ROLES = ("owner", "admin", "member")
ADMIN_ROLES = ("owner", "admin")
ACTIVE_ORGANIZATION_HEADER = "X-Organization-Id"


def membership_role_for(user_role: str) -> str:
    """Organization role for a legacy global user role: directors administer, everyone else is a member."""
    return "admin" if user_role == "director" else "member"


def get_memberships(db: Session, user: User) -> List[OrganizationMember]:
    """The user's memberships: oldest first; ties (same transaction) by strongest role, then id."""
    role_rank = case({role: rank for rank, role in enumerate(ROLES)}, value=OrganizationMember.role, else_=len(ROLES))
    return (
        db.query(OrganizationMember)
        .filter(OrganizationMember.user_id == user.id)
        .order_by(OrganizationMember.created_at, role_rank, OrganizationMember.organization_id)
        .all()
    )


def primary_organization(db: Session, user: User) -> Optional[Organization]:
    """The user's first organization — the default when no active organization is sent (12.5)."""
    memberships = get_memberships(db, user)
    return memberships[0].organization if memberships else None


def ensure_default_organization(
    db: Session, name: str = DEFAULT_ORGANIZATION_NAME, slug: str = DEFAULT_ORGANIZATION_SLUG
) -> Organization:
    """Create the default organization if missing, add every user without a membership to it,
    and make it the owner of every project without one. Idempotent; does not commit.

    Mirrors the data backfill of migration 006_story_12_1 for databases built with
    create_all + seed (local dev, tests).
    """
    org = db.query(Organization).filter(Organization.slug == slug).first()
    if org is None:
        org = Organization(name=name, slug=slug)
        db.add(org)
        db.flush()

    members = {m.user_id for m in db.query(OrganizationMember.user_id).all()}
    for user in db.query(User).filter(User.deleted_at.is_(None)).all():
        if user.id not in members:
            db.add(OrganizationMember(user_id=user.id, organization_id=org.id, role=membership_role_for(user.role)))

    db.query(Project).filter(Project.owner_organization_id.is_(None)).update(
        {Project.owner_organization_id: org.id}, synchronize_session=False
    )
    db.flush()
    return org


# ─── Members (Story 12.5) ────────────────────────────────────────────────────


def get_role(db: Session, user: User, organization_id) -> Optional[str]:
    """The user's role in the organization, None if not a member."""
    return (
        db.query(OrganizationMember.role)
        .filter(OrganizationMember.user_id == user.id, OrganizationMember.organization_id == str(organization_id))
        .scalar()
    )


def can_manage_role(actor_role: Optional[str], target_role: str) -> bool:
    """Owners manage every role; admins manage ``admin`` and ``member`` (never ``owner``)."""
    if actor_role == "owner":
        return True
    return actor_role == "admin" and target_role != "owner"


def require_org_admin(db: Session, user: User, organization_id) -> Organization:
    """404 if the organization does not exist or the user is not a member (does not reveal it);
    403 for a member without owner/admin role."""
    org = db.query(Organization).filter(Organization.id == str(organization_id)).first()
    role = get_role(db, user, organization_id) if org else None
    if role is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    if role not in ADMIN_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Organization admin access required")
    return org


def _owner_count(db: Session, organization_id) -> int:
    return (
        db.query(func.count(OrganizationMember.user_id))
        .filter(OrganizationMember.organization_id == str(organization_id), OrganizationMember.role == "owner")
        .scalar()
    )


def list_members(db: Session, organization_id) -> list:
    rows = (
        db.query(OrganizationMember, User)
        .join(User, User.id == OrganizationMember.user_id)
        .filter(OrganizationMember.organization_id == str(organization_id), User.deleted_at.is_(None))
        .order_by(OrganizationMember.created_at, User.email)
        .all()
    )
    return [
        {"user_id": str(u.id), "name": u.name, "email": u.email, "role": m.role, "joined_at": m.created_at}
        for m, u in rows
    ]


def _member_or_404(db: Session, organization_id, user_id) -> OrganizationMember:
    member = (
        db.query(OrganizationMember)
        .filter(OrganizationMember.organization_id == str(organization_id), OrganizationMember.user_id == str(user_id))
        .first()
    )
    if member is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
    return member


def _lock_owners(db: Session, organization_id) -> None:
    """Serialize owner changes of one organization (last-owner protection under concurrency).

    ``SELECT ... FOR UPDATE`` on the owner rows: two owners demoting / removing each other at the
    same time wait for each other, and the second one re-reads roles after the first commits.
    Must run before reading the actor's and the target's roles. No-op on SQLite.
    """
    db.query(OrganizationMember.user_id).filter(
        OrganizationMember.organization_id == str(organization_id), OrganizationMember.role == "owner"
    ).with_for_update().all()


def change_member_role(db: Session, actor: User, organization_id, user_id, role: str) -> OrganizationMember:
    if role not in ROLES:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid role")
    _lock_owners(db, organization_id)
    member = _member_or_404(db, organization_id, user_id)
    db.refresh(member)
    actor_role = get_role(db, actor, organization_id)
    if not (can_manage_role(actor_role, role) and can_manage_role(actor_role, member.role)):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only an owner can change owner roles")
    if member.role == "owner" and role != "owner" and _owner_count(db, organization_id) <= 1:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An organization needs at least one owner")
    member.role = role
    db.commit()
    return member


def remove_member(db: Session, actor: User, organization_id, user_id) -> None:
    _lock_owners(db, organization_id)
    member = _member_or_404(db, organization_id, user_id)
    db.refresh(member)
    actor_role = get_role(db, actor, organization_id)
    if not can_manage_role(actor_role, member.role):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only an owner can remove an owner")
    if member.role == "owner" and _owner_count(db, organization_id) <= 1:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An organization needs at least one owner")
    # project assignments only matter inside the organization that owns the projects
    owned = db.query(Project.id).filter(Project.owner_organization_id == str(organization_id))
    db.query(ProjectMember).filter(
        ProjectMember.user_id == str(user_id), ProjectMember.project_id.in_(owned)
    ).delete(synchronize_session=False)
    db.delete(member)
    db.commit()


# ─── Active organization (Story 12.5) ────────────────────────────────────────


def active_organization_id(request) -> Optional[str]:
    """Active organization of this request (validated by the auth middleware); None = all of the user's."""
    return getattr(request.state, "active_organization_id", None)


def validate_active_organization(db: Session, user: User, header_value: Optional[str]) -> Optional[str]:
    """``X-Organization-Id`` → organization id the user belongs to. 403 for a non-member / malformed id."""
    if not header_value:
        return None
    try:
        org_id = str(uuid.UUID(header_value))
    except ValueError:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of this organization")
    if get_role(db, user, org_id) is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not a member of this organization")
    return org_id


def active_organization_projects_filter(organization_id):
    """``Project`` condition: owned by the active organization or shared with it (12.3).

    Narrows (AND) the access filter; it never grants access by itself.
    """
    shared = select(ProjectOrganization.project_id).where(
        ProjectOrganization.organization_id == str(organization_id),
        ProjectOrganization.access.in_(("contributor", "viewer")),
    )
    return or_(Project.owner_organization_id == str(organization_id), Project.id.in_(shared))
