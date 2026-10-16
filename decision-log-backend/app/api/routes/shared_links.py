"""Shared links endpoints for public read-only access to milestone timelines (Story 8.4)."""

import secrets
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.services.extraction_runs import active_items_filter
from app.database.models import Organization, SharedLink, Project, ProjectItem, ProjectStage, User
from app.services.branding import branding
from app.services.access import ADMIN, public_items_filter, require_project_access
from app.services.organizations import BLOCKED


router = APIRouter()


# ─── Pydantic models ─────────────────────────────────────────────────────────


class CreateShareLinkRequest(BaseModel):
    """Request body for creating a share link. Promem revamp G8: null = never expires."""
    expires_in_days: Optional[int] = Field(30, ge=1, le=3650)


class UpdateShareLinkRequest(BaseModel):
    """Promem revamp G8: change when an existing link expires (from now); null = never."""
    expires_in_days: Optional[int] = Field(None, ge=1, le=3650)


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


def _require_admin(request: Request, db: Session, project_id: str):
    """Require organization admin on the project (Story 12.2; was the global director role)."""
    user = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    require_project_access(db, user, project_id, ADMIN)
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
    Organization admins of the project only.
    """
    current_user = _require_admin(request, db, project_id)

    # Generate cryptographically secure token
    token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(days=body.expires_in_days) if body.expires_in_days else None

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
        "share_url": f"/m/{token}",  # Promem revamp: short public link (old /shared/milestones/ still works)
        "expires_at": _iso(expires_at),
    }


def _iso(value: Optional[datetime]) -> Optional[str]:
    return value.isoformat() + "Z" if value else None


def _active():
    """Not revoked and not expired (a NULL expiry never expires)."""
    now = datetime.utcnow()
    return [SharedLink.revoked_at.is_(None), or_(SharedLink.expires_at.is_(None), SharedLink.expires_at > now)]


@router.patch("/projects/{project_id}/milestones/share/{token}")
async def update_share_link(
    project_id: str,
    token: str,
    body: UpdateShareLinkRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    """Promem revamp G8: "Expira em" — 30 dias · 90 dias · Nunca, counted from now."""
    _require_admin(request, db, project_id)
    link = (
        db.query(SharedLink)
        .filter(SharedLink.project_id == project_id, SharedLink.share_token == token, *_active())
        .first()
    )
    if not link:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Shared link not found")
    link.expires_at = datetime.utcnow() + timedelta(days=body.expires_in_days) if body.expires_in_days else None
    db.commit()
    return {"share_token": link.share_token, "expires_at": _iso(link.expires_at), "view_count": link.view_count or 0}


@router.get("/projects/{project_id}/milestones/share")
async def list_share_links(
    project_id: str,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    List active (non-revoked, non-expired) shared links for a project.
    Organization admins of the project only.
    """
    _require_admin(request, db, project_id)

    links = (
        db.query(SharedLink)
        .filter(SharedLink.project_id == project_id, *_active())
        .order_by(SharedLink.created_at.desc())
        .all()
    )

    return {
        "links": [
            {
                "share_token": link.share_token,
                "created_at": link.created_at.isoformat() + "Z" if link.created_at else None,
                "expires_at": _iso(link.expires_at),
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
    Organization admins of the project only.
    """
    _require_admin(request, db, project_id)

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
    link = db.query(SharedLink).filter(SharedLink.share_token == token).first()
    project = db.get(Project, link.project_id) if link is not None else None
    org = db.get(Organization, project.owner_organization_id) if project is not None else None

    # Story 12.13: a blocked organization's public links stop working (same answer as a revoked link)
    if link is None or link.revoked_at is not None or project is None or (org is not None and org.status == BLOCKED):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="This link has expired or been revoked",
        )
    # Promem revamp: an expired link says whose it was and whom to ask for a new one
    if link.expires_at is not None and link.expires_at <= datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_410_GONE,
            detail={"code": "expired", "expired_at": _iso(link.expires_at), "project": project.name, "organization": branding(org)},
        )

    # Increment view count
    link.view_count = (link.view_count or 0) + 1
    db.commit()

    # Load stages for the project
    stages = (
        db.query(ProjectStage)
        .filter(ProjectStage.project_id == link.project_id)
        .order_by(ProjectStage.sort_order)
        .all()
    )

    # Load milestones (project items marked as milestones)
    milestones = (
        db.query(ProjectItem)
        .filter(
            ProjectItem.project_id == link.project_id,
            ProjectItem.is_milestone.is_(True),
            public_items_filter(),  # Story 12.4: public links never show internal meetings' items
            active_items_filter(),  # Story 13.7
        )
        .order_by(ProjectItem.created_at.asc())
        .all()
    )

    shared_by = db.get(User, link.created_by) if link.created_by else None
    updated = max((m.updated_at or m.created_at for m in milestones if (m.updated_at or m.created_at)), default=None)
    return {
        "project": {
            "id": str(project.id),
            "name": project.name,
            "description": project.description,
        },
        # Promem revamp G7 / G7b: the firm leads the page; who shared it and until when
        "organization": branding(org),
        "shared_by": shared_by.name if shared_by else None,
        "link": {"created_at": _iso(link.created_at), "expires_at": _iso(link.expires_at)},
        "updated_at": _iso(updated),
        "stages": [
            {
                "id": str(s.id),
                "stage_name": s.stage_name,
                "stage_from": s.stage_from.isoformat() if s.stage_from else None,
                "stage_to": s.stage_to.isoformat() if s.stage_to else None,
                "sort_order": s.sort_order,
                "is_current": str(project.actual_stage_id) == str(s.id) if project.actual_stage_id else False,
            }
            for s in stages
        ],
        "milestones": [
            {
                "id": str(m.id),
                "statement": m.statement or m.decision_statement,
                "discipline": m.discipline,
                "who": m.who,
                "timestamp": m.timestamp,
                "created_at": m.created_at.isoformat() + "Z" if m.created_at else "",
                "is_done": m.is_done,
                "affected_disciplines": m.affected_disciplines or [],
                # Promem revamp G7b: the client view shows the type, a title, the date and the "por quê"
                "title": m.title,
                "item_type": m.item_type,
                "why": m.why or None,
                "date": _iso(m.occurred_at or (m.source.occurred_at if m.source else None) or m.created_at),
            }
            for m in milestones
        ],
    }
