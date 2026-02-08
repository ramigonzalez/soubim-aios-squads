"""Decision endpoints."""

from fastapi import APIRouter
from typing import Optional
from uuid import UUID

router = APIRouter()


@router.get("/projects/{project_id}/decisions")
async def list_decisions(
    project_id: UUID,
    discipline: Optional[str] = None,
    meeting_type: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    confidence_min: Optional[float] = None,
    has_anomalies: Optional[bool] = None,
    search: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    sort_by: str = "created_at",
    sort_order: str = "desc",
):
    """
    Query decisions with advanced filtering.

    TODO: Implement actual database query with filters
    """
    return {
        "decisions": [],
        "total": 0,
        "limit": limit,
        "offset": offset,
        "facets": {
            "disciplines": {},
            "meeting_types": {},
        },
    }


@router.get("/decisions/{decision_id}")
async def get_decision(decision_id: UUID):
    """
    Get complete details for a single decision.

    TODO: Implement actual database query
    """
    return {
        "error": "resource_not_found",
        "detail": f"Decision {decision_id} not found",
    }


@router.patch("/decisions/{decision_id}")
async def update_decision(decision_id: UUID, approved: Optional[bool] = None, notes: Optional[str] = None):
    """
    Update decision (approval, notes).

    TODO: Implement actual database update
    """
    return {
        "error": "resource_not_found",
        "detail": f"Decision {decision_id} not found",
    }
