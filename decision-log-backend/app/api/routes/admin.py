"""Admin-only endpoints for system monitoring.

Story 7.4: Backend Gmail API Poller
"""

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.middleware.auth import get_current_user
from app.scheduler import app_scheduler

router = APIRouter(prefix="/api/admin", tags=["admin"])


def require_director(current_user=Depends(get_current_user)):
    """Dependency that enforces director-level access."""
    if current_user.role != "director":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required (director role)",
        )
    return current_user


@router.get("/scheduler/status")
async def get_scheduler_status(current_user=Depends(require_director)):
    """Return background scheduler status. Admin (director) only."""
    return app_scheduler.get_status()
