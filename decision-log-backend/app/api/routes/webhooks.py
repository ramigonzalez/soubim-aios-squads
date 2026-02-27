"""Webhook endpoints for Tactiq integration.

Creates Source records with ingestion_status='pending' and schedules
AI summary generation as a background task.
"""

from datetime import datetime
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database.models import Source
from app.database.session import get_db
from app.services.summary_service import generate_ai_summary

router = APIRouter()


@router.post("/transcript", status_code=status.HTTP_202_ACCEPTED)
async def receive_transcript(
    payload: dict,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    x_tactiq_signature: Optional[str] = Header(None),
):
    """
    Receive transcripts from Tactiq webhook.

    Creates a Source record with ingestion_status='pending' and schedules
    AI summary generation in the background. Returns 202 Accepted.

    Duplicate webhooks are detected via webhook_id for idempotency.
    """
    # Check for duplicate webhook (idempotency)
    webhook_id = payload.get("webhook_id")
    if webhook_id:
        existing = db.query(Source).filter(Source.webhook_id == webhook_id).first()
        if existing:
            return {"status": "duplicate", "source_id": str(existing.id)}

    # Parse occurred_at from meeting_date
    meeting_date_str = payload.get("meeting_date")
    if meeting_date_str:
        try:
            occurred_at = datetime.fromisoformat(meeting_date_str)
        except (ValueError, TypeError):
            occurred_at = datetime.utcnow()
    else:
        occurred_at = datetime.utcnow()

    # Create Source record with pending status
    source = Source(
        id=uuid4(),
        project_id=payload["project_id"],
        source_type="meeting",
        title=payload.get("meeting_title", "Untitled Meeting"),
        occurred_at=occurred_at,
        ingestion_status="pending",
        raw_content=payload.get("transcript"),
        meeting_type=payload.get("meeting_type"),
        participants=payload.get("participants"),
        duration_minutes=payload.get("duration_minutes"),
        webhook_id=webhook_id,
    )
    db.add(source)
    db.commit()

    # Schedule AI summary generation as background task
    background_tasks.add_task(generate_ai_summary, str(source.id))

    return {"status": "pending", "source_id": str(source.id)}
