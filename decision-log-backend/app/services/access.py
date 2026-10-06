"""Organization-scoped authorization (Story 12.2).

One place answers "what can this user do on this project?" — every route goes through it.

Access levels, weakest to strongest: ``none`` < ``read`` < ``write`` < ``admin``.

Rules (a project is reachable only through the organization that owns it):
- ``owner`` / ``admin`` of the project's owning organization → ``admin`` (what the global
  ``director`` role allowed before: approve/reject ingestion, edit/archive projects, milestones,
  share links).
- ``member`` of the owning organization who is assigned to the project (``project_members``)
  → ``write`` (read everything, add manual items, edit items, participants, stages).
- Story 12.3 — the project is shared with another organization (``project_organizations``
  row ``contributor`` → ``write``, ``viewer`` → ``read``): that organization's ``owner`` /
  ``admin`` get the shared level; its ``member``s get it only when assigned to the project
  (same rule as the owning organization). A shared organization never gets ``admin``, so it
  cannot edit the project or manage its shares (no re-sharing).
- Anyone else → ``none``. Projects without an owning organization are never accessible.

Ownership is ``projects.owner_organization_id``; the ``owner`` row in ``project_organizations``
mirrors it and never grants access by itself.
``users.role`` is not used for authorization anymore.
"""

from typing import Dict, Optional

from fastapi import HTTPException, status
from sqlalchemy import and_, or_, select
from sqlalchemy.orm import Session

from app.database.models import (
    Organization,
    OrganizationMember,
    Project,
    ProjectMember,
    ProjectOrganization,
    Source,
)
from app.services.organizations import DEFAULT_ORGANIZATION_SLUG, get_memberships

NONE, READ, WRITE, ADMIN = "none", "read", "write", "admin"
_RANK = {NONE: 0, READ: 1, WRITE: 2, ADMIN: 3}
ADMIN_ROLES = ("owner", "admin")
# Story 12.3: level an organization gets on a project shared with it
SHARED_ACCESS_LEVELS = {"contributor": WRITE, "viewer": READ}


def _user_id(user) -> str:
    return str(user.id)


def organization_roles(db: Session, user) -> Dict[str, str]:
    """The user's role in each of their organizations, keyed by organization id (str)."""
    rows = db.query(OrganizationMember.organization_id, OrganizationMember.role).filter(
        OrganizationMember.user_id == _user_id(user)
    )
    return {str(org_id): role for org_id, role in rows}


def _is_assigned(db: Session, user, project_id) -> bool:
    return (
        db.query(ProjectMember)
        .filter(ProjectMember.project_id == str(project_id), ProjectMember.user_id == _user_id(user))
        .first()
        is not None
    )


def project_access_level(db: Session, user, project: Project) -> str:
    """Access level of ``user`` on ``project``: none / read / write / admin."""
    if project is None or project.owner_organization_id is None:
        return NONE
    roles = organization_roles(db, user)
    role = roles.get(str(project.owner_organization_id))
    if role in ADMIN_ROLES:
        return ADMIN
    if role == "member" and _is_assigned(db, user, project.id):
        return WRITE
    return _shared_access_level(db, user, project, roles)


def _shared_access_level(db: Session, user, project: Project, roles: Dict[str, str]) -> str:
    """Story 12.3: best level granted by shares of ``project`` with the user's organizations."""
    if not roles:
        return NONE
    shares = db.query(ProjectOrganization.organization_id, ProjectOrganization.access).filter(
        ProjectOrganization.project_id == str(project.id),
        ProjectOrganization.organization_id.in_(list(roles)),
        ProjectOrganization.access.in_(tuple(SHARED_ACCESS_LEVELS)),
    )
    level = NONE
    assigned = None
    for org_id, access in shares:
        role = roles.get(str(org_id))
        if role not in ADMIN_ROLES:
            if role != "member":
                continue
            if assigned is None:
                assigned = _is_assigned(db, user, project.id)
            if not assigned:
                continue
        shared = SHARED_ACCESS_LEVELS[access]
        if _RANK[shared] > _RANK[level]:
            level = shared
    return level


def has_access(level: str, required: str) -> bool:
    return _RANK[level] >= _RANK[required]


def accessible_projects_filter(user):
    """SQL condition on ``Project`` matching the projects the user can at least read."""
    uid = _user_id(user)
    admin_orgs = select(OrganizationMember.organization_id).where(
        OrganizationMember.user_id == uid, OrganizationMember.role.in_(ADMIN_ROLES)
    )
    member_orgs = select(OrganizationMember.organization_id).where(
        OrganizationMember.user_id == uid, OrganizationMember.role == "member"
    )
    assigned = select(ProjectMember.project_id).where(ProjectMember.user_id == uid)
    shared = ProjectOrganization.access.in_(tuple(SHARED_ACCESS_LEVELS))
    shared_with_admin_orgs = select(ProjectOrganization.project_id).where(
        shared, ProjectOrganization.organization_id.in_(admin_orgs)
    )
    shared_with_member_orgs = select(ProjectOrganization.project_id).where(
        shared, ProjectOrganization.organization_id.in_(member_orgs)
    )
    return or_(
        Project.owner_organization_id.in_(admin_orgs),
        and_(Project.owner_organization_id.in_(member_orgs), Project.id.in_(assigned)),
        # Story 12.3: projects shared with one of the user's organizations
        Project.id.in_(shared_with_admin_orgs),
        and_(Project.id.in_(shared_with_member_orgs), Project.id.in_(assigned)),
    )


def accessible_project_ids(user):
    """Subquery of ids of the projects the user can at least read (for ``.in_()`` filters)."""
    return select(Project.id).where(accessible_projects_filter(user))


# ─── Route helpers (raise HTTP errors) ───────────────────────────────────────


def require_project_access(db: Session, user, project_id, required: str = READ) -> Project:
    """Load the project and check the user's level; 404 if missing, 403 if not allowed."""
    project = db.query(Project).filter(Project.id == str(project_id)).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    level = project_access_level(db, user, project)
    if level == NONE:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You don't have access to this project")
    if not has_access(level, required):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Organization admin access required" if required == ADMIN else "Write access required",
        )
    return project


def require_source_access(db: Session, user, source_id, required: str = READ) -> Source:
    """Load the source and check the user's level on its project.

    404 when the source is missing *or* belongs to a project the user cannot see (does not
    reveal that another organization's source exists); 403 when visible but not allowed.
    """
    source = db.query(Source).filter(Source.id == str(source_id)).first()
    level = project_access_level(db, user, source.project) if source else NONE
    if level == NONE:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source not found")
    if not has_access(level, required):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Organization admin access required")
    return source


def admin_organization(db: Session, user) -> Optional[Organization]:
    """First organization (primary order) the user administers — owner of projects they create."""
    for membership in get_memberships(db, user):
        if membership.role in ADMIN_ROLES:
            return membership.organization
    return None


def is_platform_admin(db: Session, user) -> bool:
    """Owner/admin of the platform operator organization (souBIM).

    For platform-wide operations that are not scoped to one project (scheduler status,
    curation sync of all sources).
    """
    org = db.query(Organization).filter(Organization.slug == DEFAULT_ORGANIZATION_SLUG).first()
    return org is not None and organization_roles(db, user).get(str(org.id)) in ADMIN_ROLES


def require_platform_admin(db: Session, user) -> None:
    if not is_platform_admin(db, user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Platform admin access required")
