"""Fathom connections (Story 13.3): OAuth state, storing and removing a user's connection.

The OAuth ``state`` is a signed, expiring payload (HMAC-SHA256 with the JWT secret) that
binds the flow to the user who started it — no server-side session store is needed.
"""

import base64
import hashlib
import hmac
import json
import logging
import secrets
import time
import uuid
from typing import Optional

from sqlalchemy.orm import Session

from app.config import settings
from app.database.models import FathomConnection, User
from app.integrations import fathom
from app.services.organizations import primary_organization

logger = logging.getLogger(__name__)

STATE_TTL_SECONDS = 600  # 10 minutes to complete the Fathom consent
_STATE_CONTEXT = b"fathom-oauth-state:"  # domain separation from other uses of the JWT secret


class InvalidState(Exception):
    """The OAuth state is malformed, tampered with, expired or for another user."""


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
        expires = int(data["exp"])
    except (ValueError, KeyError, TypeError):
        raise InvalidState("malformed payload")
    if now > expires:
        raise InvalidState("expired")
    if expected_user_id is not None and str(user_id) != str(expected_user_id):
        raise InvalidState("state belongs to another user")
    return user_id


def get_connection(db: Session, user) -> Optional[FathomConnection]:
    return db.query(FathomConnection).filter(FathomConnection.user_id == user.id).first()


def save_connection(db: Session, user: User, tokens: "fathom.TokenSet", account_label: Optional[str] = None) -> FathomConnection:
    """Create or replace the user's connection with freshly exchanged tokens. Commits."""
    conn = get_connection(db, user)
    if conn is None:
        org = primary_organization(db, user)
        conn = FathomConnection(user_id=user.id, organization_id=org.id if org else None)
        db.add(conn)
    fathom.apply_tokens(conn, tokens)
    conn.connected_at = fathom.utcnow()
    conn.account_label = account_label
    db.commit()
    db.refresh(conn)
    return conn


def complete_connection(db: Session, user: User, code: str, http=None) -> FathomConnection:
    """Callback: exchange the code, store the tokens, then label the account (best effort)."""
    tokens = fathom.exchange_code(code, http)
    conn = save_connection(db, user, tokens)
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
        logger.info("Fathom account label unavailable for user %s: %s", user.id, exc)
    return conn


def delete_connection(db: Session, user) -> bool:
    """Disconnect: delete the stored tokens. Returns False when nothing was connected."""
    conn = get_connection(db, user)
    if conn is None:
        return False
    db.delete(conn)
    db.commit()
    return True
