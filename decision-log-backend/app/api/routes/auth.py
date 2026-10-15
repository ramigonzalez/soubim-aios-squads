"""Authentication endpoints."""

import logging
from typing import Optional
from urllib.parse import urlencode
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status, Request
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.models.auth import LoginRequest, TokenResponse, UserResponse
from app.config import settings
from app.integrations import google_oidc
from app.services import google_login
from app.utils.security import create_access_token
from app.services.auth_service import (
    authenticate_user,
    change_password as change_user_password,
    get_user_by_id,
    user_response,
    AuthenticationError,
    ChangePasswordError,
    UserNotFoundError,
)
from app.services.organizations import ORGANIZATION_BLOCKED, is_account_blocked
from app.database.session import get_db
from app.api.middleware.auth import get_current_user
from app.api.middleware.rate_limit import enforce_login_email_limit
from app.database.models import User

logger = logging.getLogger(__name__)

router = APIRouter()


def token_response(db: Session, user: User) -> TokenResponse:
    """Our JWT + user info: the same answer for password and Google login."""
    token = create_access_token(user_id=str(user.id), email=user.email, role=user.role)
    return TokenResponse(access_token=token, token_type="bearer", user=user_response(db, user))


def refuse_blocked_account(db: Session, user: User) -> None:
    """Story 12.13: no login for a user whose organizations are all blocked (403 ``organization_blocked``)."""
    if is_account_blocked(db, user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=ORGANIZATION_BLOCKED)


@router.post("/login", response_model=TokenResponse)
async def login(
    request: LoginRequest,
    db: Session = Depends(get_db),
):
    """
    Authenticate user with email and password.

    Returns JWT token and user information.

    RATE LIMITED (Story 13.11): per IP (middleware) and per email, see RATE_LIMIT_LOGIN_* settings.

    Args:
        request: LoginRequest with email and password
        db: Database session

    Returns:
        TokenResponse with access_token and user info

    Raises:
        401: If email not found or password incorrect
        429: If rate limit exceeded (too many login attempts)
    """
    await enforce_login_email_limit(request.email)  # Story 13.11 (per-IP limit is in the middleware)
    try:
        # Story 12.8: the email is compared case-insensitively (authenticate_user normalizes it)
        user = authenticate_user(db, request.email, request.password)
    except (AuthenticationError, UserNotFoundError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    refuse_blocked_account(db, user)  # Story 12.13 (after the password check: no account oracle)
    return token_response(db, user)


@router.get("/me", response_model=UserResponse)
async def get_me(request: Request, db: Session = Depends(get_db)):
    """
    Get current authenticated user information.

    Requires valid JWT token in Authorization header.

    Args:
        request: HTTP request (contains user from middleware)
        db: Database session

    Returns:
        UserResponse with user info and project list

    Raises:
        401: If not authenticated or token invalid
    """
    # Get current user from middleware
    user: User = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Story 12.13: a blocked account never gets here (the auth middleware answers 403 organization_blocked)
    return user_response(db, user)


class ChangePasswordRequest(BaseModel):
    current_password: str = Field(..., max_length=1024)
    new_password: str = Field(..., max_length=1024)


@router.post("/change-password", status_code=204)
async def change_password(
    body: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Story 12.13: the logged-in user changes their own password.

    RATE LIMITED like the login (Story 13.11): per IP in the middleware and per email here (the same
    ``login_email`` bucket, so it cannot be used to guess the password faster than the login).
    400 with a stable code (see ``auth_service.change_password``). Other sessions keep working: JWTs are
    stateless and there is no revocation mechanism yet (story 12.13, Assumptions & gaps).
    """
    await enforce_login_email_limit(current_user.email)
    user = get_user_by_id(db, str(current_user.id))
    try:
        change_user_password(db, user, body.current_password, body.new_password)
    except ChangePasswordError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=exc.code)
    logger.info("Password changed for user %s", user.id)


@router.post("/logout", status_code=204)
async def logout(request: Request):
    """
    Logout endpoint (client-side logout only).

    ⚠️ SECURITY NOTE: JWTs are stateless and cannot be invalidated server-side.
    This endpoint validates the token is valid, but the token will continue to work
    until it expires (7 days). The client MUST delete the token from localStorage.

    For production use with strict security requirements, implement a token blacklist
    using Redis or database storage.

    Args:
        request: HTTP request (contains user from middleware)

    Returns:
        204 No Content
    """
    user = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    # Token is valid, client can discard it
    return None


# ─── Sign in with Google (Story 12.8) ────────────────────────────────────────
# Paths /api/auth/providers and /api/auth/google/* are public (auth_middleware).

GOOGLE_CALLBACK_PAGE = "/auth/google/callback"  # frontend page that redeems the one-time code


class GoogleStartRequest(BaseModel):
    invitation_token: Optional[str] = Field(None, max_length=256)


class GoogleRedeemRequest(BaseModel):
    code: str = Field(..., min_length=1, max_length=google_login.MAX_TOKEN_LENGTH)
    browser_key: str = Field(..., min_length=1, max_length=google_login.MAX_TOKEN_LENGTH)


class GoogleLoginResponse(TokenResponse):
    organization_id: Optional[UUID] = None  # the organization joined when an invitation was accepted


def _require_google() -> None:
    if not google_oidc.is_configured():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Google sign-in is not configured")


def _to_frontend(**fragment: str) -> RedirectResponse:
    """Back to the frontend callback page — always under FRONTEND_URL; data in the fragment
    (never sent to a server or in a Referer), no token or Google code."""
    url = f"{settings.frontend_url.rstrip('/')}{GOOGLE_CALLBACK_PAGE}#{urlencode(fragment)}"
    return RedirectResponse(
        url, status_code=status.HTTP_302_FOUND, headers={"Cache-Control": "no-store", "Referrer-Policy": "no-referrer"}
    )


@router.get("/providers")
async def auth_providers():
    """Login methods available on this server (the frontend hides the Google button when false)."""
    return {"password": True, "google": google_oidc.is_configured()}


@router.post("/google/start")
def google_start(
    body: GoogleStartRequest,
    db: Session = Depends(get_db),
):
    """URL of Google's consent page + a browser key the frontend keeps until it redeems the code."""
    _require_google()
    url, browser_key = google_login.start(db, body.invitation_token or None)
    return {"url": url, "browser_key": browser_key}


@router.get("/google/callback")
def google_callback(
    code: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    error: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Google redirects the browser here (GOOGLE_REDIRECT_URI). Public. Hands a one-time code to the frontend."""
    _require_google()
    if error:
        return _to_frontend(error="denied" if error == "access_denied" else "google_error")
    if not code or not state:
        return _to_frontend(error="invalid_request")
    if not state.isascii():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="invalid_state")
    try:
        login_code = google_login.handle_callback(db, code, state)
    except google_login.GoogleLoginError as exc:
        logger.info("Google sign-in callback rejected: %s", exc.reason)
        return _to_frontend(error=exc.reason)
    return _to_frontend(code=login_code)


@router.post("/google/exchange", response_model=GoogleLoginResponse)
def google_exchange(body: GoogleRedeemRequest, db: Session = Depends(get_db)):
    """Redeem the one-time code (with the browser key from start) for our normal JWT."""
    _require_google()
    try:
        result = google_login.redeem(db, body.code, body.browser_key)
    except google_login.GoogleLoginError as exc:
        raise HTTPException(status_code=exc.status, detail=exc.reason)
    refuse_blocked_account(db, result.user)  # Story 12.13
    logger.info("Google sign-in for user %s", result.user.id)
    response = token_response(db, result.user)
    return GoogleLoginResponse(
        **response.model_dump(), organization_id=result.organization.id if result.organization else None
    )
