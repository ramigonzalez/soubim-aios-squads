"""Authentication request/response models."""

from pydantic import BaseModel, EmailStr
from typing import Optional, List
from uuid import UUID


class LoginRequest(BaseModel):
    """User login request."""

    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """User information response."""

    id: UUID
    email: str
    name: str
    role: str
    projects: Optional[List[UUID]] = None


class TokenResponse(BaseModel):
    """JWT token response."""

    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class LogoutRequest(BaseModel):
    """Logout request (empty body)."""

    pass
