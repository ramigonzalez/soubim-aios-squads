"""Fathom webhook auto-import (Story 13.9).

Opt-in per connection (off by default). Enabling registers a ``new_meeting`` webhook at Fathom
with the user's own token, pointing to ``/api/fathom/webhook/{connection_id}``; Fathom's signing
secret is stored encrypted. Each delivery is:

1. authenticated — Standard Webhooks signature (``webhook-id``, ``webhook-timestamp``,
   ``webhook-signature: v1,<base64 HMAC-SHA256("{id}.{timestamp}.{raw body}")>``, secret
   ``whsec_<base64>``) with the secret of the connection in the URL, constant-time compare,
   several signatures allowed, timestamp within +-5 minutes (replay window);
2. deduplicated by ``webhook-id`` (per connection);
3. routed — the connection's default project (still writable by the user) gets a normal
   ``fathom_imports`` row + ``fathom_import`` job (Story 13.4/12.4 path, so the owner organization
   and visibility rules are the same as a manual import); otherwise the recording waits in the
   user's Unassigned list. Nothing is downloaded in the request.

Every authentication failure looks the same to the caller (no oracle for connection ids / secrets).
Bodies, signatures and secrets are never logged.
"""

import base64
import binascii
import hashlib
import hmac
import json
import logging
import re
from dataclasses import dataclass
from datetime import timedelta
from typing import Optional
from urllib.parse import urlsplit

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import settings
from app.database.models import FathomConnection, FathomUnassignedMeeting, FathomWebhookEvent, Project, User
from app.integrations import fathom
from app.services import fathom_import, storage
from app.services.access import INTERNAL, WRITE, can_create_shared, has_access, project_access_level
from app.utils.crypto import TokenEncryptionError, decrypt_token, encrypt_token

logger = logging.getLogger(__name__)

TOLERANCE = timedelta(minutes=5)
MAX_BODY_BYTES = 1_000_000  # a new_meeting payload without transcript is a few KB
EVENT_RETENTION = timedelta(days=1)
_WEBHOOK_ID = re.compile(r"^[A-Za-z0-9_.:=-]{1,128}$")
WEBHOOK_PATH = "/api/fathom/webhook/{connection_id}"


class WebhookRegistrationError(Exception):
    """Fathom refused or failed to register the webhook."""


# --------------------------------------------------------------------------- signature


def _secret_key(secret: str) -> bytes:
    """``whsec_<base64>`` → key bytes (a secret without the prefix is used as plain text)."""
    if secret.startswith("whsec_"):
        try:
            return base64.b64decode(secret[len("whsec_"):], validate=True)
        except (binascii.Error, ValueError):
            pass
    return secret.encode()


def sign(secret: str, webhook_id: str, timestamp: str, body: bytes) -> str:
    """``v1,<signature>`` for a delivery (used by tests and the live-test helper)."""
    mac = hmac.new(_secret_key(secret), webhook_id.encode() + b"." + timestamp.encode() + b"." + body, hashlib.sha256)
    return "v1," + base64.b64encode(mac.digest()).decode()


def verify_signature(secret: str, webhook_id: Optional[str], timestamp: Optional[str], signature_header: Optional[str],
                     body: bytes, now_epoch: float) -> bool:
    """True when the headers are well formed, the timestamp is fresh and one ``v1`` signature matches."""
    if not webhook_id or not timestamp or not signature_header or not _WEBHOOK_ID.match(webhook_id):
        return False
    if len(signature_header) > 2048 or not re.fullmatch(r"[0-9]{1,12}", timestamp):
        return False
    if abs(now_epoch - int(timestamp)) > TOLERANCE.total_seconds():
        return False
    expected = sign(secret, webhook_id, timestamp, body).split(",", 1)[1].encode()
    matched = False
    for part in signature_header.split():  # "v1,sigA v1,sigB": any may match (secret rotation)
        version, _, candidate = part.partition(",")
        if version == "v1" and hmac.compare_digest(candidate.encode(), expected):
            matched = True  # keep looping: the time does not depend on which one matched
    return matched


# --------------------------------------------------------------------------- registration


def webhook_url(connection: FathomConnection) -> str:
    """Public URL Fathom calls: the origin of FATHOM_REDIRECT_URI (the public backend) + the webhook path."""
    parts = urlsplit(settings.fathom_redirect_uri or "")
    if not parts.scheme or not parts.netloc:
        raise WebhookRegistrationError("public backend URL is not configured")
    return f"{parts.scheme}://{parts.netloc}" + WEBHOOK_PATH.format(connection_id=connection.id)


def register(db: Session, connection: FathomConnection, client: "fathom.FathomClient") -> None:
    """Register the webhook at Fathom and store its id and (encrypted) secret. Caller commits."""
    if connection.webhook_id and connection.webhook_secret_enc:
        return
    try:
        body = client.create_webhook(webhook_url(connection))
    except fathom.FathomReconnectRequired:
        raise
    except fathom.FathomError as exc:
        raise WebhookRegistrationError(str(exc)) from exc
    webhook_id, secret = body.get("id"), body.get("secret")
    if not isinstance(secret, str) or not secret or webhook_id in (None, "") or not fathom.is_valid_id(webhook_id):
        raise WebhookRegistrationError("unexpected webhook registration response")
    connection.webhook_id = str(webhook_id)
    connection.webhook_secret_enc = encrypt_token(secret)


def unregister(db: Session, connection: FathomConnection, client: Optional["fathom.FathomClient"]) -> None:
    """Best-effort delete at Fathom, then forget the secret locally. Caller commits."""
    if connection.webhook_id and client is not None:
        try:
            client.delete_webhook(connection.webhook_id)
        except fathom.FathomError as exc:  # already gone, or Fathom down: the secret is dropped anyway
            logger.warning("Fathom webhook delete failed for connection %s: %s", connection.id, exc)
    connection.webhook_id = None
    connection.webhook_secret_enc = None
    connection.auto_import_enabled = False


# --------------------------------------------------------------------------- delivery


@dataclass
class Outcome:
    status: str  # imported | unassigned | duplicate | ignored
    detail: Optional[str] = None


def load_secret(connection: Optional[FathomConnection]) -> Optional[str]:
    """The connection's signing secret, or None when auto-import is off / not registered / unreadable."""
    if connection is None or not connection.auto_import_enabled or not connection.webhook_secret_enc:
        return None
    try:
        return decrypt_token(connection.webhook_secret_enc)
    except TokenEncryptionError:
        logger.warning("Fathom webhook secret unreadable for connection %s", connection.id)
        return None


def _prune_events(db: Session, now) -> None:
    db.query(FathomWebhookEvent).filter(FathomWebhookEvent.received_at < now - EVENT_RETENTION).delete(synchronize_session=False)


def _claim_event(db: Session, connection: FathomConnection, webhook_id: str) -> bool:
    """Record the delivery id; False when it was already accepted (replay / Fathom retry)."""
    now = fathom.utcnow()
    _prune_events(db, now)
    db.add(FathomWebhookEvent(connection_id=connection.id, webhook_id=webhook_id, received_at=now))
    try:
        db.flush()
    except IntegrityError:
        db.rollback()
        return False
    return True


def _recording_id(payload) -> Optional[str]:
    if not isinstance(payload, dict):
        return None
    value = payload.get("recording_id")
    if isinstance(value, bool) or not isinstance(value, (str, int)):
        return None
    value = str(value)
    return value if fathom.is_valid_id(value) else None


def _title(payload: dict) -> Optional[str]:
    for key in ("title", "meeting_title"):
        value = payload.get(key)
        if isinstance(value, str) and value.strip():
            return " ".join(value.split())[:255]
    return None


def process(db: Session, connection: FathomConnection, webhook_id: str, body: bytes) -> Outcome:
    """Handle an authenticated delivery. Commits (event claim + import / unassigned row together)."""
    if not _claim_event(db, connection, webhook_id):
        return Outcome("duplicate")
    try:
        payload = json.loads(body)
    except (ValueError, UnicodeDecodeError):
        payload = None
    recording_id = _recording_id(payload)
    user = db.query(User).filter(User.id == connection.user_id, User.deleted_at.is_(None)).first()
    if recording_id is None or user is None:
        db.commit()  # keep the claim: a retry of this delivery would fail the same way
        return Outcome("ignored")

    project = _usable_default_project(db, user, connection)
    if project is None:
        reason = "project_unavailable" if connection.auto_import_project_id else "no_default_project"
        return _park(db, connection, webhook_id, user, recording_id, payload, reason)

    if fathom_import.find_import(db, project.id, recording_id) is not None:
        db.commit()
        return Outcome("duplicate", "recording")
    visibility = connection.auto_import_visibility
    if visibility != INTERNAL and not can_create_shared(db, user, project):  # rights may have changed
        visibility = INTERNAL
    try:
        imp = fathom_import.start_import(db, user, project, recording_id, visibility)  # commits the claim too
    except fathom_import.ImportExists:  # raced with a manual import: start_import rolled back
        db.rollback()
        _claim_event(db, connection, webhook_id)
        db.commit()
        return Outcome("duplicate", "recording")
    logger.info("Fathom webhook: import %s queued for connection %s", imp.id, connection.id)
    return Outcome("imported")


def _usable_default_project(db: Session, user, connection: FathomConnection) -> Optional[Project]:
    """The default project when it still exists, is not archived, the user can still write to it and
    recording storage is configured; otherwise None (the meeting goes to Unassigned)."""
    if connection.auto_import_project_id is None or not storage.is_enabled():
        return None
    project = db.get(Project, connection.auto_import_project_id)
    if project is None or project.archived_at is not None:
        return None
    return project if has_access(project_access_level(db, user, project), WRITE) else None


def _park(db: Session, connection: FathomConnection, webhook_id: str, user, recording_id: str, payload: dict,
          reason: str) -> Outcome:
    exists = (
        db.query(FathomUnassignedMeeting)
        .filter(FathomUnassignedMeeting.user_id == user.id, FathomUnassignedMeeting.recording_id == recording_id)
        .first()
    )
    if exists is None:
        db.add(FathomUnassignedMeeting(
            user_id=user.id, recording_id=recording_id, title=_title(payload), reason=reason,
            started_at=fathom_import._parse_time(payload.get("recording_start_time") or payload.get("scheduled_start_time")),
        ))
    try:
        db.commit()
    except IntegrityError:  # another delivery parked the same recording concurrently: keep this claim only
        db.rollback()
        if _claim_event(db, connection, webhook_id):
            db.commit()
    return Outcome("unassigned", reason)
