"""Organization-scoped authorization (Story 12.2).

One place answers "what can this user do on this project?" — every route goes through it.

Access levels, weakest to strongest: ``none`` < ``read`` < ``write`` < ``review`` < ``admin``.

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

Story 12.4 — meeting visibility. Every source has an owner organization and a visibility:
- ``internal``: visible only to users who reach the project through the source's owner organization;
- ``shared``: visible to everyone who can read the project.
Items follow their source. Items without a source (manual input) are owned by the creating
organization (``project_items.owner_organization_id``) and are internal to it (no per-item
visibility yet). Every route that exposes sources or items filters with ``visible_sources_filter`` /
``visible_items_filter`` (lists, counts) or ``source_visible`` / ``item_visible`` (single object).
``users.role`` is not used for authorization anymore.

Story 12.6 — item review. Items are ``pending`` / ``approved`` / ``rejected``. Approved items follow
the visibility above; ``pending`` items (and ``rejected`` ones, only on request) are visible only to
users who reach the project through its owning organization. Reviewing (approve / reject / edit)
needs ``admin`` on the project, which only the owning organization's owner/admin have. Every item
listing goes through ``visible_items_filter`` and ``item_visible``, so the review rule is applied
with the visibility rule; public share links show approved items only.

Story 12.7 — ``reviewer`` organization role, between ``member`` and ``admin``. Like a member it needs a
project assignment (``project_members``). An assigned ``reviewer`` of the *owning* organization gets the
``review`` level: everything ``write`` allows, plus item review (approve / reject / edit / restore / bulk,
which now needs ``review`` instead of ``admin``) and approve / reject / retry of meetings in the ingestion
queue. Project settings, sharing, visibility, Drive, share links, milestones, meeting deletion and
member management stay ``admin``. A ``reviewer`` of a *shared* organization is treated like a member of
that organization (the shared level when assigned): review stays with the owning organization.
"""

from typing import Dict, Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import and_, or_, select
from sqlalchemy.orm import Session, aliased

from app.database.models import (
    Organization,
    OrganizationMember,
    Project,
    ProjectMember,
    ProjectItem,
    ProjectOrganization,
    Source,
)
from app.services.organizations import ASSIGNED_ROLES, DEFAULT_ORGANIZATION_SLUG, get_memberships

NONE, READ, WRITE, REVIEW, ADMIN = "none", "read", "write", "review", "admin"
_RANK = {NONE: 0, READ: 1, WRITE: 2, REVIEW: 3, ADMIN: 4}
ADMIN_ROLES = ("owner", "admin")
# Story 12.7: ``ASSIGNED_ROLES`` (reviewer, member) reach a project only when assigned (imported above)
REVIEWER = "reviewer"
# Story 12.3: level an organization gets on a project shared with it
SHARED_ACCESS_LEVELS = {"contributor": WRITE, "viewer": READ}
# Story 12.4: meeting (source) visibility
INTERNAL, SHARED = "internal", "shared"
VISIBILITIES = (INTERNAL, SHARED)
# Story 12.6: item review status
PENDING, APPROVED, REJECTED = "pending", "approved", "rejected"
REVIEW_STATUSES = (PENDING, APPROVED, REJECTED)


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


def project_access_by_organization(db: Session, user, project: Project) -> Dict[str, str]:
    """Level each of the user's organizations gives them on ``project`` (only organizations that grant
    access), keyed by organization id (str).

    - owning organization: ``owner``/``admin`` → ``admin``; assigned ``reviewer`` → ``review`` (12.7);
      ``member`` assigned to the project → ``write``
    - Story 12.3 — organization the project is shared with: its ``owner``/``admin`` (or an assigned
      ``member`` / ``reviewer``, 12.7) get the shared level (``contributor`` → ``write``, ``viewer`` → ``read``)

    Story 12.4 uses the keys to decide which organizations' internal meetings the user sees.
    """
    if project is None or project.owner_organization_id is None:
        return {}
    roles = organization_roles(db, user)
    if not roles:
        return {}
    assigned_cache: list = []

    def assigned() -> bool:
        if not assigned_cache:
            assigned_cache.append(_is_assigned(db, user, project.id))
        return assigned_cache[0]

    def grants(role) -> bool:
        return role in ADMIN_ROLES or (role in ASSIGNED_ROLES and assigned())

    result: Dict[str, str] = {}
    owner = str(project.owner_organization_id)
    role = roles.get(owner)
    if role in ADMIN_ROLES:
        result[owner] = ADMIN
    elif role == REVIEWER and assigned():
        result[owner] = REVIEW  # Story 12.7
    elif role == "member" and assigned():
        result[owner] = WRITE

    shares = db.query(ProjectOrganization.organization_id, ProjectOrganization.access).filter(
        ProjectOrganization.project_id == str(project.id),
        ProjectOrganization.organization_id.in_(list(roles)),
        ProjectOrganization.access.in_(tuple(SHARED_ACCESS_LEVELS)),
    )
    for org_id, access in shares:
        org = str(org_id)
        if org in result or not grants(roles.get(org)):
            continue
        result[org] = SHARED_ACCESS_LEVELS[access]
    return result


def project_access_level(db: Session, user, project: Project) -> str:
    """Access level of ``user`` on ``project``: none / read / write / admin (best over their organizations)."""
    level = NONE
    for org_level in project_access_by_organization(db, user, project).values():
        if _RANK[org_level] > _RANK[level]:
            level = org_level
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
        OrganizationMember.user_id == uid, OrganizationMember.role.in_(ASSIGNED_ROLES)
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


# ─── Story 12.4: meeting visibility (internal / shared) ──────────────────────


def _org_grants_access(user, org_col, project_col):
    """SQL condition: organization ``org_col`` gives the user access to project ``project_col``.

    Same rule as ``project_access_by_organization``: the organization owns the project or the project
    is shared with it (contributor/viewer), and the user is its owner/admin or an assigned member.
    Correlated on the outer row (``Source`` / ``ProjectItem``); aliases keep it from correlating with
    a ``Project`` joined in the outer query.
    """
    uid = _user_id(user)
    admin_orgs = select(OrganizationMember.organization_id).where(
        OrganizationMember.user_id == uid, OrganizationMember.role.in_(ADMIN_ROLES)
    )
    member_orgs = select(OrganizationMember.organization_id).where(
        OrganizationMember.user_id == uid, OrganizationMember.role.in_(ASSIGNED_ROLES)
    )
    assigned = select(ProjectMember.project_id).where(ProjectMember.user_id == uid)
    owned_project = aliased(Project)
    share = aliased(ProjectOrganization)
    owns = select(owned_project.id).where(
        owned_project.id == project_col, owned_project.owner_organization_id == org_col
    ).exists()
    shared_with = select(share.project_id).where(
        share.project_id == project_col,
        share.organization_id == org_col,
        share.access.in_(tuple(SHARED_ACCESS_LEVELS)),
    ).exists()
    return and_(
        org_col.isnot(None),
        or_(owns, shared_with),
        or_(org_col.in_(admin_orgs), and_(org_col.in_(member_orgs), project_col.in_(assigned))),
    )


def visible_sources_filter(user):
    """SQL condition on ``Source``: sources the user may see (project readable, and shared or an
    internal source of an organization through which the user reaches the project)."""
    return and_(
        Source.project_id.in_(accessible_project_ids(user)),
        or_(Source.visibility == SHARED, _org_grants_access(user, Source.owner_organization_id, Source.project_id)),
    )


def review_visible_filter(user, include_rejected: bool = False):
    """Story 12.6, SQL condition on ``ProjectItem``: approved items, plus ``pending`` (and, when
    ``include_rejected``, ``rejected``) items for users who reach the project through its owning
    organization. Shared organizations only ever see approved items."""
    uid = _user_id(user)
    admin_orgs = select(OrganizationMember.organization_id).where(
        OrganizationMember.user_id == uid, OrganizationMember.role.in_(ADMIN_ROLES)
    )
    member_orgs = select(OrganizationMember.organization_id).where(
        OrganizationMember.user_id == uid, OrganizationMember.role.in_(ASSIGNED_ROLES)
    )
    assigned = select(ProjectMember.project_id).where(ProjectMember.user_id == uid)
    # projects the user reaches through the organization that owns them (not through a share)
    owned_as_admin = select(Project.id).where(Project.owner_organization_id.in_(admin_orgs))
    owned_as_member = select(Project.id).where(Project.owner_organization_id.in_(member_orgs), Project.id.in_(assigned))
    owner_org = or_(ProjectItem.project_id.in_(owned_as_admin), ProjectItem.project_id.in_(owned_as_member))
    statuses = [PENDING, REJECTED] if include_rejected else [PENDING]
    return or_(ProjectItem.review_status == APPROVED, and_(ProjectItem.review_status.in_(statuses), owner_org))


def visible_items_filter(user, include_rejected: bool = False):
    """SQL condition on ``ProjectItem``: items of visible sources, or source-less items owned by an
    organization through which the user reaches the project; Story 12.6: and reviewable by the user
    (rejected items are left out unless ``include_rejected``)."""
    visible_source_ids = select(Source.id).where(visible_sources_filter(user))
    return and_(
        ProjectItem.project_id.in_(accessible_project_ids(user)),
        or_(
            and_(ProjectItem.source_id.isnot(None), ProjectItem.source_id.in_(visible_source_ids)),
            and_(
                ProjectItem.source_id.is_(None),
                _org_grants_access(user, ProjectItem.owner_organization_id, ProjectItem.project_id),
            ),
        ),
        review_visible_filter(user, include_rejected),
    )


def public_items_filter():
    """SQL condition on ``ProjectItem`` for anonymous views (public share links): approved items of
    shared sources only — internal meetings, source-less (internal) items and items not approved
    never leave the organization."""
    return and_(
        ProjectItem.source_id.in_(select(Source.id).where(Source.visibility == SHARED)),
        ProjectItem.review_status == APPROVED,
    )


def source_visible(db: Session, user, source: Optional[Source]) -> bool:
    """Can ``user`` see ``source`` (and its items, transcript, recording)?"""
    if source is None:
        return False
    orgs = project_access_by_organization(db, user, source.project)
    if not orgs:
        return False
    return source.visibility == SHARED or str(source.owner_organization_id) in orgs


def reaches_through_owner(db: Session, user, project: Project) -> bool:
    """Does the user reach ``project`` through its owning organization (sees pending / rejected items)?"""
    return project is not None and str(project.owner_organization_id) in project_access_by_organization(
        db, user, project
    )


def can_review_items(db: Session, user, project: Project) -> bool:
    """Story 12.6: approve / reject / edit items — Story 12.7: ``review`` on the project (owning
    organization's owner/admin, or its assigned reviewer). Same rule for approve / reject / retry of meetings."""
    return has_access(project_access_level(db, user, project), REVIEW)


def project_capabilities(db: Session, user, project: Project) -> dict:
    """Story 12.7: what the user can do on ``project``, so the frontend shows matching UI.

    ``access_level``; ``can_review`` (items, ingestion approve / reject / retry); ``can_manage``
    (project settings, sharing, milestones, share links, meeting deletion: owning organization's owner/admin).
    """
    level = project_access_level(db, user, project)
    return {"access_level": level, "can_review": has_access(level, REVIEW), "can_manage": has_access(level, ADMIN)}


def item_visible(db: Session, user, item: Optional[ProjectItem]) -> bool:
    """Can ``user`` see ``item``? Items follow their source; source-less items their owner organization;
    Story 12.6: items not approved only through the project's owning organization."""
    if item is None:
        return False
    if item.review_status != APPROVED and not reaches_through_owner(db, user, item.project):
        return False
    if item.source_id is not None:
        return source_visible(db, user, item.source)
    if item.owner_organization_id is None:
        return False
    return str(item.owner_organization_id) in project_access_by_organization(db, user, item.project)


def can_change_visibility(db: Session, user, source: Source) -> bool:
    """Owner/admin of the source's owner organization who reaches the project through that organization."""
    if source.owner_organization_id is None:
        return False
    owner = str(source.owner_organization_id)
    if owner not in project_access_by_organization(db, user, source.project):
        return False
    return organization_roles(db, user).get(owner) in ADMIN_ROLES


def can_create_shared(db: Session, user, project: Project) -> bool:
    """Can the user create a meeting on ``project`` that is ``shared`` from the start (Fathom import)?

    Same rule as ``can_change_visibility``: owner/admin of the organization they act for on the project.
    """
    org = acting_organization_id(db, user, project)
    return org is not None and organization_roles(db, user).get(str(org)) in ADMIN_ROLES


def owned_object_visible(db: Session, user, project: Project, owner_organization_id, visibility: str) -> bool:
    """Visibility rule for an object that is not a Source yet but will become one (e.g. an in-flight
    Fathom import): same as ``source_visible`` for the given owner organization and visibility."""
    orgs = project_access_by_organization(db, user, project)
    if not orgs:
        return False
    return visibility == SHARED or (owner_organization_id is not None and str(owner_organization_id) in orgs)


def acting_organization_id(db: Session, user, project: Project) -> Optional[UUID]:
    """Organization a user acts for on ``project`` — owner of the meetings/items they create there.

    The owning organization when the user reaches the project through it; otherwise the shared
    organization giving the highest level (ties: smallest id, deterministic). None without access.
    """
    orgs = project_access_by_organization(db, user, project)
    if not orgs:
        return None
    if str(project.owner_organization_id) in orgs:
        return UUID(str(project.owner_organization_id))
    best = sorted(orgs.items(), key=lambda kv: (-_RANK[kv[1]], kv[0]))[0][0]
    return UUID(best)


# ─── Route helpers (raise HTTP errors) ───────────────────────────────────────

_REQUIRED_DETAIL = {ADMIN: "Organization admin access required", REVIEW: "Review access required"}


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
            detail=_REQUIRED_DETAIL.get(required, "Write access required"),
        )
    return project


def require_source_access(db: Session, user, source_id, required: str = READ) -> Source:
    """Load the source and check the user's level on its project.

    404 when the source is missing, belongs to a project the user cannot see, or is another
    organization's internal source (Story 12.4) — does not reveal that it exists; 403 when visible
    but not allowed.
    """
    source = db.query(Source).filter(Source.id == str(source_id)).first()
    # Story 12.4: another organization's internal source is "not found" too
    level = project_access_level(db, user, source.project) if source_visible(db, user, source) else NONE
    if level == NONE:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source not found")
    if not has_access(level, required):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=_REQUIRED_DETAIL.get(required, "Write access required"))
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
