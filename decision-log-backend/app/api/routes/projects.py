"""Project endpoints."""

from fastapi import APIRouter
from typing import List, Optional
from uuid import UUID
from datetime import datetime

router = APIRouter()


class ProjectMember:
    """Project member representation."""

    def __init__(self, user_id: UUID, name: str, email: str, role: str):
        self.user_id = user_id
        self.name = name
        self.email = email
        self.role = role


class ProjectStats:
    """Project statistics."""

    def __init__(self):
        self.total_decisions = 0
        self.decisions_last_week = 0
        self.decisions_by_discipline = {}
        self.decisions_by_meeting_type = {}


class ProjectResponse:
    """Project response model."""

    def __init__(
        self,
        id: UUID,
        name: str,
        description: str,
        created_at: datetime,
        member_count: int = 0,
        decision_count: int = 0,
        latest_decision: Optional[datetime] = None,
    ):
        self.id = id
        self.name = name
        self.description = description
        self.created_at = created_at
        self.member_count = member_count
        self.decision_count = decision_count
        self.latest_decision = latest_decision


@router.get("/")
async def list_projects(limit: int = 50, offset: int = 0):
    """
    List all projects accessible to current user.

    TODO: Implement actual database query with user authorization
    """
    return {
        "projects": [],
        "total": 0,
        "limit": limit,
        "offset": offset,
    }


@router.get("/{project_id}")
async def get_project(project_id: UUID):
    """
    Get detailed information about a specific project.

    TODO: Implement actual database query with user authorization
    """
    return {
        "error": "project_not_found",
        "detail": f"Project {project_id} not found",
    }
