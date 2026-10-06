"""Webhook endpoints for Tactiq integration.

Creates Source records with ingestion_status='pending' and schedules
AI summary generation as a background task.
"""

import hmac
from datetime import datetime
from typing import Optional
from uuid import uuid4

from fastapi import APIRouter, BackgroundTasks, Depends, Header, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database.models import Source
from app.database.session import get_db
from app.services.access import WRITE, acting_organization_id, require_project_access, source_visible
from app.services.summary_service import generate_ai_summary

router = APIRouter()

# Tactiq documents no signature scheme (Story 7.19): the only option is a static shared secret that
# the sender (Tactiq via Zapier "Webhooks by Zapier" custom Headers) puts in a header.
SECRET_HEADER = "X-Tactiq-Secret"
_PLACEHOLDER_SECRETS = {"", "whsec_your-webhook-secret"}


def _is_production() -> bool:
    return settings.environment.lower() in ("production", "prod")


def verify_tactiq_secret(provided: Optional[str]) -> None:
    """Check the shared secret header (constant-time). Never logs or echoes either value.

    - header present: must match, in every environment (a wrong secret is always a 401);
    - header absent: rejected in production, accepted elsewhere (dev/test keep working);
    - production with no real secret configured: refuse everything (503) instead of fail open.
    """
    if not isinstance(provided, str):  # unset header (direct calls get FastAPI's Header default object)
        provided = None
    configured = settings.tactiq_webhook_secret or ""
    if _is_production() and configured in _PLACEHOLDER_SECRETS:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Webhook secret is not configured")
    if provided is None:
        if _is_production():
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid webhook secret")
        return
    if not hmac.compare_digest(provided.encode("utf-8"), configured.encode("utf-8")):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid webhook secret")


@router.post("/transcript", status_code=status.HTTP_202_ACCEPTED)
async def receive_transcript(
    payload: dict,
    request: Request,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    x_tactiq_secret: Optional[str] = Header(None),
):
    """
    Receive transcripts from Tactiq webhook.

    Creates a Source record with ingestion_status='pending' and schedules
    AI summary generation in the background. Returns 202 Accepted.

    Duplicate webhooks are detected via webhook_id for idempotency.
    Story 12.2: the caller needs write access to the payload's project.
    Story 7.19: the shared secret in X-Tactiq-Secret is checked first (required in production).
    """
    verify_tactiq_secret(x_tactiq_secret)
    user = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    if not payload.get("project_id"):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="project_id is required")
    project = require_project_access(db, user, payload["project_id"], WRITE)

    # Check for duplicate webhook (idempotency)
    webhook_id = payload.get("webhook_id")
    if webhook_id:
        existing = db.query(Source).filter(Source.webhook_id == webhook_id).first()
        if existing:
            # Story 12.2 security review: never reveal a source of another project/organization
            # Story 12.4: nor an internal source of another organization on the same project
            if str(existing.project_id) != str(payload["project_id"]) or not source_visible(db, user, existing):
                raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="webhook_id already used")
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
        owner_organization_id=acting_organization_id(db, user, project),  # Story 12.4: internal by default
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

    # Story 7.7: Schedule auto-upload to curation storage
    background_tasks.add_task(_upload_to_curation_storage, str(source.id))

    return {"status": "pending", "source_id": str(source.id)}


def _upload_to_curation_storage(source_id: str):
    """Background task: upload source content to external storage for curation."""
    try:
        from app.database.session import SessionLocal
        from app.services.source_curation import SourceCurationService
        db = SessionLocal()
        try:
            service = SourceCurationService(db)
            service.upload_to_storage(source_id)
        finally:
            db.close()
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Curation upload failed for source {source_id}: {e}")
