"""Google OpenID Connect client for "Sign in with Google" (Story 12.8).

The only module that talks to Google for login: authorize URL (code flow + PKCE), code
exchange, and ID token verification against Google's JWKS (cached).

ID token checks: RS256 signature with a key from Google's JWKS (``kid``), ``iss`` is Google,
``aud`` is our client id, ``exp``/``iat`` (60 s leeway for clock skew), ``nonce`` equals the one
we sent, ``email_verified`` is true. Errors never carry tokens, codes or secrets.

Uses PyJWT (+ cryptography) and httpx, already dependencies — no Google SDK call at runtime.
"""

import base64
import hashlib
import hmac
import secrets
import threading
import time
from dataclasses import dataclass
from typing import Dict, Optional
from urllib.parse import urlencode

import httpx
import jwt

from app.config import settings

AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth"
TOKEN_URL = "https://oauth2.googleapis.com/token"
JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs"
ISSUERS = ("https://accounts.google.com", "accounts.google.com")
SCOPES = "openid email profile"
TIMEOUT_SECONDS = 15
LEEWAY_SECONDS = 60
JWKS_TTL_SECONDS = 3600  # Google rotates keys roughly weekly and publishes them well in advance
JWKS_MIN_REFRESH_SECONDS = 60  # an unknown kid refetches at most once a minute


class GoogleAuthError(Exception):
    """Google answered with an error or something unusable (no secrets in the message)."""


class InvalidIdToken(Exception):
    """The ID token failed verification. ``reason`` is a stable code for the frontend."""

    def __init__(self, reason: str, detail: str = ""):
        super().__init__(f"{reason}: {detail}" if detail else reason)
        self.reason = reason


@dataclass(frozen=True)
class IdTokenClaims:
    sub: str
    email: str
    name: Optional[str]


def is_configured() -> bool:
    return bool(settings.google_client_id and settings.google_client_secret and settings.google_redirect_uri)


def new_http_client() -> httpx.Client:
    return httpx.Client(timeout=TIMEOUT_SECONDS, headers={"Accept": "application/json", "User-Agent": "DecisionLog/1.0"})


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def pkce_pair() -> tuple:
    """(code_verifier, S256 code_challenge) — RFC 7636."""
    verifier = secrets.token_urlsafe(64)[:96]
    return verifier, _b64(hashlib.sha256(verifier.encode()).digest())


def authorize_url(state: str, nonce: str, code_challenge: str, login_hint: Optional[str] = None) -> str:
    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": settings.google_redirect_uri,
        "response_type": "code",
        "scope": SCOPES,
        "state": state,
        "nonce": nonce,
        "code_challenge": code_challenge,
        "code_challenge_method": "S256",
        "prompt": "select_account",
    }
    if login_hint:
        params["login_hint"] = login_hint
    return f"{AUTHORIZE_URL}?{urlencode(params)}"


def exchange_code(code: str, code_verifier: str, http: Optional[httpx.Client] = None) -> str:
    """Exchange the authorization code (with the PKCE verifier) and return the raw ID token."""
    own = http is None
    http = http or new_http_client()
    try:
        response = http.post(TOKEN_URL, data={
            "grant_type": "authorization_code",
            "code": code,
            "code_verifier": code_verifier,
            "client_id": settings.google_client_id,
            "client_secret": settings.google_client_secret,
            "redirect_uri": settings.google_redirect_uri,
        })
    except httpx.HTTPError as exc:
        raise GoogleAuthError(f"token endpoint unreachable ({type(exc).__name__})") from None
    finally:
        if own:
            http.close()
    if response.status_code != 200:
        try:
            error = response.json().get("error", "")
        except ValueError:
            error = ""
        raise GoogleAuthError(f"code exchange failed: HTTP {response.status_code} {error}".strip())
    try:
        id_token = response.json().get("id_token")
    except (ValueError, AttributeError):
        id_token = None
    if not isinstance(id_token, str) or not id_token:
        raise GoogleAuthError("code exchange returned no id_token")
    return id_token


class JwksCache:
    """Google's signing keys by ``kid``, refreshed after JWKS_TTL_SECONDS or on an unknown kid."""

    def __init__(self):
        self._keys: Dict[str, object] = {}
        self._fetched_at = 0.0
        self._lock = threading.Lock()

    def clear(self) -> None:
        with self._lock:
            self._keys, self._fetched_at = {}, 0.0

    def _fetch(self, http: Optional[httpx.Client]) -> None:
        own = http is None
        http = http or new_http_client()
        try:
            response = http.get(JWKS_URL)
        except httpx.HTTPError as exc:
            raise GoogleAuthError(f"JWKS unreachable ({type(exc).__name__})") from None
        finally:
            if own:
                http.close()
        if response.status_code != 200:
            raise GoogleAuthError(f"JWKS fetch failed: HTTP {response.status_code}")
        keys = {}
        try:
            for jwk in response.json().get("keys", []):
                if jwk.get("kid") and jwk.get("kty") == "RSA":
                    keys[jwk["kid"]] = jwt.PyJWK(jwk, algorithm="RS256").key
        except (ValueError, AttributeError, jwt.PyJWKError) as exc:
            raise GoogleAuthError(f"JWKS malformed ({type(exc).__name__})") from None
        self._keys, self._fetched_at = keys, time.time()

    def get(self, kid: str, http: Optional[httpx.Client] = None):
        with self._lock:
            age = time.time() - self._fetched_at
            if age > JWKS_TTL_SECONDS or (kid not in self._keys and age > JWKS_MIN_REFRESH_SECONDS):
                self._fetch(http)
            return self._keys.get(kid)


jwks_cache = JwksCache()


def verify_id_token(id_token: str, nonce: str, http: Optional[httpx.Client] = None) -> IdTokenClaims:
    """Verify a Google ID token and return its claims; raise InvalidIdToken otherwise."""
    try:
        header = jwt.get_unverified_header(id_token)
    except jwt.PyJWTError:
        raise InvalidIdToken("invalid_token", "malformed")
    if header.get("alg") != "RS256" or not header.get("kid"):
        raise InvalidIdToken("invalid_token", "unexpected alg/kid")
    try:
        key = jwks_cache.get(header["kid"], http)
    except GoogleAuthError as exc:
        raise InvalidIdToken("invalid_token", str(exc))
    if key is None:
        raise InvalidIdToken("invalid_token", "unknown signing key")
    try:
        claims = jwt.decode(
            id_token,
            key,
            algorithms=["RS256"],
            audience=settings.google_client_id,
            leeway=LEEWAY_SECONDS,
            options={"require": ["exp", "iat", "iss", "aud", "sub"], "verify_iss": False},
        )
    except jwt.ExpiredSignatureError:
        raise InvalidIdToken("invalid_token", "expired")
    except jwt.InvalidAudienceError:
        raise InvalidIdToken("invalid_token", "wrong audience")
    except jwt.PyJWTError as exc:
        raise InvalidIdToken("invalid_token", type(exc).__name__)
    if claims.get("iss") not in ISSUERS:
        raise InvalidIdToken("invalid_token", "wrong issuer")
    token_nonce = claims.get("nonce")
    if not isinstance(token_nonce, str) or not hmac.compare_digest(token_nonce, nonce):
        raise InvalidIdToken("invalid_token", "nonce mismatch")
    email = claims.get("email")
    if not isinstance(email, str) or "@" not in email:
        raise InvalidIdToken("invalid_token", "no email")
    if claims.get("email_verified") not in (True, "true"):
        raise InvalidIdToken("email_unverified")
    name = claims.get("name") if isinstance(claims.get("name"), str) else None
    return IdTokenClaims(sub=str(claims["sub"]), email=email.strip().lower(), name=name)
