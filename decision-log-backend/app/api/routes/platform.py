"""Platform operator endpoints (Story 12.13, Part A): ``/api/platform/*``.

Every endpoint needs ``users.is_platform_operator`` (403 otherwise, router dependency). The operator
belongs to no organization and gets no access to tenant data: these endpoints return counts and
member lists only, never projects, meetings or items.
"""

from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.api.middleware.auth import get_current_user
from app.api.routes.organizations import invitation_dict
from app.database.session import get_db
from app.services import invitations as inv
from app.services import platform
from app.services.access import require_platform_operator


def require_operator(user=Depends(get_current_user)):
    require_platform_operator(None, user)
    return user


router = APIRouter(prefix="/api/platform", tags=["platform"], dependencies=[Depends(require_operator)])


class StatusUpdate(BaseModel):
    status: Literal["active", "payment_pending", "blocked"]


class CompanyInvitationCreate(BaseModel):
    """First owner of a company that has no organization yet (12.5 flow): the organization is created
    when the invitation is accepted and the invitee becomes its ``owner``."""

    email: EmailStr
    organization_name: str


@router.get("/organizations")
def list_organizations(db: Session = Depends(get_db)):
    return {"organizations": platform.list_organizations(db)}


@router.get("/organizations/{organization_id}")
def get_organization(organization_id: UUID, db: Session = Depends(get_db)):
    return platform.organization_detail(db, organization_id)


@router.patch("/organizations/{organization_id}")
def update_organization(organization_id: UUID, body: StatusUpdate, db: Session = Depends(get_db)):
    return platform.set_status(db, organization_id, body.status)


@router.post("/invitations", status_code=201)
def create_company_invitation(
    body: CompanyInvitationCreate, db: Session = Depends(get_db), user=Depends(require_operator)
):
    """The response carries the invite link once (no email provider yet, Story 12.14): the page shows
    it with a copy button. Only the token's hash is stored."""
    invitation, token = inv.create_invitation(db, user, body.email, "owner", organization_name=body.organization_name)
    return {**invitation_dict(invitation), "invite_url": inv.invite_url(token)}


@router.get("/invitations")
def list_company_invitations(db: Session = Depends(get_db)):
    """Pending new-company invitations (the link is not stored, so it is not returned here)."""
    return {"invitations": [invitation_dict(i) for i in platform.pending_company_invitations(db)]}


@router.delete("/invitations/{invitation_id}", status_code=204)
def revoke_company_invitation(invitation_id: UUID, db: Session = Depends(get_db)):
    platform.revoke_company_invitation(db, invitation_id)
