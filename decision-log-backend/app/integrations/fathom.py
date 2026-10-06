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
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from urllib.parse import urlencode

import httpx
from sqlalchemy.orm import Session

from app.config import settings
from app.database.models import FathomConnection
from app.utils.crypto import decrypt_token, encrypt_token, is_key_valid

logger = logging.getLogger(__name__)

AUTHORIZE_URL = "https://fathom.video/external/v1/oauth2/authorize"
TOKEN_URL = "https://fathom.video/external/v1/oauth2/token"
API_BASE = "https://api.fathom.ai/external/v1"
SCOPE = "public_api"
REFRESH_MARGIN = timedelta(seconds=60)  # refresh this long before the access token expires
TIMEOUT_SECONDS = 30.0


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
    body = response.json()
    if not body.get("access_token"):
        raise FathomAPIError(response.status_code, "missing access_token", action)
    expires_in = body.get("expires_in")
    return TokenSet(
        access_token=body["access_token"],
        refresh_token=body.get("refresh_token"),
        expires_at=utcnow() + timedelta(seconds=int(expires_in)) if expires_in else None,
        scope=body.get("scope"),
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

    def refresh(self) -> None:
        conn = self.connection
        if not conn.refresh_token_enc:
            self._mark_reconnect()
        try:
            tokens = refresh_tokens(decrypt_token(conn.refresh_token_enc), self.http)
        except FathomAPIError as exc:
            if exc.status_code in (400, 401, 403):  # invalid_grant & co: the grant is gone
                logger.warning("Fathom refresh rejected for connection %s: HTTP %s", conn.id, exc.status_code)
                self._mark_reconnect()
            raise
        apply_tokens(conn, tokens)
        self.db.commit()
        logger.info("Fathom token refreshed for connection %s", conn.id)

    def _mark_reconnect(self) -> None:
        self.connection.revoked_at = utcnow()
        self.db.commit()
        raise FathomReconnectRequired("Fathom connection needs to be reconnected")

    def access_token(self) -> str:
        conn = self.connection
        if conn.revoked_at is not None:
            raise FathomReconnectRequired("Fathom connection needs to be reconnected")
        if conn.expires_at is not None and utcnow() >= conn.expires_at - REFRESH_MARGIN:
            self.refresh()
        return decrypt_token(conn.access_token_enc)

    # -- requests

    def _request(self, method: str, path: str, *, params=None, json=None, action: str = "request") -> Dict[str, Any]:
        for attempt in (1, 2):
            headers = {"Authorization": f"Bearer {self.access_token()}"}
            try:
                response = self.http.request(method, API_BASE + path, params=params, json=json, headers=headers)
            except httpx.HTTPError as exc:
                raise FathomError(f"Fathom {action} failed: {type(exc).__name__}") from exc
            if response.status_code == 401 and attempt == 1:
                self.refresh()  # token revoked/expired early: refresh once and retry
                continue
            if response.status_code not in (200, 201, 202):
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

    def request_download(self, recording_id) -> Dict[str, Any]:
        """Ask Fathom to prepare a recording download: ``{download_id, status}``."""
        return self._request("POST", f"/recordings/{recording_id}/download", json={}, action="download request")

    def download_status(self, recording_id, download_id) -> Dict[str, Any]:
        """Status of a prepared download: processing | completed (``video.url``, signed ~24 h) | failed | expired."""
        return self._request("GET", f"/recordings/{recording_id}/downloads/{download_id}", action="download status")


def account_label_from(page: MeetingsPage) -> Optional[str]:
    """Best-effort label for the connected account: the recorder's email (or name) of a meeting."""
    for meeting in page.items:
        recorder = meeting.get("recorded_by")
        if isinstance(recorder, dict):
            label = recorder.get("email") or recorder.get("name")
            if label:
                return str(label)[:255]
    return None
