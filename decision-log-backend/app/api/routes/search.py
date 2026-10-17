"""Promem revamp Phase 4d: GET /api/search — the global search (⌘K)."""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.middleware.auth import get_current_user
from app.database.session import get_db
from app.services.search import search

router = APIRouter()


@router.get("/search")
async def global_search(
    q: str = Query("", max_length=200),
    limit: int = Query(5, ge=1, le=20),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """Projects, items and meetings matching every word of ``q`` that the user can see (5 per group)."""
    return search(db, user, q, limit)
