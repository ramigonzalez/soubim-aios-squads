"""Authentication request/response models."""

from pydantic import BaseModel, EmailStr
from typing import Optional, List
from uuid import UUID


class LoginRequest(BaseModel):
    """User login request."""

    email: EmailStr
    password: str


class OrganizationSummary(BaseModel):
    """An organization of the user (Story 12.13: with its status, for the payment banner)."""

    id: UUID
    name: str
    slug: str
    role: str
    status: str


class UserResponse(BaseModel):
    """User information response."""

    id: UUID
    email: str
    name: str
    role: str
    projects: Optional[List[UUID]] = None
    # Story 12.13: the platform operator lands on /platform and is the only one who sees it
    is_platform_operator: bool = False
    # Story 12.13: organizations whose memberships grant access (blocked ones are left out)
    organizations: List[OrganizationSummary] = []


class TokenResponse(BaseModel):
    """JWT token response."""

    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class LogoutRequest(BaseModel):
    """Logout request (empty body)."""

    pass
