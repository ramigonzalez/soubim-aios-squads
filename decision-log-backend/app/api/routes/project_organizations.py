"""Project sharing between organizations (Story 12.3).

Admins (owner/admin) of the organization that owns the project list, invite, change and
remove the organizations with access. Shared organizations never get ``admin`` on the
project, so they cannot manage shares (no re-sharing).
"""

from typing import Literal, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database.models import Organization, Project, ProjectOrganization
from app.database.session import get_db
from app.services.access import ADMIN, require_project_access
from app.services.project_sharing import OWNER, SHARE_ACCESS, find_organization, get_share

router = APIRouter()

ShareAccess = Literal["contributor", "viewer"]


class ShareCreate(BaseModel):
    """Invite an existing organization by exact slug or id."""
    organization_slug: Optional[str] = None
    organization_id: Optional[UUID] = None
    access: ShareAccess = "viewer"


class ShareUpdate(BaseModel):
    access: ShareAccess


def _require_owner_admin(request: Request, db: Session, project_id) -> tuple:
    user = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return user, require_project_access(db, user, project_id, ADMIN)


def _entry(org: Organization, access: str, created_at=None, invited_by=None) -> dict:
    return {
        "organization_id": str(org.id),
        "name": org.name,
        "slug": org.slug,
        "access": access,
        "invited_by": str(invited_by) if invited_by else None,
        "created_at": created_at.isoformat() + "Z" if created_at else None,
    }


def _shared_row_or_404(db: Session, project: Project, organization_id) -> ProjectOrganization:
    if str(organization_id) == str(project.owner_organization_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="The owner organization cannot be changed")
    share = get_share(db, project.id, organization_id)
    if share is None or share.access not in SHARE_ACCESS:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization has no access to this project")
    return share


@router.get("/projects/{project_id}/organizations")
async def list_project_organizations(project_id: UUID, request: Request, db: Session = Depends(get_db)):
    """Organizations with access: the owner first, then shared organizations (oldest first)."""
    _, project = _require_owner_admin(request, db, project_id)
    owner = db.get(Organization, project.owner_organization_id)
    shares = (
        db.query(ProjectOrganization)
        .filter(ProjectOrganization.project_id == str(project.id), ProjectOrganization.access.in_(SHARE_ACCESS))
        .order_by(ProjectOrganization.created_at)
        .all()
    )
    return {
        "organizations": [_entry(owner, OWNER)]
        + [_entry(s.organization, s.access, s.created_at, s.invited_by) for s in shares]
    }


@router.post("/projects/{project_id}/organizations", status_code=status.HTTP_201_CREATED)
async def share_project(project_id: UUID, body: ShareCreate, request: Request, db: Session = Depends(get_db)):
    """Share the project with an existing organization (exact slug or id)."""
    user, project = _require_owner_admin(request, db, project_id)
    if not body.organization_id and not (body.organization_slug or "").strip():
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="organization_slug or organization_id is required")
    org = find_organization(db, slug=body.organization_slug, organization_id=body.organization_id)
    if org is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    if str(org.id) == str(project.owner_organization_id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="The project already belongs to this organization")
    if get_share(db, project.id, org.id) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Project already shared with this organization")

    share = ProjectOrganization(project_id=project.id, organization_id=org.id, access=body.access, invited_by=user.id)
    db.add(share)
    db.commit()
    db.refresh(share)
    return _entry(org, share.access, share.created_at, share.invited_by)


@router.patch("/projects/{project_id}/organizations/{organization_id}")
async def update_project_share(
    project_id: UUID, organization_id: UUID, body: ShareUpdate, request: Request, db: Session = Depends(get_db)
):
    """Change the access level of a shared organization."""
    _, project = _require_owner_admin(request, db, project_id)
    share = _shared_row_or_404(db, project, organization_id)
    share.access = body.access
    db.commit()
    db.refresh(share)
    return _entry(share.organization, share.access, share.created_at, share.invited_by)


@router.delete("/projects/{project_id}/organizations/{organization_id}")
async def unshare_project(project_id: UUID, organization_id: UUID, request: Request, db: Session = Depends(get_db)):
    """Remove a shared organization; its access ends immediately."""
    _, project = _require_owner_admin(request, db, project_id)
    share = _shared_row_or_404(db, project, organization_id)
    db.delete(share)
    db.commit()
    return {"message": "Organization removed from project"}
