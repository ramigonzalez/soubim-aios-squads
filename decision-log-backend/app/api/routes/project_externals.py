"""External people on a project (Story 12.15): the project settings' "Pessoas externas" section.

Owner/admin of the project's owning organization only (``admin`` on the project): shared organizations,
members, reviewers and external people get 403 (404 for a project they cannot see at all).
"""

from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.api.middleware.auth import get_current_user
from app.database.session import get_db
from app.services import invitations as inv
from app.services import project_externals as externals
from app.services.access import ADMIN, require_project_access

router = APIRouter()


class ExternalInvite(BaseModel):
    email: EmailStr


class ExternalUpdate(BaseModel):
    access: Literal["viewer", "contributor"]


@router.get("/projects/{project_id}/externals")
async def list_project_externals(project_id: UUID, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """External people (name, email, access) and pending / rejected invitations."""
    project = require_project_access(db, user, project_id, ADMIN)
    return externals.list_externals(db, project)


@router.post("/projects/{project_id}/externals/invitations", status_code=201)
async def invite_project_external(
    project_id: UUID, body: ExternalInvite, db: Session = Depends(get_db), user=Depends(get_current_user)
):
    """Invite an email to the project (viewer on acceptance). The response carries the invite link once,
    to copy until e-mail sending exists (12.14); only its hash is stored."""
    project = require_project_access(db, user, project_id, ADMIN)
    invitation, token = inv.create_project_invitation(db, user, project, body.email)
    return {**externals.invitation_entry(invitation), "invite_url": inv.invite_url(token)}


@router.delete("/projects/{project_id}/externals/invitations/{invitation_id}", status_code=204)
async def revoke_project_external_invitation(
    project_id: UUID, invitation_id: UUID, db: Session = Depends(get_db), user=Depends(get_current_user)
):
    project = require_project_access(db, user, project_id, ADMIN)
    externals.revoke_invitation(db, project, invitation_id)


@router.patch("/projects/{project_id}/externals/{user_id}")
async def update_project_external(
    project_id: UUID, user_id: UUID, body: ExternalUpdate, db: Session = Depends(get_db), user=Depends(get_current_user)
):
    project = require_project_access(db, user, project_id, ADMIN)
    assignment = externals.change_access(db, project, user_id, body.access)
    return {"user_id": str(assignment.user_id), "access": assignment.access}


@router.delete("/projects/{project_id}/externals/{user_id}", status_code=204)
async def remove_project_external(
    project_id: UUID, user_id: UUID, db: Session = Depends(get_db), user=Depends(get_current_user)
):
    project = require_project_access(db, user, project_id, ADMIN)
    externals.remove_external(db, project, user_id)
