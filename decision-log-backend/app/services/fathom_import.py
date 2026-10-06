"""Browse & import Fathom meetings (Story 13.4).

The user picks a recording from their own Fathom list and a target project; ``start_import``
records a ``fathom_imports`` row and enqueues a ``fathom_import`` job. The worker
(``run_import``):

1. finds the meeting in the importer's Fathom list (title, times, invitees, transcript),
2. asks Fathom to prepare the download (``POST /recordings/{id}/download``) and polls it
   (``GET /recordings/{id}/downloads/{download_id}``) until a signed video URL is ready,
3. streams the MP4 into storage under the project owner's organization (no local file),
4. creates the Source (``meeting``, ``pending``) with the transcript in our ``M:SS - Name``
   format, so it shows up in Ingestão ready for approval/extraction. Nothing is extracted
   automatically.

Errors that retrying will not fix (no media, recording not in the account, reconnect needed,
too large) fail the job at once; the others retry with the queue's backoff. A failed import
can be retried by the importer.
"""

import logging
import time
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from urllib.parse import urlparse

import httpx
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database.models import FathomConnection, FathomImport, Project, Source
from app.database.session import SessionLocal
from app.integrations import fathom
from app.services import jobs, storage, thumbnails
from app.services.access import INTERNAL, VISIBILITIES, acting_organization_id, owned_object_visible, source_visible

logger = logging.getLogger(__name__)

JOB_TYPE = "fathom_import"
MAX_ATTEMPTS = 5  # long meetings can take a while to be prepared by Fathom
POLL_INTERVAL_SECONDS = 5.0
POLL_BUDGET_SECONDS = 600.0  # then the job retries later (the download id is kept)
MAX_SCAN_PAGES = 30  # pages of the Fathom list searched for the recording
SOURCE_LABEL = "Fathom"

_sleep = time.sleep  # replaced in tests
_video_get = None  # storage.put_stream_from_url http_get; None = httpx.stream (replaced in tests)


class ImportExists(Exception):
    """The recording is already imported (or being imported) into the project."""

    def __init__(self, existing: FathomImport):
        self.existing = existing
        super().__init__("This Fathom recording is already imported into the project")


class ImportNotRetryable(Exception):
    """Only failed imports can be retried."""


# --------------------------------------------------------------------------- API side


def start_import(db: Session, user, project: Project, recording_id: str, visibility: str = INTERNAL) -> FathomImport:
    """Record the import and enqueue its job. Commits. Raises ImportExists for a duplicate.

    Story 12.4: the meeting will be owned by the importer's organization on the project and get
    ``visibility`` (``internal`` by default; the route checks who may pick ``shared``).
    """
    recording_id = str(recording_id)
    if not fathom.is_valid_id(recording_id):
        raise ValueError("invalid recording id")
    if visibility not in VISIBILITIES:
        raise ValueError("invalid visibility")
    existing = find_import(db, project.id, recording_id)
    if existing is not None:
        raise ImportExists(existing)
    imp = FathomImport(
        id=uuid.uuid4(), project_id=project.id, recording_id=recording_id, user_id=user.id,
        owner_organization_id=acting_organization_id(db, user, project), visibility=visibility,
    )
    db.add(imp)
    try:
        db.flush()
    except IntegrityError:  # a concurrent request inserted it first
        db.rollback()
        raise ImportExists(find_import(db, project.id, recording_id))
    _enqueue(db, imp, project)
    db.commit()
    db.refresh(imp)
    logger.info("Fathom import %s queued: recording %s → project %s by user %s", imp.id, recording_id, project.id, user.id)
    return imp


def retry_import(db: Session, imp: FathomImport) -> FathomImport:
    """Enqueue a new job for a failed import. Commits."""
    if import_state(imp) != "failed":
        raise ImportNotRetryable("Only failed imports can be retried")
    _enqueue(db, imp, imp.project)
    db.commit()
    db.refresh(imp)
    return imp


def _enqueue(db: Session, imp: FathomImport, project: Project) -> None:
    job = jobs.enqueue(
        db, JOB_TYPE, {"import_id": str(imp.id)},
        organization_id=project.owner_organization_id, max_attempts=MAX_ATTEMPTS,
    )
    imp.job_id = job.id
    imp.job = job


def find_import(db: Session, project_id, recording_id: str) -> Optional[FathomImport]:
    return (
        db.query(FathomImport)
        .filter(FathomImport.project_id == project_id, FathomImport.recording_id == str(recording_id))
        .first()
    )


def import_visible(db: Session, user, imp: Optional[FathomImport]) -> bool:
    """Story 12.4: can ``user`` see this import? Once imported, exactly when they can see the meeting
    (its visibility may have changed since); before, by the import's owner organization/visibility."""
    if imp is None:
        return False
    if imp.source is not None:
        return source_visible(db, user, imp.source)
    return owned_object_visible(db, user, imp.project, imp.owner_organization_id, imp.visibility)


def import_state(imp: FathomImport) -> str:
    """imported | queued | running | failed (derived from the Source and the job)."""
    if imp.source_id is not None:
        return "imported"
    job = imp.job
    if job is None or job.status in ("failed", "succeeded"):  # succeeded without a source: should not happen
        return "failed"
    return job.status  # queued (maybe waiting to retry) | running


# --------------------------------------------------------------------------- Fathom → our format


def _parse_time(value) -> Optional[datetime]:
    """ISO-8601 (``Z`` or offset) → naive UTC, like every DateTime column; None if missing/invalid."""
    if not isinstance(value, str) or not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is not None:
        parsed = parsed.astimezone(timezone.utc).replace(tzinfo=None)
    return parsed


def _timestamp_seconds(value) -> int:
    """Fathom segment timestamp ("HH:MM:SS", "MM:SS" or seconds) → seconds."""
    if isinstance(value, (int, float)):
        return max(0, int(value))
    try:
        parts = [float(p) for p in str(value or "0").split(":")]
    except ValueError:
        return 0
    total = 0.0
    for part in parts:
        total = total * 60 + part
    return max(0, int(total))


def format_timestamp(seconds: int) -> str:
    """``M:SS`` (``H:MM:SS`` from one hour) — same as the frontend's formatSeconds."""
    h, rest = divmod(max(0, int(seconds)), 3600)
    m, s = divmod(rest, 60)
    return f"{h}:{m:02d}:{s:02d}" if h else f"{m}:{s:02d}"


def _one_line(text) -> str:
    return " ".join(str(text or "").split())


def format_transcript(segments) -> str:
    """Fathom transcript segments → our stored format (parsed by the meeting viewer and read by
    extraction): a ``M:SS - Name`` header line per segment followed by the indented speech."""
    lines: List[str] = []
    for seg in segments or []:
        if not isinstance(seg, dict):
            continue
        text = _one_line(seg.get("text"))
        if not text:
            continue
        speaker = seg.get("speaker")
        name = speaker.get("display_name") if isinstance(speaker, dict) else speaker
        name = _one_line(name) or "Unknown"
        lines.append(f"{format_timestamp(_timestamp_seconds(seg.get('timestamp')))} - {name}")
        lines.append(f"  {text}")
    return "\n".join(lines)


def _person(entry) -> Optional[Dict[str, Optional[str]]]:
    if not isinstance(entry, dict):
        return None
    name = _one_line(entry.get("name")) or None
    email = _one_line(entry.get("email")) or None
    if not (name or email):
        return None
    return {"name": name or email, "email": email}


def meeting_platform(meeting_url) -> Optional[str]:
    """``meet`` | ``zoom`` | ``teams`` from the video-call link, or None when unknown (Story 13.12)."""
    if not isinstance(meeting_url, str):
        return None
    host = (urlparse(meeting_url.strip()).hostname or "").lower()
    for platform, domains in (("meet", ("meet.google.com",)), ("zoom", ("zoom.us", "zoom.com")),
                              ("teams", ("teams.microsoft.com", "teams.live.com"))):
        if any(host == d or host.endswith("." + d) for d in domains):
            return platform
    return None


def meeting_summary(item: Dict[str, Any]) -> Dict[str, Any]:
    """The fields of a Fathom list item that the browse page shows (no transcript)."""
    started = _parse_time(item.get("recording_start_time")) or _parse_time(item.get("scheduled_start_time")) \
        or _parse_time(item.get("created_at"))
    ended = _parse_time(item.get("recording_end_time")) or _parse_time(item.get("scheduled_end_time"))
    duration = round((ended - started).total_seconds() / 60) if started and ended and ended > started else None
    invitees = [p for p in (_person(i) for i in item.get("calendar_invitees") or []) if p]
    recorder = _person(item.get("recorded_by"))
    return {
        "recording_id": str(item.get("recording_id")),
        "title": _one_line(item.get("title") or item.get("meeting_title")) or None,
        "started_at": started.isoformat() + "Z" if started else None,  # UTC
        "duration_minutes": duration,
        "invitees": invitees,
        "recorded_by": recorder,
        "share_url": item.get("share_url") if isinstance(item.get("share_url"), str) else None,
        "platform": meeting_platform(item.get("meeting_url")),  # Story 13.12
    }


# --------------------------------------------------------------------------- worker side


def run_import(import_id: str, session_factory=None) -> None:
    """Worker handler for ``fathom_import`` jobs."""
    db = (session_factory or SessionLocal)()
    try:
        _run(db, uuid.UUID(str(import_id)))
    finally:
        db.close()


def _permanent(message: str) -> jobs.PermanentJobError:
    return jobs.PermanentJobError(message)


def _run(db: Session, import_id: uuid.UUID) -> None:
    imp = db.get(FathomImport, import_id)
    if imp is None:
        raise _permanent("The import was removed")
    if imp.source_id is not None:
        return  # already imported (job ran twice)
    if not fathom.is_configured():
        raise _permanent("Fathom integration is not configured on the worker")
    if not storage.is_enabled():
        raise _permanent("Recording storage is not configured on the worker")
    conn = db.query(FathomConnection).filter(FathomConnection.user_id == imp.user_id).first() if imp.user_id else None
    if conn is None:
        raise _permanent("The importing user's Fathom account is not connected")

    client = fathom.FathomClient(db, conn)
    try:
        meeting = _find_meeting(client, imp.recording_id)
        video_url = _wait_for_download(db, client, imp)
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

    project = imp.project
    org_id = str(project.owner_organization_id) if project.owner_organization_id else None
    key = storage.recording_key(org_id, str(imp.id), ".mp4")
    try:
        size = storage.put_stream_from_url(video_url, key, http_get=_video_get)
    except storage.RecordingTooLarge as exc:
        raise _permanent(f"Recording too large: {exc}")
    except httpx.HTTPStatusError as exc:
        if exc.response.status_code in (403, 404, 410):  # signed link expired: prepare a new download
            imp.download_id = None
            db.commit()
            raise RuntimeError(f"The Fathom download link expired (HTTP {exc.response.status_code}); will request a new one")
        raise

    summary = meeting_summary(meeting)
    occurred_at = _parse_time(summary["started_at"]) or datetime.utcnow()
    source = Source(
        id=imp.id,
        project_id=imp.project_id,
        source_type="meeting",
        title=summary["title"] or "Fathom meeting",
        occurred_at=occurred_at,
        duration_minutes=summary["duration_minutes"],
        participants=summary["invitees"] or ([summary["recorded_by"]] if summary["recorded_by"] else []),
        raw_content=format_transcript(meeting.get("transcript")),
        recording_url=summary["share_url"],
        # Story 12.4: owner/visibility chosen at import (None owner → project owner on flush)
        owner_organization_id=imp.owner_organization_id,
        visibility=imp.visibility or INTERNAL,
        ingestion_status="pending",
        included=False,
        source_label=SOURCE_LABEL,
    )
    db.add(source)
    db.flush()
    imp.source_id = source.id
    imp.download_id = None
    db.commit()
    logger.info("Fathom import %s done: source %s, %s bytes stored", imp.id, source.id, size)
    thumbnails.enqueue(db, source)  # Story 13.12: never fails the import


def _find_meeting(client: fathom.FathomClient, recording_id: str) -> Dict[str, Any]:
    """The meeting from the importer's own Fathom list, with its transcript.

    Only recordings the importer's Fathom account can see are found — a recording id of
    somebody else's account fails here. The transcript comes from /recordings/{id}/transcript:
    OAuth users may not include it in /meetings.
    """
    cursor = None
    for _ in range(MAX_SCAN_PAGES):
        page = client.list_meetings(cursor=cursor)
        for item in page.items:
            if str(item.get("recording_id")) == recording_id:
                return {**item, "transcript": client.get_transcript(recording_id)}
        cursor = page.next_cursor
        if not cursor:
            break
    raise _permanent("Recording not found in your Fathom account")


def _video_url(status: Dict[str, Any]) -> Optional[str]:
    video = status.get("video")
    if isinstance(video, dict):
        video = video.get("url")
    return video if isinstance(video, str) and video.startswith("https://") else None


def _wait_for_download(db: Session, client: fathom.FathomClient, imp: FathomImport) -> str:
    """Signed video URL of a completed Fathom download (requests one if needed, then polls)."""
    status: Optional[Dict[str, Any]] = None
    if imp.download_id:
        try:
            status = client.download_status(imp.recording_id, imp.download_id)
        except fathom.FathomAPIError as exc:
            if exc.status_code != 404:
                raise
            status = None  # unknown to Fathom anymore: request a new one
    if status is None:
        status = client.request_download(imp.recording_id)
        download_id = status.get("download_id")
        if not download_id or not fathom.is_valid_id(download_id):
            raise _permanent("Fathom did not return a download id")
        imp.download_id = str(download_id)
        db.commit()

    deadline = time.monotonic() + POLL_BUDGET_SECONDS
    while True:
        state = status.get("status")
        if state == "completed":
            url = _video_url(status)
            if not url:
                raise _permanent("Fathom download completed without a video link")
            return url
        if state in ("failed", "expired"):
            imp.download_id = None  # the next attempt requests a new download
            db.commit()
            raise RuntimeError(f"Fathom download {state}; will request a new one")
        if time.monotonic() >= deadline:
            raise RuntimeError("Fathom is still preparing the recording; will check again")
        _sleep(POLL_INTERVAL_SECONDS)
        status = client.download_status(imp.recording_id, imp.download_id)
