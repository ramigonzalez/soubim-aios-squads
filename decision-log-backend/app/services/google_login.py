"""Sign in with Google (Story 12.8): start → Google → callback → one-time code → our JWT.

1. ``start`` (public): creates a ``google_login_requests`` row (state nonce, OIDC nonce, PKCE
   verifier, hash of a browser key) and returns the Google authorize URL plus the browser key,
   which the frontend keeps in ``sessionStorage``. From an invitation page the invitation is
   validated here and bound to the request.
2. ``handle_callback`` (public, Google redirects the browser to the API): verifies the signed
   ``state`` (HMAC, expiry), claims the row once (replays fail), exchanges the code with the PKCE
   verifier, verifies the ID token (JWKS, iss, aud, exp, nonce, email_verified) and stores the
   verified email. Returns a one-time login code (only its hash is stored).
3. ``redeem`` (public, called by the frontend with the code from the URL fragment + the browser
   key): the browser key must match (login CSRF: a code from someone else's flow cannot be used
   in this browser), the code is used once and expires in 2 minutes. Then the account is
   resolved — **no open signup**:
   - normal login: an active user with that email (case-insensitive); soft-deleted → refused;
     unknown → refused;
   - Google account binding: the first Google sign-in stores the ID token ``sub`` on the user
     (``users.google_sub``); later Google sign-ins must present the same ``sub``
     (``google_account_mismatch`` otherwise — never overwritten), and a ``sub`` already bound to
     another account is refused (``google_account_in_use``). First login wins;
   - from an invitation: the Google email must equal the invited email; the invitation is
     accepted for the existing active user, or a new account is created (name from Google, an
     unusable random password). A soft-deleted account with that email is never revived.
"""

import base64
import hashlib
import hmac
import json
import logging
import secrets
import time
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Optional, Tuple

from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import settings
from app.database.models import GoogleLoginRequest, Organization, OrganizationInvitation, User
from app.integrations import google_oidc
from app.services import invitations as inv
from app.services.auth_service import find_active_user_by_email
from app.utils.security import hash_password

logger = logging.getLogger(__name__)

REQUEST_TTL = timedelta(minutes=10)  # time to complete the Google consent
LOGIN_CODE_TTL = timedelta(minutes=2)  # time for the frontend to redeem the code
MAX_TOKEN_LENGTH = 128
_STATE_CONTEXT = b"google-oidc-state:"  # domain separation from other uses of the JWT secret


class GoogleLoginError(Exception):
    """A step failed. ``reason`` is a stable code shown by the frontend; ``status`` for the API."""

    def __init__(self, reason: str, status: int = 400):
        super().__init__(reason)
        self.reason = reason
        self.status = status


@dataclass
class LoginResult:
    user: User
    organization: Optional[Organization] = None  # set when an invitation was accepted


def utcnow() -> datetime:
    return datetime.utcnow()


def _sha256(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()


def _unb64(text: str) -> bytes:
    return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))


def _signature(payload: str) -> str:
    key = settings.jwt_secret_key.encode()
    return _b64(hmac.new(key, _STATE_CONTEXT + payload.encode(), hashlib.sha256).digest())


def sign_state(state_nonce: str, expires_at: float) -> str:
    payload = _b64(json.dumps({"n": state_nonce, "exp": int(expires_at)}, separators=(",", ":")).encode())
    return f"{payload}.{_signature(payload)}"


def parse_state(state: str, now: Optional[float] = None) -> str:
    """Return the state nonce of a well-signed, unexpired state; raise GoogleLoginError otherwise."""
    now = time.time() if now is None else now
    if not isinstance(state, str) or not state.isascii():
        raise GoogleLoginError("invalid_state")  # compare_digest on str raises TypeError on non-ASCII
    try:
        payload, signature = state.split(".", 1)
    except ValueError:
        raise GoogleLoginError("invalid_state")
    if not hmac.compare_digest(signature.encode(), _signature(payload).encode()):
        raise GoogleLoginError("invalid_state")
    try:
        data = json.loads(_unb64(payload))
        nonce, expires = data["n"], int(data["exp"])
    except (ValueError, KeyError, TypeError):
        raise GoogleLoginError("invalid_state")
    if not isinstance(nonce, str) or not nonce or len(nonce) > 64 or now > expires:
        raise GoogleLoginError("invalid_state")
    return nonce


def cleanup_expired(db: Session) -> None:
    """Delete expired requests (opportunistic, no cron). Does not commit."""
    db.query(GoogleLoginRequest).filter(GoogleLoginRequest.expires_at < utcnow()).delete(synchronize_session=False)


# --------------------------------------------------------------------------- 1. start


def start(db: Session, invitation_token: Optional[str] = None) -> Tuple[str, str]:
    """Create a login request; return ``(authorize_url, browser_key)``. Commits.

    With ``invitation_token`` the invitation must be pending (404 unknown, 410 used/revoked/expired).
    """
    invitation = inv.find_by_token(db, invitation_token) if invitation_token else None
    cleanup_expired(db)
    now = utcnow()
    expires_at = now + REQUEST_TTL
    state_nonce = secrets.token_urlsafe(24)
    oidc_nonce = secrets.token_urlsafe(24)
    verifier, challenge = google_oidc.pkce_pair()
    browser_key = secrets.token_urlsafe(32)
    db.add(GoogleLoginRequest(
        state_nonce=state_nonce,
        oidc_nonce=oidc_nonce,
        code_verifier=verifier,
        browser_key_hash=_sha256(browser_key),
        invitation_id=invitation.id if invitation is not None else None,
        expires_at=expires_at,
        created_at=now,
    ))
    db.commit()
    state = sign_state(state_nonce, time.time() + REQUEST_TTL.total_seconds())
    url = google_oidc.authorize_url(
        state, oidc_nonce, challenge, login_hint=invitation.email if invitation is not None else None
    )
    return url, browser_key


# --------------------------------------------------------------------------- 2. callback


def handle_callback(db: Session, code: str, state: str, http=None) -> str:
    """Verify the state, exchange the code, verify the ID token; return a one-time login code. Commits.

    Raises GoogleLoginError(reason): invalid_state (bad/expired/replayed state), exchange_failed,
    invalid_token, email_unverified.
    """
    state_nonce = parse_state(state)
    now = utcnow()
    # claim the request once: a replayed state (or two racing callbacks) finds 0 rows
    claimed = (
        db.query(GoogleLoginRequest)
        .filter(
            GoogleLoginRequest.state_nonce == state_nonce,
            GoogleLoginRequest.callback_at.is_(None),
            GoogleLoginRequest.expires_at > now,
        )
        .update({GoogleLoginRequest.callback_at: now}, synchronize_session=False)
    )
    db.commit()
    if claimed != 1:
        raise GoogleLoginError("invalid_state")
    request = db.query(GoogleLoginRequest).filter(GoogleLoginRequest.state_nonce == state_nonce).one()
    verifier, request.code_verifier = request.code_verifier, None  # PKCE verifier used once
    db.commit()
    try:
        id_token = google_oidc.exchange_code(code, verifier or "", http)
    except google_oidc.GoogleAuthError as exc:
        logger.warning("Google code exchange failed: %s", exc)
        raise GoogleLoginError("exchange_failed")
    try:
        claims = google_oidc.verify_id_token(id_token, request.oidc_nonce, http)
    except google_oidc.InvalidIdToken as exc:
        logger.warning("Google ID token rejected: %s", exc)
        raise GoogleLoginError(exc.reason)

    login_code = secrets.token_urlsafe(32)
    request.email = claims.email
    request.google_sub = claims.sub
    request.name = (claims.name or "").strip()[:255] or None
    request.login_code_hash = _sha256(login_code)
    request.expires_at = utcnow() + LOGIN_CODE_TTL
    db.commit()
    return login_code


# --------------------------------------------------------------------------- 3. redeem


def _check_sub(db: Session, user: Optional[User], sub: str) -> None:
    """Refuse a Google account that is not the one bound to ``user`` (or bound to someone else)."""
    if user is not None and user.google_sub is not None and user.google_sub != sub:
        logger.warning("Google sign-in for user %s with a different Google account (refused)", user.id)
        raise GoogleLoginError("google_account_mismatch", 403)
    other = db.query(User.id).filter(User.google_sub == sub)
    if user is not None:
        other = other.filter(User.id != user.id)
    if other.first() is not None:
        raise GoogleLoginError("google_account_in_use", 403)


def _bind_sub(db: Session, user: User, sub: str) -> None:
    """Store ``sub`` on ``user`` if none is bound yet (first login wins; never overwritten). Commits."""
    if user.google_sub == sub:
        return
    try:
        bound = (
            db.query(User)
            .filter(User.id == user.id, User.google_sub.is_(None))
            .update({User.google_sub: sub}, synchronize_session=False)
        )
        db.commit()
    except IntegrityError:  # the same Google account was bound to another user concurrently
        db.rollback()
        raise GoogleLoginError("google_account_in_use", 403)
    db.refresh(user)
    if bound != 1 and user.google_sub != sub:  # another Google account was bound concurrently
        raise GoogleLoginError("google_account_mismatch", 403)


def _accept_invitation(
    db: Session, invitation: OrganizationInvitation, email: str, name: Optional[str], sub: str
) -> LoginResult:
    if inv.normalize_email(invitation.email) != email:
        raise GoogleLoginError("email_mismatch", 403)
    user = find_active_user_by_email(db, email)
    if user is None:
        if db.query(User.id).filter(func.lower(User.email) == email).first() is not None:
            raise GoogleLoginError("account_disabled", 403)  # soft-deleted: never revived
        _check_sub(db, None, sub)
        unusable_password = hash_password(secrets.token_urlsafe(32))  # Google-only account: no known password
        user, org = inv.create_invited_user(db, invitation, name or email.split("@", 1)[0], unusable_password)
        _bind_sub(db, user, sub)
        return LoginResult(user=user, organization=org)
    _check_sub(db, user, sub)
    _bind_sub(db, user, sub)
    org = inv.accept_for_user(db, invitation, user)
    return LoginResult(user=user, organization=org)


def redeem(db: Session, login_code: str, browser_key: str) -> LoginResult:
    """Exchange the one-time login code for the user to log in. Commits.

    Raises GoogleLoginError: invalid_code (404), browser_mismatch (403, code burnt), expired (410),
    unknown_email / account_disabled / email_mismatch / google_account_mismatch /
    google_account_in_use (403), invitation_gone (410).
    """
    if not (isinstance(login_code, str) and 0 < len(login_code) <= MAX_TOKEN_LENGTH):
        raise GoogleLoginError("invalid_code", 404)
    request = (
        db.query(GoogleLoginRequest).filter(GoogleLoginRequest.login_code_hash == _sha256(login_code)).first()
    )
    if request is None or request.consumed_at is not None or not request.email or not request.google_sub:
        raise GoogleLoginError("invalid_code", 404)
    now = utcnow()
    burn = {GoogleLoginRequest.consumed_at: now}
    claimed = (
        db.query(GoogleLoginRequest)
        .filter(GoogleLoginRequest.id == request.id, GoogleLoginRequest.consumed_at.is_(None))
        .update(burn, synchronize_session=False)
    )
    db.commit()
    if claimed != 1:
        raise GoogleLoginError("invalid_code", 404)
    if not hmac.compare_digest(_sha256(browser_key or ""), request.browser_key_hash):
        logger.warning("Google login code %s presented by another browser (rejected)", request.id)
        raise GoogleLoginError("browser_mismatch", 403)
    if request.expires_at <= now:
        raise GoogleLoginError("expired", 410)

    email, name, sub = request.email, request.name, request.google_sub
    if request.invitation_id is not None:
        invitation = db.get(OrganizationInvitation, request.invitation_id)
        if invitation is None or inv.status_of(invitation) != "pending":
            raise GoogleLoginError("invitation_gone", 410)
        try:
            return _accept_invitation(db, invitation, email, name, sub)
        except HTTPException as exc:  # concurrent accept / revoke (410) or email race (409)
            raise GoogleLoginError("invitation_gone" if exc.status_code == 410 else "account_exists", exc.status_code)

    user = find_active_user_by_email(db, email)
    if user is None:
        disabled = db.query(User.id).filter(func.lower(User.email) == email).first() is not None
        raise GoogleLoginError("account_disabled" if disabled else "unknown_email", 403)
    _check_sub(db, user, sub)
    _bind_sub(db, user, sub)
    return LoginResult(user=user)
