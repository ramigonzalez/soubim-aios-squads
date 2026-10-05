"""Organization endpoints (Story 12.1)."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.middleware.auth import get_current_user
from app.database.session import get_db
from app.services.organizations import get_memberships

router = APIRouter()


@router.get("/organizations/me")
async def my_organizations(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Organizations the current user belongs to, with their role in each."""
    return [
        {
            "id": str(m.organization.id),
            "name": m.organization.name,
            "slug": m.organization.slug,
            "role": m.role,
        }
        for m in get_memberships(db, user)
    ]
