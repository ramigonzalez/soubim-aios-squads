"""Ingestion API endpoints for listing, approving, and rejecting sources.

Provides admin control over what content enters the system. Sources arrive
via webhooks (pending status) and must be approved before ETL processing.
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.api.models.ingestion import IngestionBatchAction, IngestionUpdate
from app.database.models import Project, Source
from app.database.session import get_db
from app.services.ingestion_pipeline import process_approved_source

router = APIRouter()


def _get_user(request: Request):
    """Get authenticated user from request state."""
    user = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    return user


def _require_admin(request: Request):
    """Require admin/director role for access."""
    user = _get_user(request)
    if user.role != "director":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return user


@router.get("/ingestion")
async def list_sources(
    request: Request,
    project_id: Optional[str] = Query(None, description="Filter by project ID"),
    source_type: Optional[str] = Query(None, description="Filter by source type"),
    ingestion_status: Optional[str] = Query("pending", description="Filter by ingestion status"),
    date_from: Optional[str] = Query(None, description="Filter by occurred_at >= date"),
    date_to: Optional[str] = Query(None, description="Filter by occurred_at <= date"),
    limit: int = Query(50, ge=1, le=200, description="Results per page"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    db: Session = Depends(get_db),
):
    """
    List sources with pagination and filters.

    Default filter: ingestion_status=pending.
    Returns sources joined with project_name from the Project table.
    JWT authentication required.
    """
    _get_user(request)

    # Build query with project name join
    query = db.query(Source, Project.name.label("project_name")).outerjoin(
        Project, Source.project_id == Project.id
    )

    # Apply filters
    if ingestion_status:
        query = query.filter(Source.ingestion_status == ingestion_status)

    if project_id:
        query = query.filter(Source.project_id == project_id)

    if source_type:
        query = query.filter(Source.source_type == source_type)

    if date_from:
        try:
            date_from_dt = datetime.fromisoformat(date_from)
            query = query.filter(Source.occurred_at >= date_from_dt)
        except (ValueError, TypeError):
            pass

    if date_to:
        try:
            date_to_dt = datetime.fromisoformat(date_to)
            query = query.filter(Source.occurred_at <= date_to_dt)
        except (ValueError, TypeError):
            pass

    # Get total count before pagination
    total = query.count()

    # Apply ordering and pagination
    query = query.order_by(Source.created_at.desc())
    query = query.limit(limit).offset(offset)

    rows = query.all()

    # Format response
    sources_list = []
    for source, project_name in rows:
        sources_list.append({
            "id": str(source.id),
            "project_id": str(source.project_id),
            "project_name": project_name,
            "source_type": source.source_type,
            "title": source.title,
            "occurred_at": source.occurred_at.isoformat() if source.occurred_at else None,
            "ingestion_status": source.ingestion_status,
            "ai_summary": source.ai_summary,
            "meeting_type": source.meeting_type,
            "email_from": source.email_from,
            "file_name": None,  # Derived from file_url if needed
            "file_type": source.file_type,
            "file_size": source.file_size,
            "created_at": source.created_at.isoformat() if source.created_at else None,
        })

    return {
        "sources": sources_list,
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.patch("/ingestion/{source_id}")
async def update_source_status(
    source_id: str,
    update: IngestionUpdate,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Update source ingestion status (approve or reject).

    Admin-only endpoint. On approval, sets approved_by/approved_at
    and triggers the ETL pipeline as a background task.
    """
    user = _require_admin(request)

    source = db.query(Source).filter(Source.id == source_id).first()
    if not source:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Source not found",
        )

    source.ingestion_status = update.ingestion_status

    if update.ingestion_status == "approved":
        source.approved_by = user.id
        source.approved_at = datetime.utcnow()
        db.commit()
        # Trigger ETL pipeline in background
        background_tasks.add_task(process_approved_source, str(source.id))
    else:
        db.commit()

    return {
        "id": str(source.id),
        "ingestion_status": source.ingestion_status,
    }


@router.post("/ingestion/batch")
async def batch_update_sources(
    batch: IngestionBatchAction,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Batch approve or reject multiple sources.

    Admin-only endpoint. Returns the count of updated records.
    """
    user = _require_admin(request)

    updated_count = 0
    new_status = "approved" if batch.action == "approve" else "rejected"

    for sid in batch.source_ids:
        source = db.query(Source).filter(Source.id == sid).first()
        if not source:
            continue

        source.ingestion_status = new_status

        if new_status == "approved":
            source.approved_by = user.id
            source.approved_at = datetime.utcnow()

        updated_count += 1

    db.commit()

    # Trigger ETL for approved sources
    if new_status == "approved":
        for sid in batch.source_ids:
            background_tasks.add_task(process_approved_source, sid)

    return {
        "updated": updated_count,
        "action": batch.action,
    }


@router.get("/ingestion/count")
async def pending_count(
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Get count of pending sources.

    Used by the frontend navigation badge.
    JWT authentication required.
    """
    _get_user(request)

    count = db.query(Source).filter(Source.ingestion_status == "pending").count()

    return {"pending": count}
