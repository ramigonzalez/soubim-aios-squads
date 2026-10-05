"""Organizations and memberships (Story 12.1)."""

from typing import List, Optional

from sqlalchemy import case
from sqlalchemy.orm import Session

from app.database.models import Organization, OrganizationMember, Project, User

DEFAULT_ORGANIZATION_NAME = "souBIM"
DEFAULT_ORGANIZATION_SLUG = "soubim"
ROLES = ("owner", "admin", "member")


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
    """The user's first organization — the default until an active organization can be chosen (12.5)."""
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
