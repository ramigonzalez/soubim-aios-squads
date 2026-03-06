"""Ingestion API endpoints for listing, approving, and rejecting sources.

Provides admin control over what content enters the system. Sources arrive
via webhooks (pending status) and must be approved before ETL processing.

Story 7.9: Unified workflow — included auto-set on approve/reject,
           history endpoint, cascade delete, retry for failed sources.
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, Request, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.models.ingestion import IngestionBatchAction, IngestionUpdate
from app.database.models import Project, ProjectItem, Source, User
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


def _format_source(source, project_name: str, item_count: int = 0, approved_by_name: str | None = None, rejected_by_name: str | None = None) -> dict:
    """Format a Source ORM object into the frontend API contract."""
    base = {
        "id": str(source.id),
        "project_id": str(source.project_id),
        "project_name": project_name or "",
        "source_type": source.source_type,
        "status": source.ingestion_status,
        "ai_summary": source.ai_summary,
        "included": source.included if source.included is not None else False,
        "created_at": source.created_at.isoformat() if source.created_at else None,
        "approved_by_name": approved_by_name,
        "approved_at": source.approved_at.isoformat() if source.approved_at else None,
        "rejected_by_name": rejected_by_name,
        "rejected_at": source.rejected_at.isoformat() if source.rejected_at else None,
        "extraction_error": source.extraction_error,
        "extracted_item_count": item_count,
    }

    if source.source_type == "meeting":
        base.update({
            "call_id": source.webhook_id or "",
            "title": source.title or "",
            "meeting_date": source.occurred_at.isoformat() if source.occurred_at else None,
            "meeting_type": source.meeting_type or "",
            "source_label": source.source_label or "Fireflies",
            "transcript_url": source.file_url,
        })
    elif source.source_type == "email":
        email_to = source.email_to or []
        email_cc = source.email_cc or []
        base.update({
            "email_id": source.email_thread_id or "",
            "email_date": source.occurred_at.isoformat() if source.occurred_at else None,
            "subject": source.title or "",
            "from_address": source.email_from or "",
            "recipient_count": len(email_to) + len(email_cc),
            "thread_url": source.file_url,
        })
    elif source.source_type == "document":
        base.update({
            "document_id": source.drive_file_id or "",
            "upload_date": source.occurred_at.isoformat() if source.occurred_at else None,
            "file_name": source.title or "",
            "file_type": source.file_type or "",
            "file_size_bytes": source.file_size or 0,
            "file_url": source.file_url,
        })

    return base


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

    # Count total pending (unfiltered) for badge
    pending_count = db.query(Source).filter(Source.ingestion_status == "pending").count()

    # Format response to match frontend TypeScript contract
    sources_list = []
    for source, project_name in rows:
        sources_list.append(_format_source(source, project_name))

    return {
        "sources": sources_list,
        "total": total,
        "pending_count": pending_count,
    }


@router.get("/ingestion/history")
async def list_history(
    request: Request,
    project_id: Optional[str] = Query(None, description="Filter by project ID"),
    source_type: Optional[str] = Query(None, description="Filter by source type"),
    date_from: Optional[str] = Query(None, description="Filter by occurred_at >= date"),
    date_to: Optional[str] = Query(None, description="Filter by occurred_at <= date"),
    limit: int = Query(50, ge=1, le=200, description="Results per page"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    db: Session = Depends(get_db),
):
    """
    Story 7.9: List processed, rejected, and failed sources with approval metadata.

    Returns sources that are no longer pending, along with who approved/rejected,
    when, and how many items were extracted.
    """
    _get_user(request)

    # Subquery for item counts per source
    item_count_sq = (
        db.query(
            ProjectItem.source_id,
            func.count(ProjectItem.id).label("item_count"),
        )
        .group_by(ProjectItem.source_id)
        .subquery()
    )

    # Alias for approved_by and rejected_by user names
    ApprovedUser = db.query(User.id, User.name).subquery()
    RejectedUser = db.query(User.id, User.name).subquery()

    query = (
        db.query(
            Source,
            Project.name.label("project_name"),
            func.coalesce(item_count_sq.c.item_count, 0).label("item_count"),
            ApprovedUser.c.name.label("approved_by_name"),
            RejectedUser.c.name.label("rejected_by_name"),
        )
        .outerjoin(Project, Source.project_id == Project.id)
        .outerjoin(item_count_sq, Source.id == item_count_sq.c.source_id)
        .outerjoin(ApprovedUser, Source.approved_by == ApprovedUser.c.id)
        .outerjoin(RejectedUser, Source.rejected_by == RejectedUser.c.id)
        .filter(Source.ingestion_status.in_(["processed", "rejected", "failed"]))
    )

    if project_id:
        query = query.filter(Source.project_id == project_id)
    if source_type:
        query = query.filter(Source.source_type == source_type)
    if date_from:
        try:
            query = query.filter(Source.occurred_at >= datetime.fromisoformat(date_from))
        except (ValueError, TypeError):
            pass
    if date_to:
        try:
            query = query.filter(Source.occurred_at <= datetime.fromisoformat(date_to))
        except (ValueError, TypeError):
            pass

    total = query.count()
    query = query.order_by(Source.updated_at.desc()).limit(limit).offset(offset)
    rows = query.all()

    sources_list = []
    for source, project_name, item_count, approved_name, rejected_name in rows:
        sources_list.append(
            _format_source(source, project_name, item_count, approved_name, rejected_name)
        )

    return {
        "sources": sources_list,
        "total": total,
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

    Story 7.9: Auto-sets `included` flag — approve sets True, reject sets False.
    No standalone included toggle anymore.
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
        source.included = True
        source.approved_by = user.id
        source.approved_at = datetime.utcnow()
        source.extraction_error = None
        db.commit()
        # Trigger ETL pipeline in background
        background_tasks.add_task(process_approved_source, str(source.id))
    elif update.ingestion_status == "rejected":
        source.included = False
        source.rejected_by = user.id
        source.rejected_at = datetime.utcnow()
        db.commit()

    return {
        "id": str(source.id),
        "ingestion_status": source.ingestion_status,
        "included": source.included,
    }


@router.post("/ingestion/{source_id}/retry")
async def retry_source(
    source_id: str,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Story 7.9: Retry a failed source — resets to approved and re-triggers pipeline.
    """
    user = _require_admin(request)

    source = db.query(Source).filter(Source.id == source_id).first()
    if not source:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Source not found",
        )

    if source.ingestion_status != "failed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only failed sources can be retried",
        )

    source.ingestion_status = "approved"
    source.included = True
    source.extraction_error = None
    source.approved_by = user.id
    source.approved_at = datetime.utcnow()
    db.commit()

    background_tasks.add_task(process_approved_source, str(source.id))

    return {
        "id": str(source.id),
        "ingestion_status": "approved",
        "message": "Source queued for retry",
    }


@router.delete("/ingestion/{source_id}")
async def delete_source(
    source_id: str,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Story 7.9: Cascade delete a source and all its extracted ProjectItems + embeddings.

    Only processed or failed sources can be deleted (not pending — those should be rejected).
    """
    _require_admin(request)

    source = db.query(Source).filter(Source.id == source_id).first()
    if not source:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Source not found",
        )

    if source.ingestion_status == "pending":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Pending sources should be rejected, not deleted",
        )

    # Delete all extracted ProjectItems (embeddings are a column on ProjectItem, deleted automatically)
    deleted_items = db.query(ProjectItem).filter(ProjectItem.source_id == source_id).delete()

    # Delete the source itself
    db.delete(source)
    db.commit()

    return {
        "deleted_source_id": source_id,
        "deleted_items_count": deleted_items,
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

    Story 7.9: Auto-sets included flag per source.
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
            source.included = True
            source.approved_by = user.id
            source.approved_at = datetime.utcnow()
            source.extraction_error = None
        elif new_status == "rejected":
            source.included = False
            source.rejected_by = user.id
            source.rejected_at = datetime.utcnow()

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
