"""On-demand previews of Fathom meetings that are not imported yet (Story 13.15).

Fathom's list has no image, so a user can ask for one meeting at a time ("Gerar prévia"). The
``fathom_preview`` worker job uses the user's own Fathom connection: it asks Fathom to prepare the
download (same request + polling as the 13.4 import), lets ffmpeg read ONE frame straight from the
signed ``video.url`` (13.12's ``render_thumbnail``) and stores only the JPEG at
``previews/user/<user_id>/fathom/<recording_id>.jpg``. The video is never stored.

Previews are private to the user (the meetings list is per Fathom account) and never touch a Source.
At most ``MAX_ACTIVE`` previews per user can be queued or processing at once.
"""

import logging
import os
import tempfile
import uuid
from datetime import datetime, timedelta
from typing import Dict, Iterable, Optional

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database.models import FathomConnection, FathomPreview, Job
from app.database.session import SessionLocal
from app.integrations import fathom
from app.services import fathom_import, jobs, recordings, storage, thumbnails

logger = logging.getLogger(__name__)

JOB_TYPE = "fathom_preview"
MAX_ATTEMPTS = 3
MAX_ACTIVE = 3  # previews queued or processing per user
ACTIVE_WINDOW = timedelta(hours=1)  # a row older than this is a lost job, not an active one
DOWNLOAD_REUSE = timedelta(hours=20)  # Fathom's signed link lasts ~24 h
ACTIVE = ("queued", "processing")


class PreviewCapReached(Exception):
    """The user already has MAX_ACTIVE previews being generated."""


def _now() -> datetime:
    return datetime.utcnow()


def get_preview(db: Session, user_id, recording_id: str) -> Optional[FathomPreview]:
    return (
        db.query(FathomPreview)
        .filter(FathomPreview.user_id == user_id, FathomPreview.recording_id == str(recording_id))
        .first()
    )


def active_count(db: Session, user_id) -> int:
    return (
        db.query(FathomPreview)
        .filter(
            FathomPreview.user_id == user_id,
            FathomPreview.status.in_(ACTIVE),
            FathomPreview.updated_at > _now() - ACTIVE_WINDOW,
        )
        .count()
    )


def request_preview(db: Session, user, recording_id: str) -> FathomPreview:
    """Create the preview and enqueue its job, or return the existing one. Commits.

    Idempotent: ready / queued / processing rows are returned as they are; a failed one is
    re-queued. Raises PreviewCapReached when the user already has MAX_ACTIVE in progress.
    """
    recording_id = str(recording_id)
    if not fathom.is_valid_id(recording_id):
        raise ValueError("invalid recording id")
    preview = get_preview(db, user.id, recording_id)
    if preview is not None and (preview.status == "ready" or (
        preview.status in ACTIVE and preview.updated_at > _now() - ACTIVE_WINDOW
    )):
        return preview
    if active_count(db, user.id) >= MAX_ACTIVE:
        raise PreviewCapReached()
    if preview is None:
        preview = FathomPreview(id=uuid.uuid4(), user_id=user.id, recording_id=recording_id)
        db.add(preview)
        try:
            db.flush()
        except IntegrityError:  # a concurrent request created it first
            db.rollback()
            return get_preview(db, user.id, recording_id)
    preview.status = "queued"
    preview.error = None
    preview.updated_at = _now()
    job = jobs.enqueue(db, JOB_TYPE, {"preview_id": str(preview.id)}, max_attempts=MAX_ATTEMPTS)
    preview.job_id = job.id
    db.commit()
    db.refresh(preview)
    logger.info("Fathom preview %s queued: recording %s by user %s", preview.id, recording_id, user.id)
    return preview


def preview_url(preview: FathomPreview) -> Optional[str]:
    """Presigned GET (6 h) for a ready preview, or None. Callers only pass the user's own previews."""
    if preview.status != "ready" or not preview.thumbnail_key or not storage.is_enabled():
        return None
    try:
        return storage.presigned_get(preview.thumbnail_key, recordings.LINK_TTL_SECONDS)
    except Exception:
        logger.exception("Could not sign the Fathom preview %s", preview.id)
        return None


def format_preview(preview: Optional[FathomPreview]) -> Optional[Dict[str, Optional[str]]]:
    if preview is None:
        return None
    return {"status": preview.status, "url": preview_url(preview)}


def previews_for(db: Session, user_id, recording_ids: Iterable[str]) -> Dict[str, Dict[str, Optional[str]]]:
    """``{recording_id: {status, url}}`` of the user's OWN previews among ``recording_ids``."""
    ids = list(recording_ids)
    if not ids:
        return {}
    rows = db.query(FathomPreview).filter(FathomPreview.user_id == user_id, FathomPreview.recording_id.in_(ids)).all()
    return {r.recording_id: format_preview(r) for r in rows}


def reusable_download_id(db: Session, user_id, recording_id: str) -> Optional[str]:
    """A recent Fathom download id of the user's preview, so an import can skip requesting a new one (13.4)."""
    preview = get_preview(db, user_id, recording_id)
    if preview and preview.download_id and preview.updated_at > _now() - DOWNLOAD_REUSE:
        return preview.download_id
    return None


# --------------------------------------------------------------------------- worker side


def run(preview_id: str, session_factory=None) -> None:
    """Worker handler for ``fathom_preview`` jobs. Records the outcome on the preview, re-raises failures."""
    db = (session_factory or SessionLocal)()
    try:
        try:
            _generate(db, uuid.UUID(str(preview_id)))
        except Exception as exc:
            db.rollback()
            _record_failure(db, uuid.UUID(str(preview_id)), exc)
            raise
    finally:
        db.close()


def _permanent(message: str) -> jobs.PermanentJobError:
    return jobs.PermanentJobError(message)


def _generate(db: Session, preview_id: uuid.UUID) -> None:
    preview = db.get(FathomPreview, preview_id)
    if preview is None:
        raise _permanent("The preview was removed")
    if preview.status == "ready":
        return  # job ran twice
    if not fathom.is_configured():
        raise _permanent("Fathom integration is not configured on the worker")
    if not storage.is_enabled():
        raise _permanent("Recording storage is not configured on the worker")
    conn = db.query(FathomConnection).filter(FathomConnection.user_id == preview.user_id).first()
    if conn is None:
        raise _permanent("The user's Fathom account is not connected")
    preview.status = "processing"
    db.commit()

    client = fathom.FathomClient(db, conn)
    try:
        video_url = fathom_import.wait_for_download(db, client, preview)  # reuses download_id, polls with the 13.4 budget
    except fathom.FathomReconnectRequired:
        raise _permanent("Fathom connection needs to be reconnected (Settings → Integrations)")
    except fathom.FathomAPIError as exc:
        if exc.status_code == 422:
            raise _permanent("Fathom has no media for this recording (HTTP 422)")
        if exc.status_code in (400, 403, 404):
            raise _permanent(f"Fathom refused the recording download: {exc}")
        raise  # 429 / 5xx: retry later
    finally:
        client.close()

    key = storage.fathom_preview_key(str(preview.user_id), preview.recording_id)
    with tempfile.TemporaryDirectory(prefix="fathom-preview-") as tmp:
        out_path = os.path.join(tmp, "preview.jpg")
        try:
            thumbnails.render_thumbnail(video_url, out_path)
        except thumbnails.ThumbnailError as exc:
            preview.download_id = None  # the signed link may be the problem: the retry asks for a new one
            db.commit()
            raise RuntimeError(str(exc)) from exc
        storage.put_file(out_path, key, "image/jpeg")  # only the JPEG; the video is never stored
    preview.thumbnail_key = key
    preview.status = "ready"
    preview.error = None
    db.commit()
    logger.info("Fathom preview %s ready (%s)", preview.id, key)


def _record_failure(db: Session, preview_id: uuid.UUID, exc: Exception) -> None:
    """Back to ``queued`` when the queue will retry, ``failed`` when it gave up. Never raises."""
    try:
        preview = db.get(FathomPreview, preview_id)
        if preview is None or preview.status == "ready":
            return
        job = db.get(Job, preview.job_id) if preview.job_id else None
        permanent = isinstance(exc, (jobs.PermanentJobError, KeyError, ValueError))
        final = permanent or job is None or job.attempts >= job.max_attempts
        preview.status = "failed" if final else "queued"
        preview.error = (str(exc) or exc.__class__.__name__)[:500]
        db.commit()
        logger.warning("Fathom preview %s %s: %s", preview_id, "failed" if final else "will retry", preview.error)
    except Exception:
        logger.exception("Could not record the failure of Fathom preview %s", preview_id)
        db.rollback()
