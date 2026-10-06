"""Rate limiting (Story 13.11): slowapi's Limiter (backed by the ``limits`` package) behind one middleware.

Design
- One check per request, no DB access: the rule is picked by path prefix, the bucket key is the client
  IP (public routes) or the user id read from the JWT signature alone (authenticated routes).
- Storage: in-memory by default (per instance). Set ``RATE_LIMIT_STORAGE_URI`` (e.g. ``redis://...``) so
  the limits are shared across instances. Strategy: ``fixed-window`` (one counter per key).
- Fail open: if the shared storage errors the request is let through (and the error logged); a Redis
  outage must not take the API down.
- Limits are read from settings at request time (``RATE_LIMIT_*``).
- The per-email login limit runs in the login route (``enforce_login_email_limit``), where the body is parsed.
"""

import ipaddress
import logging
import math
import re
import time
from functools import lru_cache
from typing import Callable, List, NamedTuple, Optional, Tuple

from fastapi import FastAPI, HTTPException, Request
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import JSONResponse
from limits import RateLimitItem, parse
from slowapi import Limiter

from app.config import settings
from app.utils.security import decode_access_token

logger = logging.getLogger(__name__)

_UUID_RE = re.compile(r"^[0-9a-fA-F-]{36}$")


def client_ip(request: Request) -> str:
    """The real client IP.

    ``X-Forwarded-For`` is honoured only when ``TRUSTED_PROXY`` is set. The client controls the left side
    of the header, so we take the entry our own proxy appended, ``TRUSTED_PROXY_HOPS`` from the right
    (1 = a single proxy, e.g. Railway's edge). Missing or malformed values fall back to the socket peer.
    """
    peer = request.client.host if request.client else "unknown"
    if not settings.trusted_proxy:
        return peer
    parts = [p.strip() for p in request.headers.get("x-forwarded-for", "").split(",") if p.strip()]
    hops = max(settings.trusted_proxy_hops, 1)
    if len(parts) < hops:
        return peer
    try:
        return str(ipaddress.ip_address(parts[-hops]))
    except ValueError:
        return peer


# The engine (storage + strategy).
limiter = Limiter(
    key_func=client_ip,
    storage_uri=settings.rate_limit_storage_uri or "memory://",
    strategy="fixed-window",
    enabled=settings.rate_limit_enabled,
)
_SHARED_STORAGE = bool(settings.rate_limit_storage_uri)


@lru_cache(maxsize=64)
def _item(limit: str) -> RateLimitItem:
    return parse(limit)


class Rule(NamedTuple):
    name: str
    limit: Callable[[], str]
    key: Callable[[Request], str]


def _ip_key(request: Request) -> str:
    return client_ip(request)


def _fathom_webhook_key(request: Request) -> str:
    """Per connection (the id in the path). A malformed id falls back to the IP, so random ids cannot
    create unbounded buckets."""
    conn_id = request.url.path.rsplit("/", 1)[-1]
    return f"conn:{conn_id.lower()}" if _UUID_RE.match(conn_id) else client_ip(request)


# First match wins; prefix match on the request path.
_PUBLIC_RULES: List[Tuple[str, Rule]] = [
    ("/api/invitations/public/", Rule("invitation", lambda: settings.rate_limit_invitation, _ip_key)),
    ("/api/fathom/callback", Rule("oauth_callback", lambda: settings.rate_limit_oauth_callback, _ip_key)),
    ("/api/auth/google/", Rule("oauth_callback", lambda: settings.rate_limit_oauth_callback, _ip_key)),  # Story 12.8
    ("/api/fathom/webhook/", Rule("webhook_fathom", lambda: settings.rate_limit_webhook, _fathom_webhook_key)),
    ("/api/webhooks/", Rule("webhook", lambda: settings.rate_limit_webhook, _ip_key)),
    ("/api/shared/", Rule("public_link", lambda: settings.rate_limit_public_link, _ip_key)),
    ("/api/recordings/", Rule("public_link", lambda: settings.rate_limit_public_link, _ip_key)),
]
_LOGIN = Rule("login_ip", lambda: settings.rate_limit_login_ip, _ip_key)
_DEFAULT = Rule("api", lambda: settings.rate_limit_default, _ip_key)

_EXEMPT_PREFIXES = ("/api/health", "/docs", "/openapi.json", "/redoc")


def _select_rule(request: Request) -> Optional[Rule]:
    path = request.url.path
    if path.startswith(_EXEMPT_PREFIXES) or request.method == "OPTIONS":
        return None
    if path == "/api/auth/login" and request.method == "POST":
        return _LOGIN
    for prefix, rule in _PUBLIC_RULES:
        if path.startswith(prefix):
            return rule
    return _DEFAULT if path.startswith("/api/") else None


def _user_key(request: Request) -> Optional[str]:
    """User id from a valid bearer token (signature check only, no DB)."""
    header = request.headers.get("Authorization", "")
    if not header.startswith("Bearer "):
        return None
    payload = decode_access_token(header[7:])
    user_id = payload.get("user_id") if payload else None
    return f"user:{user_id}" if user_id else None


def _hit(limit: str, scope: str, key: str) -> bool:
    return limiter.limiter.hit(_item(limit), scope, key)


async def _allowed(limit: str, scope: str, key: str) -> bool:
    """Count one hit; True while within the limit. Fails open if the storage errors."""
    try:
        if _SHARED_STORAGE:  # network round trip: keep it off the event loop
            return await run_in_threadpool(_hit, limit, scope, key)
        return _hit(limit, scope, key)
    except Exception:  # storage outage
        logger.exception("Rate limit storage error; allowing the request")
        return True


def too_many_requests(
    limit: str, scope: str, key: str, message: str = "Too many requests. Please try again later."
) -> JSONResponse:
    """429 with ``Retry-After`` (seconds until the window resets) and a JSON ``detail``."""
    retry_after = 1
    try:
        reset_time, _ = limiter.limiter.get_window_stats(_item(limit), scope, key)
        retry_after = max(math.ceil(reset_time - time.time()), 1)
    except Exception:
        pass
    return JSONResponse(
        status_code=429,
        content={"detail": message, "retry_after": retry_after},
        headers={"Retry-After": str(retry_after)},
    )


async def rate_limit_middleware(request: Request, call_next):
    """Applies the matching rule: authenticated API calls per user, everything else per IP."""
    if not limiter.enabled:
        return await call_next(request)
    rule = _select_rule(request)
    if rule is None:
        return await call_next(request)
    key = rule.key(request)
    if rule is _DEFAULT:
        key = _user_key(request) or key
    limit = rule.limit()
    if not await _allowed(limit, rule.name, key):
        return too_many_requests(limit, rule.name, key)
    return await call_next(request)


async def enforce_login_email_limit(email: str) -> None:
    """Per-email brute-force limit, called by the login route (the per-IP limit is in the middleware).

    Counts every attempt for the address, so a distributed guess against one account is slowed down
    wherever it comes from. The key is the lower-cased email. Raises 429 with ``Retry-After``.
    """
    if not limiter.enabled:
        return
    key = email.strip().lower()
    for limit in (settings.rate_limit_login_email_minute, settings.rate_limit_login_email_hour):
        if not await _allowed(limit, "login_email", key):
            response = too_many_requests(limit, "login_email", key, "Too many login attempts. Please try again later.")
            raise HTTPException(
                status_code=429,
                detail="Too many login attempts. Please try again later.",
                headers={"Retry-After": response.headers["Retry-After"]},
            )


def setup_rate_limiting(app: FastAPI) -> None:
    """Register the limiter middleware.

    Call it after the auth middleware and before CORS is added, so the limiter runs before the auth
    DB lookup and its 429 still carries the CORS headers.
    """
    app.state.limiter = limiter

    app.middleware("http")(rate_limit_middleware)
