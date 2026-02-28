"""Shared links endpoints for public read-only access to milestone timelines (Story 8.4)."""

import secrets
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.database.models import SharedLink, Project, ProjectItem


router = APIRouter()


# ─── Pydantic models ─────────────────────────────────────────────────────────


class CreateShareLinkRequest(BaseModel):
    """Request body for creating a share link."""
    expires_in_days: int = 30


class ShareLinkResponse(BaseModel):
    """Response for a created share link."""
    share_token: str
    share_url: str
    expires_at: str


class ShareLinkListItem(BaseModel):
    """Single share link in a list response."""
    share_token: str
    created_at: Optional[str] = None
    expires_at: str
    view_count: int
    resource_type: str


class SharedTimelineProject(BaseModel):
    """Project info returned in shared timeline response."""
    id: str
    name: str
    description: Optional[str] = None


class SharedTimelineMilestone(BaseModel):
    """Milestone data returned in shared timeline response."""
    id: str
    statement: str
    discipline: str
    who: str
    timestamp: str
    created_at: str
    is_done: bool
    affected_disciplines: list = []


class SharedTimelineResponse(BaseModel):
    """Response for viewing a shared milestone timeline."""
    project: SharedTimelineProject
    milestones: list


# ─── Helper: require admin user ──────────────────────────────────────────────


def _require_admin(request: Request):
    """Require the current user to be an admin (director role)."""
    user = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    if user.role != "director":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return user


# ─── Endpoints ────────────────────────────────────────────────────────────────


@router.post("/projects/{project_id}/milestones/share")
async def create_share_link(
    project_id: str,
    body: CreateShareLinkRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Generate a shareable link for the project's milestone timeline.
    Admin-only (director role).
    """
    current_user = _require_admin(request)

    # Verify project exists
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    # Generate cryptographically secure token
    token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(days=body.expires_in_days)

    link = SharedLink(
        project_id=project_id,
        share_token=token,
        resource_type="milestone_timeline",
        created_by=current_user.id,
        expires_at=expires_at,
    )
    db.add(link)
    db.commit()
    db.refresh(link)

    return {
        "share_token": token,
        "share_url": f"/shared/milestones/{token}",
        "expires_at": expires_at.isoformat() + "Z",
    }


@router.get("/projects/{project_id}/milestones/share")
async def list_share_links(
    project_id: str,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    List active (non-revoked, non-expired) shared links for a project.
    Admin-only (director role).
    """
    _require_admin(request)

    now = datetime.utcnow()
    links = (
        db.query(SharedLink)
        .filter(
            SharedLink.project_id == project_id,
            SharedLink.revoked_at.is_(None),
            SharedLink.expires_at > now,
        )
        .order_by(SharedLink.created_at.desc())
        .all()
    )

    return {
        "links": [
            {
                "share_token": link.share_token,
                "created_at": link.created_at.isoformat() + "Z" if link.created_at else None,
                "expires_at": link.expires_at.isoformat() + "Z",
                "view_count": link.view_count or 0,
                "resource_type": link.resource_type,
            }
            for link in links
        ]
    }


@router.delete("/projects/{project_id}/milestones/share/{token}")
async def revoke_share_link(
    project_id: str,
    token: str,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Revoke a shared link, making it immediately inaccessible.
    Admin-only (director role).
    """
    _require_admin(request)

    link = (
        db.query(SharedLink)
        .filter(
            SharedLink.project_id == project_id,
            SharedLink.share_token == token,
            SharedLink.revoked_at.is_(None),
        )
        .first()
    )

    if not link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shared link not found",
        )

    link.revoked_at = datetime.utcnow()
    db.commit()

    return {"message": "Link revoked successfully"}


@router.get("/shared/milestones/{token}")
async def view_shared_timeline(
    token: str,
    db: Session = Depends(get_db),
):
    """
    Public endpoint — no authentication required.
    Returns project + milestones for a valid, non-expired, non-revoked share token.
    Increments view_count on each access.
    """
    now = datetime.utcnow()
    link = (
        db.query(SharedLink)
        .filter(
            SharedLink.share_token == token,
            SharedLink.revoked_at.is_(None),
            SharedLink.expires_at > now,
        )
        .first()
    )

    if not link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="This link has expired or been revoked",
        )

    # Increment view count
    link.view_count = (link.view_count or 0) + 1
    db.commit()

    # Load project
    project = db.query(Project).filter(Project.id == link.project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    # Load milestones (project items marked as milestones)
    milestones = (
        db.query(ProjectItem)
        .filter(
            ProjectItem.project_id == link.project_id,
            ProjectItem.is_milestone.is_(True),
        )
        .order_by(ProjectItem.created_at.asc())
        .all()
    )

    return {
        "project": {
            "id": str(project.id),
            "name": project.name,
            "description": project.description,
        },
        "milestones": [
            {
                "id": str(m.id),
                "statement": m.decision_statement,
                "discipline": m.discipline,
                "who": m.who,
                "timestamp": m.timestamp,
                "created_at": m.created_at.isoformat() + "Z" if m.created_at else "",
                "is_done": m.is_done,
                "affected_disciplines": m.affected_disciplines or [],
            }
            for m in milestones
        ],
    }
