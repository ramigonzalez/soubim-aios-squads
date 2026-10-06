"""Item review by role (Story 12.6): approve / reject / edit / restore, one item or in bulk.

Only users with review access on the project can review: the owning organization's owner/admin, or its
assigned reviewer (Story 12.7).
Reviews belong to the item, and items belong to an extraction run (13.7): a new or re-activated run
brings its own review state, nothing is carried over.
"""

from datetime import datetime, timezone
from typing import List, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.routes.project_items import _get_user, _item_to_response
from app.database.models import ProjectItem
from app.database.session import get_db
from app.services.access import APPROVED, REVIEW, item_visible, require_project_access, visible_items_filter
from app.services.extraction_runs import active_items_filter
from app.services.item_review import apply_edits, restore_original

router = APIRouter()


class ReviewBody(BaseModel):
    status: Literal["pending", "approved", "rejected"]


class ItemEditBody(BaseModel):
    title: Optional[str] = Field(None, max_length=255)
    statement: Optional[str] = Field(None, min_length=1)
    why: Optional[str] = None
    owner: Optional[str] = Field(None, max_length=255)
    due_date: Optional[datetime] = None


class BulkReviewBody(BaseModel):
    status: Literal["approved", "rejected"]
    item_ids: Optional[List[str]] = None
    source_id: Optional[str] = None  # every pending item of this meeting's active run


def _load_item(db: Session, user, project_id: str, item_id: str) -> ProjectItem:
    item = db.query(ProjectItem).filter(ProjectItem.id == item_id, ProjectItem.project_id == project_id).first()
    if not item_visible(db, user, item):
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail=f"Project item {item_id} not found")
    return item


def _mark(item: ProjectItem, user, review_status: str) -> None:
    item.review_status = review_status
    if review_status == "pending":
        item.reviewed_by, item.reviewed_at = None, None
    else:
        item.reviewed_by, item.reviewed_at = user.id, datetime.now(timezone.utc).replace(tzinfo=None)


@router.post("/projects/{project_id}/items/review")
async def bulk_review(project_id: str, body: BulkReviewBody, request: Request, db: Session = Depends(get_db)):
    """Approve or reject several items at once: by id, or every pending item of one meeting."""
    user = _get_user(request)
    require_project_access(db, user, project_id, REVIEW)
    if bool(body.item_ids) == bool(body.source_id):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Send item_ids or source_id")

    query = db.query(ProjectItem).filter(
        ProjectItem.project_id == project_id,
        visible_items_filter(user, include_rejected=True),
        active_items_filter(),
    )
    if body.item_ids:
        query = query.filter(ProjectItem.id.in_(body.item_ids))
    else:
        query = query.filter(ProjectItem.source_id == body.source_id, ProjectItem.review_status == "pending")
    items = query.all()
    for item in items:
        _mark(item, user, body.status)
    db.commit()
    return {"updated": len(items), "status": body.status}


@router.post("/projects/{project_id}/items/{item_id}/review")
async def review_item(project_id: str, item_id: str, body: ReviewBody, request: Request, db: Session = Depends(get_db)):
    """Set an item's review status (approve / reject / back to pending)."""
    user = _get_user(request)
    require_project_access(db, user, project_id, REVIEW)
    item = _load_item(db, user, project_id, item_id)
    _mark(item, user, body.status)
    db.commit()
    db.refresh(item)
    return _item_to_response(item, show_original=True)


@router.patch("/projects/{project_id}/items/{item_id}/review")
async def edit_item(project_id: str, item_id: str, body: ItemEditBody, request: Request, db: Session = Depends(get_db)):
    """Edit title / statement / why / owner / due date. The AI's values are kept in ``original``;
    an edited item is approved by the reviewer who edited it."""
    user = _get_user(request)
    require_project_access(db, user, project_id, REVIEW)
    item = _load_item(db, user, project_id, item_id)
    edits = body.model_dump(exclude_unset=True)
    if not edits:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Nothing to edit")
    apply_edits(item, edits)
    _mark(item, user, APPROVED)
    db.commit()
    db.refresh(item)
    return _item_to_response(item, show_original=True)


@router.post("/projects/{project_id}/items/{item_id}/restore-original")
async def restore_item(project_id: str, item_id: str, request: Request, db: Session = Depends(get_db)):
    """Put the AI's original values back (review status is unchanged)."""
    user = _get_user(request)
    require_project_access(db, user, project_id, REVIEW)
    item = _load_item(db, user, project_id, item_id)
    if not restore_original(item):
        raise HTTPException(status.HTTP_409_CONFLICT, detail="Item was not edited")
    db.commit()
    db.refresh(item)
    return _item_to_response(item, show_original=True)
