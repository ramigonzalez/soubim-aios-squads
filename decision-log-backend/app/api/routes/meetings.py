"""Meeting viewer endpoints (Story 7.13): meeting transcript + recording link, and recording streaming."""

import mimetypes
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.middleware.auth import get_current_user
from app.database.session import get_db
from app.services.access import can_change_visibility, require_source_access
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
    """Transcript, summary and recording link for the meeting viewer.

    Story 12.2: the signed recording link is only issued after the organization access check.
    """
    source = require_source_access(db, user, source_id)

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
        # Story 12.4
        "visibility": source.visibility,
        "can_change_visibility": can_change_visibility(db, user, source),
    }


class VisibilityUpdate(BaseModel):
    visibility: Literal["internal", "shared"]


@router.patch("/sources/{source_id}/visibility")
async def set_meeting_visibility(
    source_id: UUID, body: VisibilityUpdate, db: Session = Depends(get_db), user=Depends(get_current_user)
):
    """Story 12.4: share a meeting with every organization on the project, or make it internal again.

    Only owner/admin of the meeting's owner organization (404 if the meeting is not visible, 403 otherwise).
    Its items follow immediately (visibility is read from the source on every request).
    """
    source = require_source_access(db, user, source_id)
    if not can_change_visibility(db, user, source):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins of the meeting's organization can change its visibility",
        )
    source.visibility = body.visibility
    db.commit()
    return {"id": str(source.id), "visibility": source.visibility, "can_change_visibility": True}


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
