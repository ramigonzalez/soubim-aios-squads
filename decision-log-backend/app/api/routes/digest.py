"""Executive digest endpoints."""

from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.middleware.auth import get_current_user
from app.database.session import get_db
from app.services.access import require_project_access

router = APIRouter()


@router.get("/projects/{project_id}/digest")
async def get_digest(
    project_id: UUID,
    date_from: str,
    date_to: str,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """
    Get Gabriela's executive digest for a project.

    TODO: Implement actual digest generation logic
    """
    require_project_access(db, user, project_id)  # Story 12.2
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
