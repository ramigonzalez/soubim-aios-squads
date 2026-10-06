"""Manual upload of a recording and/or transcript (Story 13.5).

Flow: ``presign`` hands the browser a signed PUT URL for the video (key under the project's
organization, with a pre-allocated Source id); the browser uploads straight to storage, never
through the API; ``complete`` verifies the object (HEAD) and creates the pending Source in
Ingestão. A transcript-only upload skips storage entirely. Nothing is extracted until the
meeting is approved.
"""

import logging
import uuid
from datetime import datetime
from typing import List, Optional

from sqlalchemy.orm import Session

from app.config import settings
from app.database.models import Project, Source
from app.services import recordings, storage

logger = logging.getLogger(__name__)

SOURCE_LABEL = "Upload"
UPLOAD_URL_TTL = 2 * 60 * 60  # seconds; a 2 GB video on a slow link
MAX_TRANSCRIPT_CHARS = 2_000_000
MAX_PARTICIPANTS = 100


class UploadError(Exception):
    """A rejected upload; ``status`` is the HTTP status the route should answer with."""

    def __init__(self, status: int, detail: str):
        self.status = status
        self.detail = detail
        super().__init__(detail)


def video_extension(filename: str) -> str:
    """".mp4" etc. from a file name; 415 if it is not an accepted video type."""
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    if ext not in recordings.VIDEO_EXTENSIONS:
        raise UploadError(415, f"Unsupported video type; use one of {', '.join(recordings.VIDEO_EXTENSIONS)}")
    return ext


def _org_id(project: Project) -> Optional[str]:
    org = getattr(project, "owner_organization_id", None)
    return str(org) if org else None


def presign(project: Project, filename: str, size: int) -> dict:
    """Validate the video and return the signed PUT target. The caller checked write access."""
    if not storage.is_enabled():
        raise UploadError(503, "Recording storage is not configured")
    ext = video_extension(filename)
    if size <= 0:
        raise UploadError(422, "The video file is empty")
    if size > settings.recording_max_bytes:
        raise UploadError(413, f"The video exceeds the limit of {settings.recording_max_bytes} bytes")
    source_id = str(uuid.uuid4())
    content_type = recordings.CONTENT_TYPES[ext]
    key = storage.recording_key(_org_id(project), source_id, ext)
    try:
        url = storage.presigned_put(key, content_type, UPLOAD_URL_TTL)
    except Exception as exc:
        logger.exception("Could not presign upload for project %s", project.id)
        raise UploadError(503, "Recording storage is unavailable") from exc
    return {
        "source_id": source_id,
        "video_extension": ext,
        "upload_url": url,
        "method": "PUT",
        "headers": {"Content-Type": content_type},
        "expires_in": UPLOAD_URL_TTL,
        "max_bytes": settings.recording_max_bytes,
    }


def complete(
    db: Session,
    project: Project,
    *,
    title: str,
    occurred_at: datetime,
    participants: List[str],
    transcript: Optional[str],
    source_id: Optional[str],
    video_ext: Optional[str],
) -> Source:
    """Create the pending Source; verify the uploaded video first when there is one."""
    transcript = (transcript or "").strip() or None
    if transcript and len(transcript) > MAX_TRANSCRIPT_CHARS:
        raise UploadError(413, "The transcript is too large")
    if not source_id and not transcript:
        raise UploadError(422, "Upload a video, a transcript, or both")

    new_id = uuid.uuid4()
    if source_id:
        try:
            new_id = uuid.UUID(source_id)
        except ValueError:
            raise UploadError(422, "Invalid source_id")
        ext = video_extension("video." + (video_ext or "").lstrip("."))
        if not storage.is_enabled():
            raise UploadError(503, "Recording storage is not configured")
        if db.query(Source.id).filter(Source.id == new_id).first():
            raise UploadError(409, "This upload was already completed")
        key = storage.recording_key(_org_id(project), str(new_id), ext)
        try:
            meta = storage.head(key)
        except storage.StorageError as exc:
            raise UploadError(503, "Recording storage is unavailable") from exc
        if meta is None:
            raise UploadError(404, "The video was not found in storage; upload it again")
        if meta["size"] <= 0 or meta["size"] > settings.recording_max_bytes:
            storage.delete(key)
            raise UploadError(413, "The uploaded video is empty or exceeds the size limit")

    source = Source(
        id=new_id,
        project_id=project.id,
        source_type="meeting",
        title=title.strip(),
        occurred_at=occurred_at,
        participants=[p.strip() for p in participants if p and p.strip()][:MAX_PARTICIPANTS],
        raw_content=transcript,
        ingestion_status="pending",
        included=False,
        source_label=SOURCE_LABEL,
    )
    db.add(source)
    db.commit()
    db.refresh(source)
    return source
