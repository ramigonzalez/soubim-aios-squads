"""Manual upload of meeting recordings and transcripts (Story 13.5).

- GET  /api/uploads/projects   → projects the user can upload into (write access)
- POST /api/uploads/presign    → validate a video and get a signed PUT URL (browser → storage)
- POST /api/uploads/complete   → verify the stored video and create the pending meeting
                                 (a transcript-only upload only calls this one)
"""

from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.middleware.auth import get_current_user
from app.api.routes.fathom import fathom_import_projects
from app.database.session import get_db
from app.services import manual_upload
from app.services.access import WRITE, require_project_access

router = APIRouter()


class PresignRequest(BaseModel):
    project_id: str = Field(..., min_length=1, max_length=64)
    filename: str = Field(..., min_length=1, max_length=255)
    size: int = Field(..., ge=0)


class CompleteRequest(BaseModel):
    project_id: str = Field(..., min_length=1, max_length=64)
    title: str = Field(..., min_length=1, max_length=500)
    occurred_at: datetime
    participants: List[str] = Field(default_factory=list)
    transcript: Optional[str] = None
    source_id: Optional[str] = Field(None, max_length=64)
    video_extension: Optional[str] = Field(None, max_length=8)
    upload_token: Optional[str] = Field(None, max_length=200)


@router.get("/uploads/projects")
def upload_projects(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return fathom_import_projects(db, user)


@router.post("/uploads/presign")
def presign_upload(body: PresignRequest, db: Session = Depends(get_db), user=Depends(get_current_user)):
    project = require_project_access(db, user, body.project_id, WRITE)
    try:
        return manual_upload.presign(project, user.id, body.filename, body.size)
    except manual_upload.UploadError as exc:
        raise HTTPException(status_code=exc.status, detail=exc.detail)


@router.post("/uploads/complete", status_code=status.HTTP_201_CREATED)
def complete_upload(body: CompleteRequest, db: Session = Depends(get_db), user=Depends(get_current_user)):
    project = require_project_access(db, user, body.project_id, WRITE)
    occurred_at = body.occurred_at
    if occurred_at.tzinfo is not None:  # sources store naive UTC
        occurred_at = occurred_at.astimezone(timezone.utc).replace(tzinfo=None)
    try:
        source = manual_upload.complete(
            db,
            project,
            title=body.title,
            occurred_at=occurred_at,
            participants=body.participants,
            transcript=body.transcript,
            source_id=body.source_id,
            video_ext=body.video_extension,
            user_id=str(user.id),
            upload_token=body.upload_token,
        )
    except manual_upload.UploadError as exc:
        raise HTTPException(status_code=exc.status, detail=exc.detail)
    return {"id": str(source.id), "project_id": str(source.project_id), "title": source.title}
