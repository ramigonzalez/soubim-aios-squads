"""Meeting viewer endpoints (Story 7.13): meeting transcript + recording link, and recording streaming."""

import mimetypes
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.api.middleware.auth import get_current_user
from app.api.routes.project_items import _check_project_access
from app.database.models import Source
from app.database.session import get_db
from app.services.recordings import (
    org_id_for_source,
    recording_file,
    signed_recording_path,
    storage_recording_url,
    verify_signature,
)

router = APIRouter()


@router.get("/sources/{source_id}/meeting")
async def get_meeting(source_id: UUID, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Transcript, summary and recording link for the meeting viewer."""
    source = db.query(Source).filter(Source.id == str(source_id)).first()
    if not source:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Source not found")
    _check_project_access(db, str(source.project_id), user)

    recording = None
    storage_url = storage_recording_url(org_id_for_source(db, source), str(source.id))
    if storage_url:  # Story 13.1: presigned storage link (Range works natively)
        recording = {"type": "file", "url": storage_url}
    elif recording_file(str(source.id)):
        recording = {"type": "file", "url": f"/api{signed_recording_path(str(source.id))}"}
    elif source.recording_url:
        recording = {"type": "external", "url": source.recording_url}

    return {
        "id": str(source.id),
        "project_id": str(source.project_id),
        "title": source.title,
        "source_type": source.source_type,
        "occurred_at": source.occurred_at.isoformat() if source.occurred_at else None,
        "duration_minutes": source.duration_minutes,
        "summary": source.ai_summary,
        "transcript": source.raw_content,
        "recording": recording,
    }


@router.get("/recordings/{source_id}")
async def stream_recording(
    source_id: UUID,
    expires: int = Query(...),
    signature: str = Query(...),
):
    """Stream a stored recording (supports Range requests, so the video can seek).

    Public path: access is granted by the signed, expiring link from /sources/{id}/meeting.
    """
    if not verify_signature(str(source_id), expires, signature):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid or expired recording link")
    path = recording_file(str(source_id))
    if path is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Recording not found")
    media_type = mimetypes.guess_type(path.name)[0] or "video/mp4"
    return FileResponse(path, media_type=media_type)
