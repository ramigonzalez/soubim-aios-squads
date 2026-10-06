"""Fathom connection endpoints (Story 13.3).

- GET    /api/integrations/fathom/connect  → {url}: the Fathom consent page (auth required)
- GET    /api/fathom/callback              → Fathom redirects here (public): parks the tokens as *pending*
- POST   /api/integrations/fathom/confirm  → the logged-in user claims the pending tokens (must match the state's user)
- GET    /api/integrations/fathom          → connection status
- DELETE /api/integrations/fathom          → disconnect (deletes the stored tokens)

Story 13.4 (browse & import):
- GET    /api/integrations/fathom/meetings            → one page of the user's own Fathom meetings + import status
- GET    /api/integrations/fathom/projects            → projects the user can import into (write access)
- POST   /api/integrations/fathom/imports             → import a recording into a project (enqueues a job)
- POST   /api/integrations/fathom/imports/{id}/retry  → retry a failed import (importer only)

Story 12.4: an import creates a meeting owned by the importer's organization on the project, ``internal``
by default (``shared`` only for admins of that organization). Imports of meetings the user cannot see
(another organization's internal meeting) are never listed or returned.

Story 13.9 (webhook auto-import, opt-in, off by default):
- PUT    /api/integrations/fathom/auto-import             → enable/disable + default project + visibility
- GET    /api/integrations/fathom/unassigned              → pushed recordings waiting for a project
- POST   /api/integrations/fathom/unassigned/{id}/assign  → import into a project (same rules as 13.4)
- DELETE /api/integrations/fathom/unassigned/{id}         → discard
- POST   /api/fathom/webhook/{connection_id}              → Fathom's new_meeting (public, signature-verified)

The callback path must match FATHOM_REDIRECT_URI and the redirect URL registered in the Fathom app.
"""

import logging
import time
import uuid
from typing import Literal, Optional
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.middleware.auth import get_current_user
from app.config import settings
from app.database.models import FathomConnection, FathomImport, FathomUnassignedMeeting, Project, User
from app.database.session import get_db
from app.integrations import fathom
from app.services import fathom_connections, fathom_import, fathom_webhook, storage
from app.services.access import (
    NONE,
    WRITE,
    accessible_project_ids,
    accessible_projects_filter,
    can_create_shared,
    has_access,
    project_access_level,
    require_project_access,
)
from app.services.fathom_connections import (
    InvalidState,
    PendingExpired,
    PendingForbidden,
    PendingNotFound,
)

logger = logging.getLogger(__name__)

router = APIRouter()

CALLBACK_PATH = "/fathom/callback"  # mounted under /api
SETTINGS_PAGE = "/settings/integrations"


def _require_configured() -> None:
    if not fathom.is_configured():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fathom integration is not configured")


class ConfirmRequest(BaseModel):
    nonce: str = Field(..., min_length=1, max_length=fathom_connections.MAX_NONCE_LENGTH)


def _back_to_settings(result: str, reason: Optional[str] = None, nonce: Optional[str] = None) -> RedirectResponse:
    """Redirect to the frontend settings page — always under FRONTEND_URL (no open redirect)."""
    params = {"fathom": result}
    if reason:
        params["reason"] = reason
    if nonce:
        params["nonce"] = nonce
    url = f"{settings.frontend_url.rstrip('/')}{SETTINGS_PAGE}?{urlencode(params)}"
    return RedirectResponse(
        url,
        status_code=status.HTTP_302_FOUND,
        headers={"Cache-Control": "no-store", "Referrer-Policy": "no-referrer"},
    )


def _auto_import_state(db: Session, conn: Optional[FathomConnection]) -> dict:
    project = db.get(Project, conn.auto_import_project_id) if conn and conn.auto_import_project_id else None
    return {
        "enabled": bool(conn and conn.auto_import_enabled),
        "project_id": str(project.id) if project else None,
        "project_name": project.name if project else None,
        "visibility": conn.auto_import_visibility if conn else "internal",
    }


@router.get("/integrations/fathom")
async def fathom_status(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Is the current user's Fathom account connected?"""
    configured = fathom.is_configured()
    conn = fathom_connections.get_connection(db, user) if configured else None
    return {
        "auto_import": _auto_import_state(db, conn),
        "configured": configured,
        "connected": conn is not None,
        "needs_reconnect": bool(conn and conn.needs_reconnect),
        "account_label": conn.account_label if conn else None,
        "connected_at": conn.connected_at.isoformat() if conn and conn.connected_at else None,
    }


@router.get("/integrations/fathom/connect")
async def fathom_connect(user=Depends(get_current_user)):
    """URL of the Fathom consent page; the frontend sends the browser there."""
    _require_configured()
    return {"url": fathom.authorize_url(fathom_connections.sign_state(user.id))}


@router.delete("/integrations/fathom", status_code=status.HTTP_204_NO_CONTENT)
async def fathom_disconnect(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Disconnect: delete the stored tokens (and the Fathom webhook, best effort)."""
    conn = fathom_connections.get_connection(db, user)
    if conn is not None and conn.webhook_id and fathom.is_configured():
        client = fathom.FathomClient(db, conn)
        try:
            fathom_webhook.unregister(db, conn, client)
        except fathom.FathomReconnectRequired:
            pass  # grant gone: the webhook cannot be deleted from here
        finally:
            client.close()
    if not fathom_connections.delete_connection(db, user):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fathom is not connected")


@router.post("/integrations/fathom/confirm")
async def fathom_confirm(body: ConfirmRequest, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Second step of the connect flow: attach the pending tokens to the logged-in user.

    Only the user who started the flow (named in the OAuth state) may confirm: 403 otherwise
    (the pending tokens are discarded), 410 when expired, 404 when unknown or already used.
    """
    _require_configured()
    try:
        fathom_connections.confirm_pending(db, user, body.nonce)
    except PendingNotFound:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown or already used Fathom connection request")
    except PendingExpired:
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="The Fathom connection request expired, connect again")
    except PendingForbidden:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This Fathom connection was started by another user")
    logger.info("Fathom connected for user %s", user.id)
    return await fathom_status(db=db, user=user)


@router.get(CALLBACK_PATH)
def fathom_callback(
    code: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    error: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Fathom redirects the browser here after consent. Public (no JWT).

    Never connects directly: the tokens are parked as a pending connection and the frontend
    confirms them with the logged-in user's JWT (login-CSRF protection).
    """
    _require_configured()
    if error:
        return _back_to_settings("error", "denied" if error == "access_denied" else "fathom_error")
    if not code or not state:
        return _back_to_settings("error", "invalid_request")
    try:
        parsed = fathom_connections.parse_state(state)
    except InvalidState as exc:
        logger.warning("Fathom callback rejected: %s", exc)
        return _back_to_settings("error", "invalid_state")
    user = db.query(User).filter(User.id == parsed.user_id, User.deleted_at.is_(None)).first()
    if user is None:
        return _back_to_settings("error", "invalid_state")
    try:
        pending = fathom_connections.create_pending(db, parsed, code)
    except InvalidState as exc:
        logger.warning("Fathom callback rejected: %s", exc)
        return _back_to_settings("error", "invalid_state")
    except fathom.FathomError as exc:
        logger.warning("Fathom code exchange failed for user %s: %s", user.id, exc)
        return _back_to_settings("error", "exchange_failed")
    return _back_to_settings("pending", nonce=pending.nonce)


# --------------------------------------------------------------------------- Story 13.4: browse & import


class AssignRequest(BaseModel):
    project_id: str = Field(..., min_length=1, max_length=64)
    visibility: Literal["internal", "shared"] = "internal"


class ImportRequest(BaseModel):
    recording_id: str = Field(..., min_length=1, max_length=128, pattern=r"^[A-Za-z0-9_-]+$")
    project_id: str = Field(..., min_length=1, max_length=64)
    visibility: Literal["internal", "shared"] = "internal"  # Story 12.4


def _usable_connection(db: Session, user):
    """The user's Fathom connection, or 409 (``not_connected`` / ``needs_reconnect``)."""
    _require_configured()
    conn = fathom_connections.get_connection(db, user)
    if conn is None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="not_connected")
    if conn.needs_reconnect:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="needs_reconnect")
    return conn


def _format_import(imp: FathomImport, user) -> dict:
    job = imp.job
    state = fathom_import.import_state(imp)
    return {
        "id": str(imp.id),
        "project_id": str(imp.project_id),
        "project_name": imp.project.name if imp.project else "",
        "state": state,
        "visibility": imp.source.visibility if imp.source else imp.visibility,  # Story 12.4
        "source_id": str(imp.source_id) if imp.source_id else None,
        "source_status": imp.source.ingestion_status if imp.source else None,
        "job": {
            "status": job.status,
            "attempts": job.attempts,
            "max_attempts": job.max_attempts,
            "run_after": job.run_after.isoformat() if job.run_after else None,
            "last_error": job.last_error,
        } if job else None,
        "error": (job.last_error if job else "Import job missing") if state == "failed" else None,
        "can_retry": state == "failed" and str(imp.user_id) == str(user.id),
    }


@router.get("/integrations/fathom/meetings")
def fathom_meetings(
    cursor: Optional[str] = Query(None, max_length=2048),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """One page of the current user's own Fathom meetings (never another user's list).

    Each meeting lists its imports into projects the user can see (imported / importing / failed).
    """
    conn = _usable_connection(db, user)
    client = fathom.FathomClient(db, conn)
    try:
        page = client.list_meetings(cursor=cursor)
    except fathom.FathomReconnectRequired:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="needs_reconnect")
    except fathom.FathomError as exc:
        logger.warning("Fathom meetings list failed for user %s: %s", user.id, exc)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Fathom is unavailable, try again")
    finally:
        client.close()

    meetings = [fathom_import.meeting_summary(item) for item in page.items if isinstance(item, dict)]
    ids = [m["recording_id"] for m in meetings]
    imports = (
        db.query(FathomImport)
        .filter(FathomImport.recording_id.in_(ids), FathomImport.project_id.in_(accessible_project_ids(user)))
        .order_by(FathomImport.created_at)
        .all()
    ) if ids else []
    by_recording: dict = {}
    for imp in imports:
        if not fathom_import.import_visible(db, user, imp):  # Story 12.4: another organization's internal meeting
            continue
        by_recording.setdefault(imp.recording_id, []).append(_format_import(imp, user))
    for meeting in meetings:
        meeting["imports"] = by_recording.get(meeting["recording_id"], [])
    return {"items": meetings, "next_cursor": page.next_cursor}


@router.get("/integrations/fathom/projects")
def fathom_import_projects(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Projects the user can import meetings into (write access or more), not archived.

    ``can_share`` (Story 12.4): the user may import as ``shared`` (admin of the organization they act for).
    """
    projects = (
        db.query(Project)
        .filter(accessible_projects_filter(user), Project.archived_at.is_(None))
        .order_by(Project.name)
        .all()
    )
    return [
        {"id": str(p.id), "name": p.name, "can_share": can_create_shared(db, user, p)}
        for p in projects
        if has_access(project_access_level(db, user, p), WRITE)
    ]


@router.post("/integrations/fathom/imports", status_code=status.HTTP_202_ACCEPTED)
def fathom_start_import(body: ImportRequest, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Import one of the user's Fathom recordings into a project (write access needed).

    409 when the recording is already imported (or being imported) into that project.
    The worker downloads the recording, stores it and creates the meeting as pending in Ingestão.
    """
    _usable_connection(db, user)
    project = require_project_access(db, user, body.project_id, WRITE)
    if body.visibility == "shared" and not can_create_shared(db, user, project):  # Story 12.4
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins of your organization can import a meeting as shared",
        )
    if not storage.is_enabled():
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Recording storage is not configured")
    try:
        imp = fathom_import.start_import(db, user, project, body.recording_id, body.visibility)
    except fathom_import.ImportExists as exc:
        # Story 12.4: never reveal another organization's internal import (source id, status, errors)
        visible = exc.existing is not None and fathom_import.import_visible(db, user, exc.existing)
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"code": "already_imported", "import": _format_import(exc.existing, user) if visible else None},
        )
    return _format_import(imp, user)


@router.post("/integrations/fathom/imports/{import_id}/retry", status_code=status.HTTP_202_ACCEPTED)
def fathom_retry_import(import_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Retry a failed import. Only the importer can (the recording is in their Fathom account)."""
    _require_configured()
    try:
        imp = db.get(FathomImport, uuid.UUID(import_id))
    except ValueError:
        imp = None
    # Story 12.4: an import of a meeting the user cannot see is not found either
    if imp is None or project_access_level(db, user, imp.project) == NONE or not fathom_import.import_visible(db, user, imp):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Import not found")
    require_project_access(db, user, imp.project_id, WRITE)
    if str(imp.user_id) != str(user.id):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the user who imported this recording can retry it")
    _usable_connection(db, user)
    try:
        imp = fathom_import.retry_import(db, imp)
    except fathom_import.ImportNotRetryable as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc))
    return _format_import(imp, user)


# --------------------------------------------------------------------------- Story 13.9: webhook auto-import


class AutoImportRequest(BaseModel):
    enabled: bool
    project_id: Optional[str] = Field(None, max_length=64)  # default project; none → everything lands in Unassigned
    visibility: Literal["internal", "shared"] = "internal"


@router.put("/integrations/fathom/auto-import")
def fathom_auto_import(body: AutoImportRequest, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Opt in/out of the Fathom webhook. Enabling registers the webhook at Fathom (409 when not connected,
    502 when Fathom fails); disabling deletes it and forgets its secret. Off by default."""
    _require_configured()
    conn = fathom_connections.get_connection(db, user)
    if conn is None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="not_connected")
    if body.project_id:  # same checks as a manual import: write access, ``shared`` only for admins
        project = require_project_access(db, user, body.project_id, WRITE)
        if body.visibility == "shared" and not can_create_shared(db, user, project):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins of your organization can import a meeting as shared",
            )
    if body.enabled:
        _usable_connection(db, user)
        client = fathom.FathomClient(db, conn)
        try:
            fathom_webhook.register(db, conn, client)
        except fathom.FathomReconnectRequired:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="needs_reconnect")
        except fathom_webhook.WebhookRegistrationError as exc:
            logger.warning("Fathom webhook registration failed for user %s: %s", user.id, exc)
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Could not register the webhook at Fathom, try again")
        finally:
            client.close()
        conn.auto_import_enabled = True
    else:
        client = None if conn.needs_reconnect else fathom.FathomClient(db, conn)
        try:
            fathom_webhook.unregister(db, conn, client)
        except fathom.FathomReconnectRequired:
            conn.webhook_id = None
            conn.webhook_secret_enc = None
            conn.auto_import_enabled = False
        finally:
            if client is not None:
                client.close()
    conn.auto_import_project_id = uuid.UUID(body.project_id) if body.project_id else None
    conn.auto_import_visibility = body.visibility
    db.commit()
    return _auto_import_state(db, conn)


def _format_unassigned(row: FathomUnassignedMeeting) -> dict:
    return {
        "id": str(row.id),
        "recording_id": row.recording_id,
        "title": row.title,
        "started_at": row.started_at.isoformat() + "Z" if row.started_at else None,
        "reason": row.reason,
        "received_at": row.created_at.isoformat() + "Z" if row.created_at else None,
    }


def _own_unassigned(db: Session, user, item_id: str) -> FathomUnassignedMeeting:
    try:
        row = db.get(FathomUnassignedMeeting, uuid.UUID(item_id))
    except ValueError:
        row = None
    if row is None or str(row.user_id) != str(user.id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Meeting not found")
    return row


@router.get("/integrations/fathom/unassigned")
def fathom_unassigned(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """The current user's recordings pushed by the webhook that have no project yet (newest first)."""
    rows = (
        db.query(FathomUnassignedMeeting)
        .filter(FathomUnassignedMeeting.user_id == user.id)
        .order_by(FathomUnassignedMeeting.created_at.desc())
        .all()
    )
    return [_format_unassigned(r) for r in rows]


@router.post("/integrations/fathom/unassigned/{item_id}/assign", status_code=status.HTTP_202_ACCEPTED)
def fathom_assign_unassigned(item_id: str, body: AssignRequest, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Import an unassigned recording into a project (same rules and 403/409/503 answers as a manual import)."""
    row = _own_unassigned(db, user, item_id)
    result = fathom_start_import(
        ImportRequest(recording_id=row.recording_id, project_id=body.project_id, visibility=body.visibility),
        db=db, user=user,
    )
    db.delete(row)
    db.commit()
    return result


@router.delete("/integrations/fathom/unassigned/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def fathom_discard_unassigned(item_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    row = _own_unassigned(db, user, item_id)
    db.delete(row)
    db.commit()


@router.post("/fathom/webhook/{connection_id}", status_code=status.HTTP_202_ACCEPTED)
async def fathom_webhook_receive(connection_id: str, request: Request, db: Session = Depends(get_db)):
    """Fathom ``new_meeting`` webhook. Public: authenticated only by the signature (HMAC over the raw body
    with the connection's secret). Every failure answers the same 401 (unknown / disabled connection, bad
    or stale signature, malformed headers). Only enqueues — nothing is downloaded here."""
    rejected = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid webhook")
    try:
        conn_uuid = uuid.UUID(connection_id)
    except ValueError:
        raise rejected
    declared = request.headers.get("content-length")
    if declared and declared.isdigit() and int(declared) > fathom_webhook.MAX_BODY_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Payload too large")
    body = await request.body()
    if len(body) > fathom_webhook.MAX_BODY_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Payload too large")
    conn = db.get(FathomConnection, conn_uuid)
    secret = fathom_webhook.load_secret(conn)
    webhook_id = request.headers.get("webhook-id")
    if secret is None or not fathom_webhook.verify_signature(
        secret, webhook_id, request.headers.get("webhook-timestamp"), request.headers.get("webhook-signature"),
        body, time.time(),
    ):
        raise rejected
    outcome = fathom_webhook.process(db, conn, webhook_id, body)
    return {"status": outcome.status}
