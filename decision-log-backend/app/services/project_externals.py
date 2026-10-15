"""External people on a project (Story 12.15).

An owner/admin of the project's owning organization invites an email to one project
(``invitations.create_project_invitation``). On acceptance the person is an ``external`` member of the
organization with a ``project_members`` row on the project (``access`` viewer / contributor). What they can
see and do is decided in ``app/services/access.py``. Here: list, change access, remove, revoke.

Removing an external person from their last project of the organization removes the ``external``
membership too; what they added stays (owned by the organization).
"""

from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.database.models import OrganizationInvitation, OrganizationMember, Project, ProjectMember, User
from app.services import invitations as inv
from app.services.organizations import EXTERNAL, release_external_grant

ACCESS = ("viewer", "contributor")


def _iso(value) -> Optional[str]:
    return value.isoformat() + "Z" if value is not None else None


def external_user_ids(db: Session, project: Project) -> set:
    """Ids (str) of the owning organization's ``external`` people — for the "Externo" badge."""
    rows = db.query(OrganizationMember.user_id).filter(
        OrganizationMember.organization_id == str(project.owner_organization_id),
        OrganizationMember.role == EXTERNAL,
    )
    return {str(user_id) for (user_id,) in rows}


def _externals_query(db: Session, project: Project):
    return (
        db.query(ProjectMember, User)
        .join(User, User.id == ProjectMember.user_id)
        .join(OrganizationMember, OrganizationMember.user_id == ProjectMember.user_id)
        .filter(
            ProjectMember.project_id == str(project.id),
            OrganizationMember.organization_id == str(project.owner_organization_id),
            OrganizationMember.role == EXTERNAL,
            ProjectMember.access.isnot(None),
            User.deleted_at.is_(None),
        )
    )


def invitation_entry(invitation: OrganizationInvitation) -> dict:
    return {
        "id": str(invitation.id),
        "email": invitation.email,
        "status": inv.status_of(invitation),  # pending / rejected ("recusado")
        "expires_at": _iso(invitation.expires_at),
        "created_at": _iso(invitation.created_at),
    }


def list_externals(db: Session, project: Project) -> dict:
    """External people of the project (oldest first) and its live invitations: pending, or rejected
    (until revoked or replaced by a new invitation)."""
    people = _externals_query(db, project).order_by(ProjectMember.created_at, User.email).all()
    invitations = (
        db.query(OrganizationInvitation)
        .filter(
            OrganizationInvitation.project_id == str(project.id),
            OrganizationInvitation.accepted_at.is_(None),
            OrganizationInvitation.revoked_at.is_(None),
            or_(OrganizationInvitation.rejected_at.isnot(None), OrganizationInvitation.expires_at > inv.now()),
        )
        .order_by(OrganizationInvitation.created_at.desc())
        .all()
    )
    return {
        "externals": [
            {
                "user_id": str(u.id),
                "name": u.name,
                "email": u.email,
                "access": pm.access,
                "joined_at": _iso(pm.created_at),
            }
            for pm, u in people
        ],
        "invitations": [invitation_entry(i) for i in invitations],
    }


def _external_or_404(db: Session, project: Project, user_id) -> ProjectMember:
    row = _externals_query(db, project).filter(ProjectMember.user_id == str(user_id)).first()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="External person not found")
    return row[0]


def change_access(db: Session, project: Project, user_id, access: str) -> ProjectMember:
    if access not in ACCESS:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid access")
    assignment = _external_or_404(db, project, user_id)
    assignment.access = access
    db.commit()
    db.refresh(assignment)
    return assignment


def remove_external(db: Session, project: Project, user_id) -> None:
    """Remove the person from the project; from their last project of the organization, also the
    ``external`` membership. Their content stays."""
    # an external-only row is deleted; a row that is also a shared organization's assignment keeps that
    release_external_grant(db, _external_or_404(db, project, user_id))
    db.flush()
    owned = select(Project.id).where(Project.owner_organization_id == str(project.owner_organization_id))
    remaining = (
        db.query(ProjectMember.project_id)
        .filter(ProjectMember.user_id == str(user_id), ProjectMember.project_id.in_(owned))
        .filter(ProjectMember.access.isnot(None))
        .first()
    )
    if remaining is None:
        db.query(OrganizationMember).filter(
            OrganizationMember.organization_id == str(project.owner_organization_id),
            OrganizationMember.user_id == str(user_id),
            OrganizationMember.role == EXTERNAL,
        ).delete(synchronize_session=False)
    db.commit()


def revoke_invitation(db: Session, project: Project, invitation_id) -> None:
    """Revoke a pending invitation, or dismiss a rejected one (idempotent). 404 for another project's."""
    invitation = (
        db.query(OrganizationInvitation)
        .filter(OrganizationInvitation.id == str(invitation_id), OrganizationInvitation.project_id == str(project.id))
        .first()
    )
    if invitation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invitation not found")
    if invitation.accepted_at is None and invitation.revoked_at is None:
        invitation.revoked_at = inv.now()
        db.commit()
