"""Fathom API client (Story 13.3) — the ONLY module that talks to Fathom.

Endpoints proven by the spike (data/tools/fathom/oauth_test.py, 2026-10-05):
- authorize: https://fathom.video/external/v1/oauth2/authorize
- token exchange AND refresh: https://fathom.video/external/v1/oauth2/token (form-encoded).
  The docs' api.fathom.ai/.../oauth2/token URL is wrong.
- API: https://api.fathom.ai/external/v1 with ``Authorization: Bearer <access token>``.
  Access tokens last 24 h (expires_in=86400); the token endpoint allows 60 requests/min.

Tokens, codes and secrets are never logged: errors carry the HTTP status and Fathom's
``error`` code only.
"""

import logging
import re
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from urllib.parse import urlencode

import httpx
from sqlalchemy.orm import Session

from app.config import settings
from app.database.models import FathomConnection
from app.utils.crypto import TokenEncryptionError, decrypt_token, encrypt_token, is_key_valid

logger = logging.getLogger(__name__)

AUTHORIZE_URL = "https://fathom.video/external/v1/oauth2/authorize"
TOKEN_URL = "https://fathom.video/external/v1/oauth2/token"
API_BASE = "https://api.fathom.ai/external/v1"
SCOPE = "public_api"
REFRESH_MARGIN = timedelta(seconds=60)  # refresh this long before the access token expires
TIMEOUT_SECONDS = 30.0
_PATH_ID = re.compile(r"^[A-Za-z0-9_-]{1,128}$")  # recording / download ids placed in URL paths


class FathomError(Exception):
    """Base error for the Fathom integration."""


class FathomNotConfigured(FathomError):
    """FATHOM_CLIENT_ID / FATHOM_CLIENT_SECRET / FATHOM_REDIRECT_URI / TOKEN_ENCRYPTION_KEY missing."""


class FathomReconnectRequired(FathomError):
    """Fathom rejected the refresh token (revoked or expired grant): the user must reconnect."""


class FathomAPIError(FathomError):
    """Fathom answered with an unexpected HTTP status."""

    def __init__(self, status_code: int, error: Optional[str] = None, action: str = "request"):
        self.status_code = status_code
        self.error = error
        super().__init__(f"Fathom {action} failed: HTTP {status_code}" + (f" ({error})" if error else ""))


def utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)  # DB columns are naive UTC


def is_configured() -> bool:
    """True when the OAuth app credentials, redirect URI and a valid encryption key are set."""
    return bool(
        settings.fathom_client_id
        and settings.fathom_client_secret
        and settings.fathom_redirect_uri
        and is_key_valid(settings.token_encryption_key)
    )


def require_configured() -> None:
    if not is_configured():
        raise FathomNotConfigured("Fathom integration is not configured")


def new_http_client() -> httpx.Client:
    """HTTP client for Fathom calls. Tests replace this with an httpx.MockTransport client."""
    return httpx.Client(timeout=TIMEOUT_SECONDS, headers={"Accept": "application/json", "User-Agent": "DecisionLog/1.0"})


def _path_id(value) -> str:
    """An id safe to put in a URL path segment (no ``/``, ``..``, ``?`` or ``#``)."""
    text = str(value)
    if not _PATH_ID.match(text):
        raise FathomError("invalid Fathom id")
    return text


def _error_code(response: httpx.Response) -> Optional[str]:
    try:
        body = response.json()
    except ValueError:
        return None
    return body.get("error") if isinstance(body, dict) and isinstance(body.get("error"), str) else None


# --------------------------------------------------------------------------- OAuth


def authorize_url(state: str) -> str:
    """Fathom consent page URL; ``state`` comes back unchanged on the callback."""
    require_configured()
    return AUTHORIZE_URL + "?" + urlencode({
        "client_id": settings.fathom_client_id,
        "redirect_uri": settings.fathom_redirect_uri,
        "scope": SCOPE,
        "state": state,
        "response_type": "code",
    })


@dataclass
class TokenSet:
    access_token: str
    refresh_token: Optional[str]
    expires_at: Optional[datetime]
    scope: Optional[str]


def _post_token(form: Dict[str, str], http: Optional[httpx.Client], action: str) -> TokenSet:
    require_configured()
    form = {**form, "client_id": settings.fathom_client_id, "client_secret": settings.fathom_client_secret}
    client = http or new_http_client()
    try:
        response = client.post(TOKEN_URL, data=form)
    except httpx.HTTPError as exc:
        raise FathomError(f"Fathom {action} failed: {type(exc).__name__}") from exc
    finally:
        if http is None:
            client.close()
    if response.status_code != 200:
        raise FathomAPIError(response.status_code, _error_code(response), action)
    try:
        body = response.json()
    except ValueError:
        raise FathomAPIError(response.status_code, "invalid JSON", action)
    if not isinstance(body, dict) or not isinstance(body.get("access_token"), str) or not body["access_token"]:
        raise FathomAPIError(response.status_code, "missing access_token", action)
    try:
        expires_in = int(body["expires_in"]) if body.get("expires_in") else None
    except (TypeError, ValueError):
        raise FathomAPIError(response.status_code, "invalid expires_in", action)
    return TokenSet(
        access_token=body["access_token"],
        refresh_token=body.get("refresh_token") if isinstance(body.get("refresh_token"), str) else None,
        expires_at=utcnow() + timedelta(seconds=expires_in) if expires_in else None,
        scope=body.get("scope") if isinstance(body.get("scope"), str) else None,
    )


def exchange_code(code: str, http: Optional[httpx.Client] = None) -> TokenSet:
    """Exchange the authorization code from the callback for tokens."""
    return _post_token(
        {"grant_type": "authorization_code", "code": code, "redirect_uri": settings.fathom_redirect_uri},
        http,
        "code exchange",
    )


def refresh_tokens(refresh_token: str, http: Optional[httpx.Client] = None) -> TokenSet:
    return _post_token({"grant_type": "refresh_token", "refresh_token": refresh_token}, http, "token refresh")


def apply_tokens(connection: FathomConnection, tokens: TokenSet) -> None:
    """Store a token set on the connection, encrypted. Keeps the old refresh token if none came back."""
    connection.access_token_enc = encrypt_token(tokens.access_token)
    if tokens.refresh_token:
        connection.refresh_token_enc = encrypt_token(tokens.refresh_token)
    connection.expires_at = tokens.expires_at
    if tokens.scope:
        connection.scope = tokens.scope
    connection.revoked_at = None


# --------------------------------------------------------------------------- API


def _expiring(conn: FathomConnection) -> bool:
    return conn.expires_at is not None and utcnow() >= conn.expires_at - REFRESH_MARGIN


def is_valid_id(value) -> bool:
    """True for an id that may go into a Fathom URL path (recording / download ids)."""
    return bool(_PATH_ID.match(str(value)))


@dataclass
class MeetingsPage:
    items: List[Dict[str, Any]] = field(default_factory=list)
    next_cursor: Optional[str] = None


class FathomClient:
    """Calls the Fathom API on behalf of one connection, refreshing its token when needed.

    Refreshed tokens are written to the connection and committed. When Fathom rejects the
    refresh token, the connection is marked ``revoked_at`` and FathomReconnectRequired is raised.
    """

    def __init__(self, db: Session, connection: FathomConnection, http: Optional[httpx.Client] = None):
        self.db = db
        self.connection = connection
        self._own_http = http is None
        self.http = http or new_http_client()

    def close(self) -> None:
        if self._own_http:
            self.http.close()

    def __enter__(self) -> "FathomClient":
        return self

    def __exit__(self, *exc) -> None:
        self.close()

    # -- tokens

    def refresh(self, used_access_enc: Optional[str] = None) -> None:
        """Refresh the access token, safely when the API and the worker share the connection.

        The connection row is locked (``SELECT … FOR UPDATE``) for the whole refresh, so two
        processes never send the same refresh token to Fathom (a rotated refresh token would be
        invalidated and the connection wrongly marked as needing reconnect). After the lock the
        row is re-read: if another process already replaced the token we were using (and the new
        one is not about to expire), that token is used and no refresh happens.
        ``used_access_enc`` is the encrypted access token the caller used (defaults to the
        in-memory one).
        """
        if used_access_enc is None:
            used_access_enc = self.connection.access_token_enc
        conn = self._lock_connection()
        if conn.revoked_at is not None:
            self.db.commit()  # release the lock
            raise FathomReconnectRequired("Fathom connection needs to be reconnected")
        if conn.access_token_enc != used_access_enc and not _expiring(conn):
            self.db.commit()  # release the lock: someone else refreshed while we waited
            logger.info("Fathom token for connection %s already refreshed by another process", conn.id)
            return
        if not conn.refresh_token_enc:
            self._mark_reconnect()
        try:
            refresh_token = decrypt_token(conn.refresh_token_enc)
        except TokenEncryptionError:  # key changed: the stored grant is unusable
            logger.warning("Fathom refresh token unreadable for connection %s", conn.id)
            self._mark_reconnect()
        try:
            tokens = refresh_tokens(refresh_token, self.http)
        except FathomAPIError as exc:
            if exc.status_code in (400, 401, 403):  # invalid_grant & co: the grant is gone
                logger.warning("Fathom refresh rejected for connection %s: HTTP %s", conn.id, exc.status_code)
                self._mark_reconnect()
            self.db.rollback()  # release the lock
            raise
        except FathomError:
            self.db.rollback()
            raise
        apply_tokens(conn, tokens)
        self.db.commit()  # stores the new tokens and releases the lock
        logger.info("Fathom token refreshed for connection %s", conn.id)

    def _lock_connection(self) -> FathomConnection:
        """Re-read the connection row under a row lock (no-op lock on SQLite)."""
        conn = (
            self.db.query(FathomConnection)
            .filter(FathomConnection.id == self.connection.id)
            .with_for_update()
            .populate_existing()
            .first()
        )
        if conn is None:  # disconnected meanwhile
            self.db.rollback()
            raise FathomReconnectRequired("Fathom is not connected anymore")
        self.connection = conn
        return conn

    def _mark_reconnect(self) -> None:
        self.connection.revoked_at = utcnow()
        self.db.commit()
        raise FathomReconnectRequired("Fathom connection needs to be reconnected")

    def access_token(self) -> str:
        conn = self.connection
        if conn.revoked_at is not None:
            raise FathomReconnectRequired("Fathom connection needs to be reconnected")
        if _expiring(conn):
            self.refresh(conn.access_token_enc)
            conn = self.connection
        try:
            return decrypt_token(conn.access_token_enc)
        except TokenEncryptionError:  # key changed: the user must reconnect
            logger.warning("Fathom access token unreadable for connection %s", conn.id)
            self._mark_reconnect()

    # -- requests

    def _request(self, method: str, path: str, *, params=None, json=None, action: str = "request") -> Dict[str, Any]:
        for attempt in (1, 2):
            headers = {"Authorization": f"Bearer {self.access_token()}"}
            used_access_enc = self.connection.access_token_enc
            try:
                response = self.http.request(method, API_BASE + path, params=params, json=json, headers=headers)
            except httpx.HTTPError as exc:
                raise FathomError(f"Fathom {action} failed: {type(exc).__name__}") from exc
            if response.status_code == 401 and attempt == 1:
                self.refresh(used_access_enc)  # token revoked/expired early: refresh once and retry
                continue
            if response.status_code not in (200, 201, 202, 204):
                raise FathomAPIError(response.status_code, _error_code(response), action)
            return response.json() if response.content else {}
        raise AssertionError("unreachable")

    def list_meetings(self, cursor: Optional[str] = None, include_transcript: bool = False, **filters) -> MeetingsPage:
        """One page of the connected account's meetings (GET /meetings)."""
        params = {k: v for k, v in filters.items() if v is not None}
        if cursor:
            params["cursor"] = cursor
        if include_transcript:
            params["include_transcript"] = "true"
        body = self._request("GET", "/meetings", params=params, action="list meetings")
        return MeetingsPage(items=body.get("items") or [], next_cursor=body.get("next_cursor"))

    def get_transcript(self, recording_id) -> list:
        """Transcript segments of a recording (GET /recordings/{id}/transcript).

        OAuth users may not ask /meetings for transcripts (400 "OAuth users are not allowed to
        include summary or transcript in this request. Please use /recordings endpoint instead.",
        verified live 2026-10-06). Segments: ``{speaker: {display_name, ...}, text, timestamp}``.
        """
        body = self._request("GET", f"/recordings/{_path_id(recording_id)}/transcript", action="transcript")
        segments = body.get("transcript") if isinstance(body, dict) else None
        return segments if isinstance(segments, list) else []

    def request_download(self, recording_id) -> Dict[str, Any]:
        """Ask Fathom to prepare a recording download: ``{download_id, status}``."""
        return self._request("POST", f"/recordings/{_path_id(recording_id)}/download", json={}, action="download request")

    def download_status(self, recording_id, download_id) -> Dict[str, Any]:
        """Status of a prepared download: processing | completed (``video.url``, signed ~24 h) | failed | expired."""
        return self._request("GET", f"/recordings/{_path_id(recording_id)}/downloads/{_path_id(download_id)}", action="download status")


    # -- Story 13.9: webhooks (response shapes follow Fathom's public docs; NOT verified live)

    def create_webhook(self, destination_url: str) -> Dict[str, Any]:
        """Register a ``new_meeting`` webhook for the account's own recordings: ``{id, secret, ...}``.

        Only the recording id is needed from the payload (the import job fetches the rest with the
        user's token), but Fathom rejects a webhook with no content type ("At least one content type
        must be included", verified live 2026-10-06), so the transcript is requested.
        """
        return self._request("POST", "/webhooks", json={
            "destination_url": destination_url,
            "triggered_for": ["my_recordings"],
            "include_transcript": True,
            "include_summary": False,
            "include_action_items": False,
            "include_crm_matches": False,
        }, action="webhook create")

    def delete_webhook(self, webhook_id) -> None:
        self._request("DELETE", f"/webhooks/{_path_id(webhook_id)}", action="webhook delete")


def account_label_from(page: MeetingsPage) -> Optional[str]:
    """Best-effort label for the connected account: the recorder's email (or name) of a meeting."""
    for meeting in page.items:
        recorder = meeting.get("recorded_by")
        if isinstance(recorder, dict):
            label = recorder.get("email") or recorder.get("name")
            if label:
                return str(label)[:255]
    return None
