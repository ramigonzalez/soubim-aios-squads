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
ROLES = ("owner", "admin", "reviewer", "member")  # strongest first; reviewer: Story 12.7
ADMIN_ROLES = ("owner", "admin")
# Story 12.7: roles that reach a project only when assigned to it (``project_members``)
ASSIGNED_ROLES = ("reviewer", "member")
SHARED_ACCESS = ("contributor", "viewer")
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
    """Owners manage every role; admins manage ``admin``, ``reviewer`` and ``member`` (never ``owner``)."""
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
    # project assignments of the projects the organization owns (12.5) or that are shared with it (12.7,
    # assigned by its admins); assignments on other organizations' projects are not touched. On a shared
    # project the single ``project_members`` row is kept when it also grants access through another of the
    # user's organizations (12.7 security review: a shared organization must not revoke the owner's grant).
    org_projects = select(Project.id).where(active_organization_projects_filter(organization_id))
    rows = (
        db.query(ProjectMember, Project)
        .join(Project, Project.id == ProjectMember.project_id)
        .filter(ProjectMember.user_id == str(user_id), ProjectMember.project_id.in_(org_projects))
        .all()
    )
    for assignment, project in rows:
        owned = str(project.owner_organization_id) == str(organization_id)
        if owned or not _other_granting_organizations(db, organization_id, user_id, project):
            db.delete(assignment)
    db.delete(member)
    db.commit()


# ─── Project assignments (Story 12.7) ────────────────────────────────────────
#
# Members and reviewers reach a project only when assigned (``project_members``, Story 12.2). An
# organization's owner/admin assign *their own organization's* users to projects the organization owns
# or that are shared with it (12.3); never another organization's users. Owners/admins do not need an
# assignment (they reach every project of their organization).


def organization_projects(db: Session, organization_id) -> List[Project]:
    """Non-archived projects the organization owns or that are shared with it, by name."""
    return (
        db.query(Project)
        .filter(active_organization_projects_filter(organization_id), Project.archived_at.is_(None))
        .order_by(Project.name, Project.id)
        .all()
    )


def _organization_project_or_404(db: Session, organization_id, project_id) -> Project:
    project = (
        db.query(Project)
        .filter(Project.id == str(project_id), active_organization_projects_filter(organization_id))
        .first()
    )
    if project is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    return project


def _active_member_or_404(db: Session, organization_id, user_id) -> OrganizationMember:
    member = _member_or_404(db, organization_id, user_id)
    if db.query(User.id).filter(User.id == str(user_id), User.deleted_at.is_(None)).first() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Member not found")
    return member


def _other_granting_organizations(db: Session, organization_id, user_id, project: Project) -> List[str]:
    """Organizations other than ``organization_id`` through which the user's (single, per project + user)
    ``project_members`` row on ``project`` grants access: the user holds an assignment-based role
    (reviewer / member) there and that organization owns the project or the project is shared with it."""
    shared_with = select(ProjectOrganization.organization_id).where(
        ProjectOrganization.project_id == str(project.id), ProjectOrganization.access.in_(SHARED_ACCESS)
    )
    rows = db.query(OrganizationMember.organization_id).filter(
        OrganizationMember.user_id == str(user_id),
        OrganizationMember.organization_id != str(organization_id),
        OrganizationMember.role.in_(ASSIGNED_ROLES),
        or_(
            OrganizationMember.organization_id == str(project.owner_organization_id),
            OrganizationMember.organization_id.in_(shared_with),
        ),
    )
    return [str(org_id) for (org_id,) in rows]


def _require_assignment_control(db: Session, organization_id, user_id, project: Project) -> None:
    """12.7 security review: ``project_members`` has one row per (project, user) and that row grants access
    through *every* organization of the user that reaches the project. The owning organization controls
    it; a shared organization may change it only when the row grants nothing through another organization
    of the user (otherwise its admin could grant — or revoke — the owner's member / reviewer access)."""
    if str(project.owner_organization_id) == str(organization_id):
        return
    if _other_granting_organizations(db, organization_id, user_id, project):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This user's assignment on this project is managed by another of their organizations",
        )


def list_project_assignments(db: Session, organization_id) -> dict:
    """The organization's projects and which of its members are assigned to each."""
    projects = organization_projects(db, organization_id)
    members = select(OrganizationMember.user_id).where(OrganizationMember.organization_id == str(organization_id))
    rows = (
        db.query(ProjectMember.user_id, ProjectMember.project_id)
        .filter(ProjectMember.project_id.in_([p.id for p in projects]), ProjectMember.user_id.in_(members))
        .all()
        if projects
        else []
    )
    return {
        "projects": [
            {"id": str(p.id), "name": p.name, "owned": str(p.owner_organization_id) == str(organization_id)}
            for p in projects
        ],
        "assignments": sorted(
            ({"user_id": str(u), "project_id": str(p)} for u, p in rows), key=lambda a: (a["user_id"], a["project_id"])
        ),
    }


def assign_project(db: Session, organization_id, user_id, project_id) -> None:
    """Assign a member of the organization to one of its projects (idempotent). 404 for another
    organization's user or project."""
    _active_member_or_404(db, organization_id, user_id)
    project = _organization_project_or_404(db, organization_id, project_id)
    _require_assignment_control(db, organization_id, user_id, project)
    exists = (
        db.query(ProjectMember)
        .filter(ProjectMember.project_id == project.id, ProjectMember.user_id == str(user_id))
        .first()
    )
    if exists is None:
        db.add(ProjectMember(project_id=project.id, user_id=uuid.UUID(str(user_id)), role="member"))
    db.commit()


def unassign_project(db: Session, organization_id, user_id, project_id) -> None:
    """Remove a member's assignment (idempotent). 404 for another organization's user or project."""
    _active_member_or_404(db, organization_id, user_id)
    project = _organization_project_or_404(db, organization_id, project_id)
    _require_assignment_control(db, organization_id, user_id, project)
    db.query(ProjectMember).filter(
        ProjectMember.project_id == project.id, ProjectMember.user_id == str(user_id)
    ).delete(synchronize_session=False)
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
        ProjectOrganization.access.in_(SHARED_ACCESS),
    )
    return or_(Project.owner_organization_id == str(organization_id), Project.id.in_(shared))
