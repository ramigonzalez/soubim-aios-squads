"""JWT authentication middleware."""

from fastapi import Request, HTTPException, status
from sqlalchemy.orm import Session

from app.utils.security import decode_access_token
from app.services.auth_service import get_user_by_id, UserNotFoundError
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
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Missing authentication token",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return await call_next(request)

    # Validate token
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Load user from database
    db = SessionLocal()
    try:
        user = get_user_by_id(db, payload.get("user_id"))
        request.state.user = user
    except UserNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
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
