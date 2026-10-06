"""Admin-only endpoints for system monitoring.

Story 7.4: Backend Gmail API Poller
Story 12.2: platform admins (owner/admin of the platform organization) instead of the director role.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.middleware.auth import get_current_user
from app.database.session import get_db
from app.scheduler import app_scheduler
from app.services.access import require_platform_admin

router = APIRouter(prefix="/api/admin", tags=["admin"])


def require_platform_admin_user(current_user=Depends(get_current_user), db: Session = Depends(get_db)):
    """Dependency that enforces platform-admin access (Story 12.2)."""
    require_platform_admin(db, current_user)
    return current_user


@router.get("/scheduler/status")
async def get_scheduler_status(current_user=Depends(require_platform_admin_user)):
    """Return background scheduler status. Platform admins only."""
    return app_scheduler.get_status()
