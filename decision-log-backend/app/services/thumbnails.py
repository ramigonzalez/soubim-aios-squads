"""Meeting thumbnails (Story 13.12).

Fathom's API has no thumbnail, so we generate our own from the stored recording: a worker job
(`thumbnail`) lets ffmpeg read one frame straight from a short-lived presigned URL (seeking
before the input, so the whole video is never downloaded), scales it to 640 px wide and
stores it as `org/<org>/sources/<id>/thumbnail.jpg`. `sources.thumbnail_key` marks it done.

A thumbnail is a nicety: enqueueing never raises, and a failing job is retried a few times and
then given up quietly. The job deliberately carries no `source_id`, so the worker never marks
the meeting itself as failed.

Serving (`thumbnail_url`) is a presigned GET issued only by routes that already passed the
access + visibility checks, exactly like the recording link.
"""

import logging
import os
import subprocess
import tempfile
from typing import Optional

from sqlalchemy.orm import Session

from app.database.models import Source
from app.services import jobs, recordings, storage

logger = logging.getLogger(__name__)

JOB_TYPE = "thumbnail"
MAX_ATTEMPTS = 3
SOURCE_URL_TTL = 15 * 60  # the presigned video link ffmpeg reads from
MAX_SEEK_SECONDS = 60
FFMPEG_TIMEOUT_SECONDS = 120
FFPROBE_TIMEOUT_SECONDS = 30
WIDTH = 640


class ThumbnailError(Exception):
    """ffmpeg could not produce a frame."""


def _probe_duration(video_url: str) -> Optional[float]:
    """Video length in seconds via ffprobe, or None if unknown."""
    try:
        result = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", video_url],
            capture_output=True, text=True, timeout=FFPROBE_TIMEOUT_SECONDS, check=True,
        )
        seconds = float(result.stdout.strip())
        return seconds if seconds > 0 else None
    except (subprocess.SubprocessError, ValueError, OSError):
        return None


def _extract_frame(video_url: str, out_path: str, seek: float) -> bool:
    """One ffmpeg run; True when a non-empty JPEG was written. `-ss` before `-i` seeks without downloading."""
    if os.path.exists(out_path):
        os.remove(out_path)
    cmd = [
        "ffmpeg", "-y", "-loglevel", "error", "-ss", f"{seek:.2f}", "-i", video_url,
        "-frames:v", "1", "-vf", f"scale={WIDTH}:-2", "-q:v", "4", out_path,
    ]
    try:
        subprocess.run(cmd, capture_output=True, timeout=FFMPEG_TIMEOUT_SECONDS, check=True)
    except (subprocess.SubprocessError, OSError):
        return False
    return os.path.isfile(out_path) and os.path.getsize(out_path) > 0


def render_thumbnail(video_url: str, out_path: str) -> None:
    """Write a 640 px wide JPEG of the video to `out_path`. Raises ThumbnailError.

    Frame at min(60 s, 10 % of the duration); falls back to the first frame. Tests replace this function.
    """
    duration = _probe_duration(video_url)
    seek = min(float(MAX_SEEK_SECONDS), duration * 0.1) if duration else 0.0
    if seek > 0 and _extract_frame(video_url, out_path, seek):
        return
    if _extract_frame(video_url, out_path, 0.0):
        return
    raise ThumbnailError("ffmpeg produced no frame")


def generate(db: Session, source_id) -> None:
    """Worker handler body: make and store the thumbnail of a source's recording. Commits."""
    source = db.query(Source).filter(Source.id == str(source_id)).first()
    if source is None:
        raise jobs.PermanentJobError("The meeting was removed")
    if source.thumbnail_key:
        return  # already done (job ran twice)
    if not storage.is_enabled():
        raise jobs.PermanentJobError("Recording storage is not configured on the worker")
    org_id = recordings.org_id_for_source(db, source)
    video_key = storage.find_key(storage.recording_prefix(org_id, str(source.id)))
    if not video_key:
        raise jobs.PermanentJobError("The meeting has no stored recording")
    key = storage.thumbnail_key(org_id, str(source.id))
    video_url = storage.presigned_get(video_key, SOURCE_URL_TTL)
    with tempfile.TemporaryDirectory(prefix="thumb-") as tmp:
        out_path = os.path.join(tmp, "thumbnail.jpg")
        try:
            render_thumbnail(video_url, out_path)
        except ThumbnailError as exc:
            raise RuntimeError(str(exc)) from exc
        storage.put_file(out_path, key, "image/jpeg")
    source.thumbnail_key = key
    db.commit()
    logger.info("Thumbnail stored for source %s (%s)", source.id, key)


def enqueue(db: Session, source: Source) -> bool:
    """Queue a thumbnail job for a source with a stored recording. Never raises; commits on success."""
    try:
        if not storage.is_enabled() or source.thumbnail_key:
            return False
        jobs.enqueue(
            db, JOB_TYPE, {"source_id": str(source.id)},
            organization_id=source.owner_organization_id, max_attempts=MAX_ATTEMPTS,
        )
        db.commit()
        return True
    except Exception:  # a thumbnail must never break an import or an upload
        logger.exception("Could not enqueue the thumbnail of source %s", source.id)
        db.rollback()
        return False


def thumbnail_url(source: Source) -> Optional[str]:
    """Presigned GET for the thumbnail, or None. Call only after the access + visibility checks."""
    if not source.thumbnail_key or not storage.is_enabled():
        return None
    try:
        return storage.presigned_get(source.thumbnail_key, recordings.LINK_TTL_SECONDS)
    except Exception:
        logger.exception("Could not sign the thumbnail of source %s", source.id)
        return None
