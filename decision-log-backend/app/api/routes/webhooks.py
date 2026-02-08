"""Webhook endpoints for Tactiq integration."""

from fastapi import APIRouter, Header, HTTPException, status
from typing import Optional
import hmac
import hashlib

from app.config import settings

router = APIRouter()


@router.post("/transcript")
async def receive_transcript(
    payload: dict,
    x_tactiq_signature: Optional[str] = Header(None),
):
    """
    Receive transcripts from Tactiq webhook.

    Verifies webhook signature and queues extraction task.
    """
    # TODO: Implement signature verification
    # TODO: Queue extraction task with APScheduler

    return {
        "status": "queued",
        "transcript_id": "placeholder-uuid",
        "message": "Transcript received, extraction queued for processing",
    }
