"""Meeting viewer endpoints (Story 7.13): meeting transcript + recording link, and recording streaming."""

import mimetypes
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.middleware.auth import get_current_user
from app.database.session import get_db
from app.services.access import (
    READ,
    WRITE,
    can_change_visibility,
    has_access,
    project_access_level,
    require_project_access,
    require_source_access,
)
from app.services.meeting_view import (
    apply_speaker_corrections,
    corrections_for,
    item_counts,
    participant_names,
    project_meetings,
    speaker_candidates,
)
from app.database.models import TranscriptSpeakerCorrection
from app.services.project_externals import external_user_ids
from app.services.thumbnails import thumbnail_url
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
        # Promem revamp G4: speaker corrections applied; the stored transcript is unchanged
        "transcript": apply_speaker_corrections(source.raw_content, corrections_for(db, source.id)),
        "recording": recording,
        # Promem revamp: header pills, tool label and candidates for uncertain speakers
        "participants": participant_names(source.participants),
        "label": source.source_label,
        "meeting_type": source.meeting_type,
        "speaker_candidates": speaker_candidates(db, source),
        "can_correct_speakers": _can_write(db, user, source),
        "thumbnail_url": thumbnail_url(source),  # Story 13.12: only after the access + visibility check above
        # Story 12.4
        "visibility": source.visibility,
        "can_change_visibility": can_change_visibility(db, user, source),
        # Story 12.15: who added the meeting; "Externo" badge when they are an external person
        "created_by_name": source.creator.name if source.creator else None,
        "created_by_external": source.created_by is not None
        and str(source.created_by) in external_user_ids(db, source.project),
    }


def _can_write(db: Session, user, source) -> bool:
    return has_access(project_access_level(db, user, source.project), WRITE)


class SpeakerCorrection(BaseModel):
    start: int = Field(..., ge=0, description="Turn start, seconds from the beginning of the recording")
    speaker: str = Field(..., min_length=1, max_length=255)


@router.put("/sources/{source_id}/speakers")
async def correct_speaker(
    source_id: UUID, body: SpeakerCorrection, db: Session = Depends(get_db), user=Depends(get_current_user)
):
    """Promem revamp G4: pick who spoke in a turn the transcription marked as uncertain.

    Needs write access to the project. Stored as a correction (upsert per turn); the meeting endpoint
    applies it, so the transcript, the item excerpts and later re-extractions see the right name.
    """
    source = require_source_access(db, user, source_id, WRITE)
    speaker = body.speaker.strip()
    row = (
        db.query(TranscriptSpeakerCorrection)
        .filter(TranscriptSpeakerCorrection.source_id == source.id, TranscriptSpeakerCorrection.turn_start == body.start)
        .one_or_none()
    )
    if row is None:
        row = TranscriptSpeakerCorrection(source_id=source.id, turn_start=body.start, speaker=speaker, corrected_by=user.id)
        db.add(row)
    else:
        row.speaker = speaker
        row.corrected_by = user.id
    db.commit()
    return {"start": body.start, "speaker": speaker}


@router.get("/projects/{project_id}/meetings")
async def list_project_meetings(project_id: UUID, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Promem revamp G3: the project's approved meetings for the Reuniões list, newest first,
    with duration, tool, participants, AI summary and the items extracted from each (by type)."""
    require_project_access(db, user, project_id, READ)
    meetings = project_meetings(db, user, project_id)
    counts = item_counts(db, user, [m.id for m in meetings])
    return {
        "meetings": [
            {
                "id": str(m.id),
                "title": m.title,
                "occurred_at": m.occurred_at.isoformat() if m.occurred_at else None,
                "duration_minutes": m.duration_minutes,
                "label": m.source_label,
                "meeting_type": m.meeting_type,
                "participants": participant_names(m.participants),
                "summary": m.ai_summary,
                "visibility": m.visibility,
                "thumbnail_url": thumbnail_url(m),
                "item_counts": counts.get(str(m.id), {}),
                "item_count": sum(counts.get(str(m.id), {}).values()),
            }
            for m in meetings
        ]
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
