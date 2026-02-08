"""Decision endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import Optional
from uuid import UUID
from sqlalchemy.orm import Session

from app.database.session import get_db
from app.database.models import Decision

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
    db: Session = Depends(get_db),
):
    """
    Query decisions with advanced filtering.
    """
    # Build query
    query = db.query(Decision).filter(Decision.project_id == str(project_id))

    # Apply filters
    if discipline:
        query = query.filter(Decision.discipline == discipline)

    if confidence_min is not None:
        query = query.filter(Decision.confidence >= confidence_min)

    if search:
        search_term = f"%{search}%"
        query = query.filter(
            (Decision.decision_statement.ilike(search_term)) |
            (Decision.why.ilike(search_term))
        )

    # Get total count before pagination
    total = query.count()

    # Apply sorting
    if sort_by == "created_at":
        col = Decision.created_at
    elif sort_by == "confidence":
        col = Decision.confidence
    else:
        col = Decision.created_at

    if sort_order.lower() == "asc":
        query = query.order_by(col.asc())
    else:
        query = query.order_by(col.desc())

    # Apply pagination
    query = query.limit(limit).offset(offset)

    # Get decisions
    decisions = query.all()

    # Format response
    decisions_list = [
        {
            "id": str(d.id),
            "project_id": str(d.project_id),
            "transcript_id": str(d.transcript_id) if d.transcript_id else None,
            "decision_statement": d.decision_statement,
            "who": d.who,
            "timestamp": d.timestamp,
            "discipline": d.discipline,
            "why": d.why,
            "causation": d.causation,
            "impacts": d.impacts,
            "consensus": d.consensus,
            "confidence": d.confidence,
            "created_at": d.created_at.isoformat() if d.created_at else None,
        }
        for d in decisions
    ]

    # Get disciplines and meeting types for facets
    all_decisions = db.query(Decision).filter(Decision.project_id == str(project_id)).all()
    disciplines = {}
    for d in all_decisions:
        disciplines[d.discipline] = disciplines.get(d.discipline, 0) + 1

    return {
        "decisions": decisions_list,
        "total": total,
        "limit": limit,
        "offset": offset,
        "facets": {
            "disciplines": disciplines,
            "meeting_types": {},
        },
    }


@router.get("/decisions/{decision_id}")
async def get_decision(decision_id: UUID, db: Session = Depends(get_db)):
    """
    Get complete details for a single decision.
    """
    decision = db.query(Decision).filter(Decision.id == str(decision_id)).first()

    if not decision:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Decision {decision_id} not found",
        )

    return {
        "id": str(decision.id),
        "project_id": str(decision.project_id),
        "transcript_id": str(decision.transcript_id) if decision.transcript_id else None,
        "decision_statement": decision.decision_statement,
        "who": decision.who,
        "timestamp": decision.timestamp,
        "discipline": decision.discipline,
        "why": decision.why,
        "causation": decision.causation,
        "impacts": decision.impacts,
        "consensus": decision.consensus,
        "confidence": decision.confidence,
        "similar_decisions": decision.similar_decisions,
        "consistency_notes": decision.consistency_notes,
        "anomaly_flags": decision.anomaly_flags,
        "created_at": decision.created_at.isoformat() if decision.created_at else None,
        "updated_at": decision.updated_at.isoformat() if decision.updated_at else None,
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
