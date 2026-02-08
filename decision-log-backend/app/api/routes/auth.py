"""Authentication endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import Optional

from app.api.models.auth import LoginRequest, TokenResponse, UserResponse
from app.utils.security import create_access_token

router = APIRouter()


@router.post("/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    """
    Authenticate user and return JWT token.

    For MVP: hardcoded test user
    TODO: Implement actual database lookup and password verification
    """
    # Placeholder: Accept any email with password "password"
    if request.password != "password":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Create token
    token = create_access_token(
        user_id="test-user-1",
        email=request.email,
        role="director",
    )

    user = UserResponse(
        id="test-user-1",
        email=request.email,
        name="Test User",
        role="director",
        projects=[],
    )

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=user,
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user(authorization: Optional[str] = None):
    """
    Get current authenticated user.

    TODO: Extract and validate JWT token from Authorization header
    """
    # Placeholder implementation
    return UserResponse(
        id="test-user-1",
        email="user@example.com",
        name="Test User",
        role="director",
        projects=[],
    )


@router.post("/logout", status_code=204)
async def logout():
    """Logout endpoint (mainly for security, JWT is stateless)."""
    # JWT is stateless, so we just return 204
    return
