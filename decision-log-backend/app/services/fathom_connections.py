"""Fathom connections (Story 13.3): OAuth state, storing and removing a user's connection.

The OAuth ``state`` is a signed, expiring payload (HMAC-SHA256 with the JWT secret) naming
the user who started the flow plus a random nonce.

Two-step connect (login-CSRF protection): the public callback cannot see who is logged in, so
it only parks the exchanged tokens in ``fathom_pending_connections`` (the state's nonce makes
the state single use). The frontend then confirms with the logged-in user's JWT, and the tokens
move to ``fathom_connections`` only when that user is the one named in the state.
"""

import base64
import hashlib
import hmac
import json
import logging
import secrets
import time
import uuid
from dataclasses import dataclass
from datetime import timedelta
from typing import Optional

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import settings
from app.database.models import FathomConnection, FathomPendingConnection, User
from app.integrations import fathom
from app.services.organizations import primary_organization
from app.utils.crypto import encrypt_token

logger = logging.getLogger(__name__)

STATE_TTL_SECONDS = 600  # 10 minutes to complete the Fathom consent
PENDING_TTL = timedelta(minutes=10)  # time for the frontend to confirm a callback
MAX_NONCE_LENGTH = 64
_STATE_CONTEXT = b"fathom-oauth-state:"  # domain separation from other uses of the JWT secret


class InvalidState(Exception):
    """The OAuth state is malformed, tampered with, expired, already used or for another user."""


class PendingNotFound(Exception):
    """No pending connection with this nonce (unknown or already used)."""


class PendingExpired(Exception):
    """The pending connection expired before it was confirmed."""


class PendingForbidden(Exception):
    """The pending connection belongs to another user (the consent link was not started by them)."""


@dataclass(frozen=True)
class StateData:
    user_id: uuid.UUID
    nonce: str


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _unb64(text: str) -> bytes:
    return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))


def _signature(payload: str) -> str:
    key = settings.jwt_secret_key.encode()
    return _b64(hmac.new(key, _STATE_CONTEXT + payload.encode(), hashlib.sha256).digest())


def sign_state(user_id, now: Optional[float] = None) -> str:
    """State for the authorize URL: ``<payload>.<signature>`` with user id, nonce and expiry."""
    now = time.time() if now is None else now
    payload = _b64(json.dumps(
        {"u": str(user_id), "n": secrets.token_urlsafe(16), "exp": int(now) + STATE_TTL_SECONDS},
        separators=(",", ":"),
    ).encode())
    return f"{payload}.{_signature(payload)}"


def verify_state(state: str, now: Optional[float] = None, expected_user_id=None) -> uuid.UUID:
    """Return the user id bound to a valid state; raise InvalidState otherwise."""
    return parse_state(state, now, expected_user_id).user_id


def parse_state(state: str, now: Optional[float] = None, expected_user_id=None) -> StateData:
    """Verify a state (signature, expiry, user) and return its user id and nonce."""
    now = time.time() if now is None else now
    try:
        payload, signature = state.split(".", 1)
    except (AttributeError, ValueError):
        raise InvalidState("malformed state")
    if not hmac.compare_digest(signature, _signature(payload)):
        raise InvalidState("bad signature")
    try:
        data = json.loads(_unb64(payload))
        user_id = uuid.UUID(data["u"])
        nonce = data["n"]
        expires = int(data["exp"])
    except (ValueError, KeyError, TypeError):
        raise InvalidState("malformed payload")
    if not isinstance(nonce, str) or not nonce or len(nonce) > MAX_NONCE_LENGTH:
        raise InvalidState("malformed payload")
    if now > expires:
        raise InvalidState("expired")
    if expected_user_id is not None and str(user_id) != str(expected_user_id):
        raise InvalidState("state belongs to another user")
    return StateData(user_id=user_id, nonce=nonce)


def get_connection(db: Session, user) -> Optional[FathomConnection]:
    return db.query(FathomConnection).filter(FathomConnection.user_id == user.id).first()


def _upsert_connection(db: Session, user: User) -> FathomConnection:
    conn = get_connection(db, user)
    if conn is None:
        org = primary_organization(db, user)
        conn = FathomConnection(user_id=user.id, organization_id=org.id if org else None)
        db.add(conn)
    return conn


def save_connection(db: Session, user: User, tokens: "fathom.TokenSet", account_label: Optional[str] = None) -> FathomConnection:
    """Create or replace the user's connection with freshly exchanged tokens. Commits."""
    conn = _upsert_connection(db, user)
    fathom.apply_tokens(conn, tokens)
    conn.connected_at = fathom.utcnow()
    conn.account_label = account_label
    db.commit()
    db.refresh(conn)
    return conn


def _label_account(db: Session, conn: FathomConnection, http=None) -> None:
    """Best effort: label the account with the recorder email of one listed meeting."""
    try:
        client = fathom.FathomClient(db, conn, http)
        try:
            label = fathom.account_label_from(client.list_meetings())
        finally:
            client.close()
        if label:
            conn.account_label = label
            db.commit()
    except fathom.FathomError as exc:
        logger.info("Fathom account label unavailable for connection %s: %s", conn.id, exc)


# --------------------------------------------------------------------------- two-step connect


def cleanup_expired_pending(db: Session, now=None) -> int:
    """Delete expired pending connections (opportunistic, no cron). Does not commit."""
    now = now or fathom.utcnow()
    return (
        db.query(FathomPendingConnection)
        .filter(FathomPendingConnection.expires_at < now)
        .delete(synchronize_session=False)
    )


def _consume(pending: FathomPendingConnection) -> None:
    """Wipe the tokens; the row stays until it expires so the state cannot be replayed."""
    pending.access_token_enc = None
    pending.refresh_token_enc = None
    pending.consumed_at = fathom.utcnow()


def create_pending(db: Session, state: StateData, code: str, http=None) -> FathomPendingConnection:
    """Callback: burn the state, exchange the code and park the encrypted tokens. Commits.

    Raises InvalidState when the state was already used, FathomError when the exchange fails.
    Never writes ``fathom_connections``.
    """
    cleanup_expired_pending(db)
    db.commit()
    if db.query(FathomPendingConnection).filter(FathomPendingConnection.state_nonce == state.nonce).first():
        raise InvalidState("state already used")
    tokens = fathom.exchange_code(code, http)
    now = fathom.utcnow()
    pending = FathomPendingConnection(
        nonce=secrets.token_urlsafe(32),
        state_nonce=state.nonce,
        user_id=state.user_id,
        access_token_enc=encrypt_token(tokens.access_token),
        refresh_token_enc=encrypt_token(tokens.refresh_token) if tokens.refresh_token else None,
        token_expires_at=tokens.expires_at,
        scope=tokens.scope,
        expires_at=now + PENDING_TTL,
        created_at=now,
    )
    db.add(pending)
    try:
        db.commit()
    except IntegrityError:  # the same state raced through two callbacks
        db.rollback()
        raise InvalidState("state already used")
    return pending


def confirm_pending(db: Session, user: User, nonce: str, http=None) -> FathomConnection:
    """Move a pending connection to ``fathom_connections`` for the logged-in user. Commits.

    Raises PendingNotFound (unknown or already used), PendingExpired, or PendingForbidden
    (the state named another user — the pending tokens are wiped).
    """
    cleanup_expired_pending(db)
    db.commit()
    now = fathom.utcnow()
    pending = None
    if isinstance(nonce, str) and 0 < len(nonce) <= MAX_NONCE_LENGTH:
        pending = db.query(FathomPendingConnection).filter(FathomPendingConnection.nonce == nonce).first()
    if pending is None or pending.consumed_at is not None or not pending.access_token_enc:
        raise PendingNotFound("unknown or already used")
    if pending.expires_at <= now:
        db.delete(pending)
        db.commit()
        raise PendingExpired("expired")
    if str(pending.user_id) != str(user.id):
        _consume(pending)
        db.commit()
        logger.warning("Fathom confirm rejected: pending connection %s belongs to another user (confirming user %s)",
                       pending.id, user.id)
        raise PendingForbidden("pending connection belongs to another user")

    conn = _upsert_connection(db, user)
    conn.access_token_enc = pending.access_token_enc
    conn.refresh_token_enc = pending.refresh_token_enc
    conn.expires_at = pending.token_expires_at
    conn.scope = pending.scope
    conn.revoked_at = None
    conn.connected_at = now
    conn.account_label = None
    _consume(pending)
    db.commit()
    db.refresh(conn)
    _label_account(db, conn, http)
    return conn


def delete_connection(db: Session, user) -> bool:
    """Disconnect: delete the stored tokens. Returns False when nothing was connected."""
    conn = get_connection(db, user)
    if conn is None:
        return False
    db.delete(conn)
    db.commit()
    return True
