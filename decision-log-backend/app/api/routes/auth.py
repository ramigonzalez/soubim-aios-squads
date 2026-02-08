"""Authentication endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from uuid import UUID

from app.api.models.auth import LoginRequest, TokenResponse, UserResponse
from app.utils.security import create_access_token
from app.services.auth_service import (
    authenticate_user,
    get_user_by_id,
    get_user_projects,
    AuthenticationError,
    UserNotFoundError,
)
from app.database.session import get_db
from app.api.middleware.auth import get_current_user
from app.api.middleware.rate_limit import login_rate_limit
from app.database.models import User

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
async def login(
    request: LoginRequest,
    db: Session = Depends(get_db),
    _: None = Depends(login_rate_limit),
):
    """
    Authenticate user with email and password.

    Returns JWT token and user information.

    🛡️ RATE LIMITED: 5 attempts per 15 minutes per email/IP.

    Args:
        request: LoginRequest with email and password
        db: Database session

    Returns:
        TokenResponse with access_token and user info

    Raises:
        401: If email not found or password incorrect
        429: If rate limit exceeded (too many login attempts)
    """
    try:
        # Authenticate user
        user = authenticate_user(db, request.email, request.password)

        # Get user's projects
        projects = get_user_projects(db, str(user.id))

        # Create JWT token
        token = create_access_token(
            user_id=str(user.id),
            email=user.email,
            role=user.role,
        )

        # Build response
        return TokenResponse(
            access_token=token,
            token_type="bearer",
            user=UserResponse(
                id=user.id,
                email=user.email,
                name=user.name,
                role=user.role,
                projects=projects,
            ),
        )

    except (AuthenticationError, UserNotFoundError) as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )


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

    # Get user's projects
    projects = get_user_projects(db, str(user.id))

    return UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        role=user.role,
        projects=projects,
    )


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
