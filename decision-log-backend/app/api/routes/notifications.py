"""Promem revamp Phase 4e: Notificações (computed on read; read state per user)."""

from typing import List, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.middleware.auth import get_current_user
from app.database.session import get_db
from app.services.notifications import mark_all_read, mark_read, notifications

router = APIRouter()


class ReadBody(BaseModel):
    keys: Optional[List[str]] = Field(default=None, max_length=200)
    all: bool = False


@router.get("/notifications")
async def list_notifications(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """The last 14 days: sources awaiting the user's approval, items extracted, items marked as marco."""
    return notifications(db, user)


@router.post("/notifications/read")
async def read_notifications(body: ReadBody, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Mark some (``keys``) or every notification (``all``) as read."""
    if body.all:
        mark_all_read(db, user)
    elif body.keys:
        mark_read(db, user, body.keys)
    return notifications(db, user)
