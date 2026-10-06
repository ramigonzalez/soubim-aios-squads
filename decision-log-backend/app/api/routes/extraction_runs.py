"""Extraction versions of a meeting (Story 13.7): list runs, re-extract, switch the active run."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.middleware.auth import get_current_user
from app.database.models import ExtractionRun, ProjectItem, User
from app.database.session import get_db
from app.services.access import ADMIN, has_access, project_access_level, require_source_access
from app.services.extraction_runs import activate_run
from app.services.jobs import enqueue, latest_job_for_source

router = APIRouter()

EXTRACTABLE_SOURCE_TYPES = ("meeting", "manual_input")


def _runs_payload(db: Session, source, user) -> dict:
    runs = (
        db.query(ExtractionRun)
        .filter(ExtractionRun.source_id == source.id)
        .order_by(ExtractionRun.version.desc())
        .all()
    )
    counts: dict = {}
    for run_id, item_type, n in (
        db.query(ProjectItem.extraction_run_id, ProjectItem.item_type, func.count(ProjectItem.id))
        .filter(ProjectItem.source_id == source.id, ProjectItem.extraction_run_id.isnot(None))
        .group_by(ProjectItem.extraction_run_id, ProjectItem.item_type)
    ):
        counts.setdefault(str(run_id), {})[item_type] = n
    creators = {
        str(uid): name
        for uid, name in db.query(User.id, User.name).filter(
            User.id.in_([r.created_by for r in runs if r.created_by])
        )
    }
    job = latest_job_for_source(db, source.id)
    return {
        "source_id": str(source.id),
        "can_manage": has_access(project_access_level(db, user, source.project), ADMIN),  # activate / re-extract
        "runs": [
            {
                "id": str(r.id),
                "version": r.version,
                "model": r.model,
                "prompt_version": r.prompt_version,
                "status": r.status,
                "is_active": r.is_active,
                "created_at": r.created_at.isoformat() if r.created_at else None,
                "created_by": str(r.created_by) if r.created_by else None,
                "created_by_name": creators.get(str(r.created_by)) if r.created_by else None,
                "input_tokens": r.input_tokens,
                "output_tokens": r.output_tokens,
                "item_count": sum(counts.get(str(r.id), {}).values()),
                "counts_by_type": counts.get(str(r.id), {}),
            }
            for r in runs
        ],
        # Story 13.7: lets the UI show a re-extraction in progress / its failure
        "latest_job": (
            {"type": job.type, "status": job.status, "last_error": job.last_error} if job is not None else None
        ),
    }


@router.get("/sources/{source_id}/extraction-runs")
async def list_extraction_runs(source_id: UUID, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Versions of the meeting's extraction, newest first, with item counts (any project reader)."""
    source = require_source_access(db, user, source_id)
    return _runs_payload(db, source, user)


@router.post("/sources/{source_id}/extraction-runs/{run_id}/activate")
async def activate_extraction_run(
    source_id: UUID, run_id: UUID, db: Session = Depends(get_db), user=Depends(get_current_user)
):
    """Make a version the active one (rollback). Organization admins only; atomic."""
    source = require_source_access(db, user, source_id, ADMIN)
    run = (
        db.query(ExtractionRun)
        .filter(ExtractionRun.id == str(run_id), ExtractionRun.source_id == source.id)
        .first()
    )
    if run is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Extraction run not found")
    try:
        activate_run(db, source, run)
    except Exception:
        db.rollback()
        raise
    return _runs_payload(db, source, user)


@router.post("/sources/{source_id}/re-extract", status_code=status.HTTP_202_ACCEPTED)
async def re_extract_source(source_id: UUID, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Queue another extraction of a processed meeting; it becomes a new active version.

    Organization admins only. The previous versions are kept.
    """
    source = require_source_access(db, user, source_id, ADMIN)
    if source.source_type not in EXTRACTABLE_SOURCE_TYPES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only meetings can be re-extracted")
    if source.ingestion_status != "processed":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only processed meetings can be re-extracted")
    job = latest_job_for_source(db, source.id)
    if job is not None and job.status in ("queued", "running"):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="An extraction is already in progress")
    enqueue(
        db,
        "process_source",
        {"source_id": str(source.id), "re_extract": True, "created_by": str(user.id)},
        source_id=source.id,
    )
    db.commit()
    return {"id": str(source.id), "status": "queued"}
