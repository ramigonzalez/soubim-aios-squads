"""JWT authentication middleware."""

from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from app.utils.security import decode_access_token
from app.services.auth_service import get_user_by_id, UserNotFoundError
from app.services.organizations import ACTIVE_ORGANIZATION_HEADER, validate_active_organization
from app.database.session import SessionLocal


async def auth_middleware(request: Request, call_next):
    """
    Extract and validate JWT token from Authorization header.

    Attaches user to request.state.user if valid token.
    Raises 401 if token invalid/expired/missing on protected endpoints.
    """
    # Get authorization header
    auth_header = request.headers.get("Authorization")

    # Public endpoints that don't require authentication
    public_paths = [
        "/api/health",
        "/api/shared/",
        "/api/recordings/",  # Story 7.13: signed, expiring recording links (checked in the route)
        "/api/invitations/public/",  # Story 12.5: the invitation token identifies the invitee
        "/api/fathom/callback",  # Story 13.3: Fathom OAuth redirect (the signed state identifies the user)
        "/docs",
        "/openapi.json",
        "/redoc",
    ]

    # Check if this is a public endpoint
    if any(request.url.path.startswith(path) for path in public_paths):
        return await call_next(request)

    # Login/logout don't require valid token yet
    if request.url.path == "/api/auth/login" and request.method == "POST":
        return await call_next(request)

    # Extract token
    token = None
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header[7:]  # Remove "Bearer " prefix

    if not token:
        # Protected endpoint without token
        if request.url.path.startswith("/api/"):
            return JSONResponse(
                status_code=status.HTTP_401_UNAUTHORIZED,
                content={"detail": "Missing authentication token"},
                headers={"WWW-Authenticate": "Bearer"},
            )
        return await call_next(request)

    # Validate token
    payload = decode_access_token(token)
    if not payload:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"detail": "Invalid or expired token"},
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Load user from database
    db = SessionLocal()
    try:
        user = get_user_by_id(db, payload.get("user_id"))
        request.state.user = user
        # Story 12.5: active organization (X-Organization-Id) — the user must belong to it.
        # /organizations/me lists the memberships, so a stale id must not lock the client out of it.
        if request.url.path != "/api/organizations/me":
            request.state.active_organization_id = validate_active_organization(
                db, user, request.headers.get(ACTIVE_ORGANIZATION_HEADER)
            )
    except HTTPException as exc:
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})
    except UserNotFoundError:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"detail": "User not found"},
        )
    finally:
        db.close()

    return await call_next(request)


def get_current_user(request: Request):
    """
    Dependency to get current authenticated user from request.

    Raises 401 if user not authenticated.
    """
    user = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    return user
