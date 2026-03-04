"""Source curation API endpoints.

Story 7.7: Manual triggers for upload and sync operations.
"""

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.database.models import Source
from app.database.session import get_db
from app.services.source_curation import SourceCurationService

router = APIRouter()


def _require_admin(request: Request):
    """Require admin/director role for access."""
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


@router.post("/sources/{source_id}/upload-to-storage")
async def upload_source_to_storage(
    source_id: str,
    request: Request,
    db: Session = Depends(get_db),
):
    """Manually trigger upload of a source to external storage for curation.

    Admin-only. Useful when auto-upload was missed or needs to be retried.
    """
    _require_admin(request)

    source = db.query(Source).filter(Source.id == source_id).first()
    if not source:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Source not found",
        )

    service = SourceCurationService(db)
    success = service.upload_to_storage(source_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Upload failed — source may lack raw_content or project may lack drive_folder_id",
        )

    return {"status": "uploaded", "source_id": source_id}


@router.post("/sources/sync")
async def trigger_curation_sync(
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Manually trigger a curation sync poll for all uploaded sources.

    Admin-only. Runs in background and returns immediately.
    """
    _require_admin(request)

    def _run_sync():
        from app.database.session import SessionLocal
        sync_db = SessionLocal()
        try:
            service = SourceCurationService(sync_db)
            service.poll_non_processed()
        finally:
            sync_db.close()

    background_tasks.add_task(_run_sync)
    return {"status": "sync_triggered"}


@router.get("/sources/{source_id}/curation-status")
async def get_curation_status(
    source_id: str,
    request: Request,
    db: Session = Depends(get_db),
):
    """Get curation status for a specific source."""
    user = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    source = db.query(Source).filter(Source.id == source_id).first()
    if not source:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Source not found",
        )

    return {
        "source_id": str(source.id),
        "curation_status": source.curation_status or "raw",
        "last_synced_at": source.last_synced_at.isoformat() if source.last_synced_at else None,
        "drive_file_id": source.drive_file_id,
        "file_url": source.file_url,
    }
