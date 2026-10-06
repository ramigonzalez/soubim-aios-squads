"""Organization endpoints (Story 12.1), members and invitations (Story 12.5)."""

from typing import Literal, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.api.middleware.auth import get_current_user
from app.api.models.auth import TokenResponse, UserResponse
from app.database.models import OrganizationInvitation
from app.database.session import get_db
from app.services import invitations as inv
from app.services.access import is_platform_admin
from app.services.auth_service import get_user_projects
from app.services.organizations import (
    change_member_role,
    get_memberships,
    list_members,
    remove_member,
    require_org_admin,
)
from app.utils.security import create_access_token

router = APIRouter()

Role = Literal["owner", "admin", "member"]


@router.get("/organizations/me")
async def my_organizations(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Organizations the current user belongs to, with their role in each."""
    return [
        {
            "id": str(m.organization.id),
            "name": m.organization.name,
            "slug": m.organization.slug,
            "role": m.role,
        }
        for m in get_memberships(db, user)
    ]


# ─── Members ─────────────────────────────────────────────────────────────────


class MemberUpdate(BaseModel):
    role: Role


@router.get("/organizations/{organization_id}/members")
async def get_members(organization_id: UUID, db: Session = Depends(get_db), user=Depends(get_current_user)):
    require_org_admin(db, user, organization_id)
    return {"members": [{**m, "joined_at": m["joined_at"].isoformat() + "Z"} for m in list_members(db, organization_id)]}


@router.patch("/organizations/{organization_id}/members/{user_id}")
async def update_member(
    organization_id: UUID, user_id: UUID, body: MemberUpdate, db: Session = Depends(get_db), user=Depends(get_current_user)
):
    require_org_admin(db, user, organization_id)
    member = change_member_role(db, user, organization_id, user_id, body.role)
    return {"user_id": str(member.user_id), "role": member.role}


@router.delete("/organizations/{organization_id}/members/{user_id}", status_code=204)
async def delete_member(
    organization_id: UUID, user_id: UUID, db: Session = Depends(get_db), user=Depends(get_current_user)
):
    require_org_admin(db, user, organization_id)
    remove_member(db, user, organization_id, user_id)


# ─── Invitations (admin side) ────────────────────────────────────────────────


class InvitationCreate(BaseModel):
    """Invite to an existing organization (``organization_id``) or a company without one
    (``organization_name``, platform admins only; the invitee becomes its owner)."""

    email: EmailStr
    role: Role = "member"
    organization_id: Optional[UUID] = None
    organization_name: Optional[str] = None


def _invitation_dict(i: OrganizationInvitation) -> dict:
    return {
        "id": str(i.id),
        "organization_id": str(i.organization_id) if i.organization_id else None,
        "organization_name": inv.invitation_org_name(i),
        "email": i.email,
        "role": i.role,
        "status": inv.status_of(i),
        "expires_at": i.expires_at.isoformat() + "Z",
        "created_at": i.created_at.isoformat() + "Z",
    }


@router.post("/invitations", status_code=201)
async def create_invitation(body: InvitationCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Invite by email. The response carries the invite link once (the email provider is not
    configured yet, the admin can copy it); only its hash is stored."""
    if body.organization_id is not None:
        organization = require_org_admin(db, user, body.organization_id)
        invitation, token = inv.create_invitation(db, user, body.email, body.role, organization=organization)
    else:
        if not is_platform_admin(db, user):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Platform admin access required")
        invitation, token = inv.create_invitation(
            db, user, body.email, body.role, organization_name=body.organization_name
        )
    return {**_invitation_dict(invitation), "invite_url": inv.invite_url(token)}


@router.get("/organizations/{organization_id}/invitations")
async def list_invitations(organization_id: UUID, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Pending invitations of the organization."""
    require_org_admin(db, user, organization_id)
    rows = (
        db.query(OrganizationInvitation)
        .filter(
            OrganizationInvitation.organization_id == str(organization_id),
            OrganizationInvitation.accepted_at.is_(None),
            OrganizationInvitation.revoked_at.is_(None),
            OrganizationInvitation.expires_at > inv.now(),
        )
        .order_by(OrganizationInvitation.created_at.desc())
        .all()
    )
    return {"invitations": [_invitation_dict(i) for i in rows]}


@router.delete("/invitations/{invitation_id}", status_code=204)
async def revoke_invitation(invitation_id: UUID, db: Session = Depends(get_db), user=Depends(get_current_user)):
    invitation = db.query(OrganizationInvitation).filter(OrganizationInvitation.id == str(invitation_id)).first()
    if invitation is None or invitation.organization_id is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invitation not found")
    require_org_admin(db, user, invitation.organization_id)
    if invitation.accepted_at is None and invitation.revoked_at is None:
        invitation.revoked_at = inv.now()
        db.commit()


# ─── Invitations (invitee side) ──────────────────────────────────────────────


class TokenBody(BaseModel):
    token: str


class AcceptNewUser(BaseModel):
    token: str
    name: str
    password: str


def _invitation_preview(db: Session, i: OrganizationInvitation) -> dict:
    return {
        "organization_name": inv.invitation_org_name(i),
        "email": i.email,
        "role": i.role,
        "account_exists": inv.account_exists(db, i.email),
    }


# Paths under /api/invitations/public/ skip the JWT middleware (the token identifies the invitation).
@router.post("/invitations/public/preview")
async def preview_invitation(body: TokenBody, db: Session = Depends(get_db)):
    """What the invitee is about to join; 404 unknown token, 410 used / revoked / expired."""
    return _invitation_preview(db, inv.find_by_token(db, body.token))


@router.post("/invitations/public/accept", response_model=TokenResponse)
async def accept_invitation_new_user(body: AcceptNewUser, db: Session = Depends(get_db)):
    """New user: set name + password; the account and the membership are created and the user is logged in."""
    user, _ = inv.accept_as_new_user(db, body.token, body.name, body.password)
    token = create_access_token(user_id=str(user.id), email=user.email, role=user.role)
    return TokenResponse(
        access_token=token,
        user=UserResponse(
            id=user.id, email=user.email, name=user.name, role=user.role, projects=get_user_projects(db, str(user.id))
        ),
    )


@router.post("/invitations/accept")
async def accept_invitation(body: TokenBody, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Existing user (logged in with the invited email): join the organization."""
    org = inv.accept_as_existing_user(db, body.token, user)
    return {"id": str(org.id), "name": org.name, "slug": org.slug}
