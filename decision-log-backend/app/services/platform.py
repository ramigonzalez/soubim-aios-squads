"""Platform operator views of organizations (Story 12.13, Part A).

The operator sees **counts only**, never tenant content (Rami, 2026-10-14): name, slug, status,
created date, member / project counts, last activity, and the member list (name, email, role).
No project, meeting or item data leaves this module.
"""

from datetime import datetime
from typing import Dict, List, Optional

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database.models import Organization, OrganizationInvitation, OrganizationMember, Project, Source, User
from app.services import invitations as inv
from app.services.organizations import ORGANIZATION_STATUSES, list_members


def _iso(value: Optional[datetime]) -> Optional[str]:
    return value.isoformat() + "Z" if value is not None else None


def _grouped(db: Session, column, *filters) -> Dict[str, object]:
    """``{organization_id: aggregate}`` for a ``(organization_id, aggregate)`` query."""
    return {str(org_id): value for org_id, value in db.query(*column).filter(*filters).group_by(column[0]).all()}


def _stats(db: Session, org_ids: Optional[List] = None) -> Dict[str, Dict[str, object]]:
    """Member count, project count and last activity per organization (a few grouped queries)."""
    member_filters = [User.deleted_at.is_(None)]
    project_filters = [Project.archived_at.is_(None)]
    if org_ids is not None:
        member_filters.append(OrganizationMember.organization_id.in_(org_ids))
        project_filters.append(Project.owner_organization_id.in_(org_ids))
    members = {
        str(org_id): count
        for org_id, count in db.query(OrganizationMember.organization_id, func.count(OrganizationMember.user_id))
        .join(User, User.id == OrganizationMember.user_id)
        .filter(*member_filters)
        .group_by(OrganizationMember.organization_id)
        .all()
    }
    projects = _grouped(db, (Project.owner_organization_id, func.count(Project.id)), *project_filters)
    # last activity: newest membership, project or meeting/document of the organization (timestamps only)
    scope = (lambda col: [col.in_(org_ids)]) if org_ids is not None else (lambda col: [])
    latest = [
        _grouped(db, (OrganizationMember.organization_id, func.max(OrganizationMember.created_at)),
                 *scope(OrganizationMember.organization_id)),
        _grouped(db, (Project.owner_organization_id, func.max(Project.created_at)), *scope(Project.owner_organization_id)),
        _grouped(db, (Source.owner_organization_id, func.max(Source.created_at)), *scope(Source.owner_organization_id)),
    ]
    keys = set(members) | set(projects) | {k for d in latest for k in d}
    return {
        key: {
            "member_count": members.get(key, 0),
            "project_count": projects.get(key, 0),
            "last_activity": max((d[key] for d in latest if d.get(key) is not None), default=None),
        }
        for key in keys
    }


def _summary(org: Organization, stats: Dict[str, object]) -> dict:
    moments = [m for m in (stats.get("last_activity"), org.created_at) if m is not None]
    return {
        "id": str(org.id),
        "name": org.name,
        "slug": org.slug,
        "status": org.status,
        "created_at": _iso(org.created_at),
        "member_count": stats.get("member_count", 0),
        "project_count": stats.get("project_count", 0),
        "last_activity_at": _iso(max(moments)) if moments else None,
    }


def list_organizations(db: Session) -> List[dict]:
    stats = _stats(db)
    orgs = db.query(Organization).order_by(Organization.name, Organization.id).all()
    return [_summary(org, stats.get(str(org.id), {})) for org in orgs]


def _organization_or_404(db: Session, organization_id) -> Organization:
    org = db.query(Organization).filter(Organization.id == str(organization_id)).first()
    if org is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    return org


def organization_detail(db: Session, organization_id) -> dict:
    org = _organization_or_404(db, organization_id)
    summary = _summary(org, _stats(db, [org.id]).get(str(org.id), {}))
    members = [{"name": m["name"], "email": m["email"], "role": m["role"]} for m in list_members(db, org.id)]
    return {**summary, "members": members}


def set_status(db: Session, organization_id, new_status: str) -> dict:
    if new_status not in ORGANIZATION_STATUSES:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid status")
    org = _organization_or_404(db, organization_id)
    org.status = new_status
    db.commit()
    return _summary(org, _stats(db, [org.id]).get(str(org.id), {}))


# ─── New-company invitations (12.5 flow, organization created on acceptance) ─────────────


def pending_company_invitations(db: Session) -> List[OrganizationInvitation]:
    return (
        db.query(OrganizationInvitation)
        .filter(
            OrganizationInvitation.organization_id.is_(None),
            OrganizationInvitation.accepted_at.is_(None),
            OrganizationInvitation.revoked_at.is_(None),
            OrganizationInvitation.expires_at > inv.now(),
        )
        .order_by(OrganizationInvitation.created_at.desc())
        .all()
    )


def revoke_company_invitation(db: Session, invitation_id) -> None:
    """Revoke a new-company invitation (idempotent). 404 for an unknown id or an invitation to an
    existing organization (those are managed by that organization's admins)."""
    invitation = (
        db.query(OrganizationInvitation)
        .filter(OrganizationInvitation.id == str(invitation_id), OrganizationInvitation.organization_id.is_(None))
        .first()
    )
    if invitation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invitation not found")
    if invitation.accepted_at is None and invitation.revoked_at is None:
        invitation.revoked_at = inv.now()
        db.commit()
