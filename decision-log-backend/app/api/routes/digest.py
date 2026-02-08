"""Executive digest endpoints."""

from fastapi import APIRouter
from typing import Optional
from uuid import UUID

router = APIRouter()


@router.get("/projects/{project_id}/digest")
async def get_digest(
    project_id: UUID,
    date_from: str,
    date_to: str,
):
    """
    Get Gabriela's executive digest for a project.

    TODO: Implement actual digest generation logic
    """
    return {
        "project": {
            "id": str(project_id),
            "name": "",
        },
        "period": {
            "from": date_from,
            "to": date_to,
        },
        "summary": {
            "total_decisions": 0,
            "by_discipline": {},
            "high_impact_decisions": 0,
            "decisions_with_dissent": 0,
        },
        "highlights": [],
        "anomalies": [],
    }
