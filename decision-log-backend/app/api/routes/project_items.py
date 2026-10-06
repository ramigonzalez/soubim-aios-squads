"""Project Items CRUD endpoints (V2 taxonomy)."""

import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.api.models.project_item import (
    ProjectItemCreate,
    ProjectItemListResponse,
    ProjectItemResponse,
    ProjectItemUpdate,
    SourceInfo,
)
from app.database.models import Project, ProjectItem, Source, User
from app.database.session import get_db
from app.services.access import (
    ADMIN,
    READ,
    WRITE,
    acting_organization_id,
    has_access,
    item_visible,
    project_access_level,
    require_project_access,
    visible_items_filter,
)

router = APIRouter()


def _get_user(request: Request):
    """Extract authenticated user from request state."""
    user = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
    return user


def _check_project_access(db: Session, project_id: str, user, required: str = READ) -> Project:
    """Verify the project exists and the user's organization access (Story 12.2)."""
    return require_project_access(db, user, project_id, required)


def _item_to_response(item: ProjectItem) -> dict:
    """Convert a ProjectItem ORM object to response dict."""
    source_info = None
    if item.source:
        source_info = SourceInfo(
            id=str(item.source.id),
            title=item.source.title,
            type=item.source.source_type,
            occurred_at=item.source.occurred_at.isoformat() if item.source.occurred_at else None,
            summary=item.source.ai_summary,
            visibility=item.source.visibility,
        ).model_dump()

    return {
        "id": str(item.id),
        "project_id": str(item.project_id),
        "statement": item.statement or item.decision_statement,
        "title": item.title,
        "who": item.who,
        "timestamp": item.timestamp,
        "item_type": item.item_type,
        "source_type": item.source_type,
        "affected_disciplines": item.affected_disciplines or [],
        "is_milestone": item.is_milestone,
        "is_done": item.is_done,
        "owner": item.owner,
        "due_date": item.due_date.isoformat() if item.due_date else None,
        "why": item.why,
        "causation": item.causation,
        "impacts": item.impacts,
        "consensus": item.consensus,
        "confidence": item.confidence,
        "source_excerpt": item.source_excerpt,
        "source": source_info,
        "created_at": item.created_at.isoformat() if item.created_at else None,
        "updated_at": item.updated_at.isoformat() if item.updated_at else None,
    }


def _compute_facets(db: Session, project_id: str, user) -> dict:
    """Compute facet counts for a project's items the user can see (Story 12.4)."""
    items = db.query(ProjectItem).filter(ProjectItem.project_id == project_id, visible_items_filter(user)).all()

    item_types: dict = {}
    source_types: dict = {}
    disciplines: dict = {}

    for item in items:
        # Count by item_type
        it = item.item_type or "decision"
        item_types[it] = item_types.get(it, 0) + 1

        # Count by source_type
        st = item.source_type or "meeting"
        source_types[st] = source_types.get(st, 0) + 1

        # Count by discipline (from affected_disciplines array)
        for d in (item.affected_disciplines or []):
            disciplines[d] = disciplines.get(d, 0) + 1

    return {
        "item_types": item_types,
        "source_types": source_types,
        "disciplines": disciplines,
    }


@router.get("/projects/{project_id}/items")
async def list_project_items(
    project_id: str,
    request: Request,
    db: Session = Depends(get_db),
    item_type: Optional[str] = None,
    source_type: Optional[str] = None,
    discipline: Optional[str] = None,
    is_milestone: Optional[bool] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: str = Query("created_at", pattern=r"^(created_at|confidence|item_type)$"),
    sort_order: str = Query("desc", pattern=r"^(asc|desc)$"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """List project items with full filter support."""
    user = _get_user(request)
    _check_project_access(db, project_id, user)

    # Story 12.4: only items of meetings visible to the user's organization
    query = db.query(ProjectItem).filter(ProjectItem.project_id == project_id, visible_items_filter(user))

    # Multi-value filter: ?item_type=decision,topic
    if item_type:
        types = [t.strip() for t in item_type.split(",")]
        query = query.filter(ProjectItem.item_type.in_(types))

    # Multi-value filter: ?source_type=meeting,email
    if source_type:
        stypes = [s.strip() for s in source_type.split(",")]
        query = query.filter(ProjectItem.source_type.in_(stypes))

    # JSONB discipline filter: ?discipline=structural,architecture
    if discipline:
        disciplines_list = [d.strip() for d in discipline.split(",")]
        # Use OR logic — item matches if ANY of the requested disciplines is present
        discipline_filters = []
        for d in disciplines_list:
            discipline_filters.append(
                ProjectItem.affected_disciplines.contains([d])
            )
        if discipline_filters:
            query = query.filter(or_(*discipline_filters))

    # Milestone filter
    if is_milestone is not None:
        query = query.filter(ProjectItem.is_milestone == is_milestone)

    # Date range filter
    if date_from:
        query = query.filter(ProjectItem.created_at >= date_from)
    if date_to:
        query = query.filter(ProjectItem.created_at <= date_to)

    # Text search across multiple fields
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                ProjectItem.decision_statement.ilike(search_term),
                ProjectItem.who.ilike(search_term),
                ProjectItem.why.ilike(search_term),
            )
        )

    # Get total count before pagination
    total = query.count()

    # Apply sorting
    sort_col = {
        "created_at": ProjectItem.created_at,
        "confidence": ProjectItem.confidence,
        "item_type": ProjectItem.item_type,
    }.get(sort_by, ProjectItem.created_at)

    if sort_order == "asc":
        query = query.order_by(sort_col.asc())
    else:
        query = query.order_by(sort_col.desc())

    # Apply pagination
    items = query.limit(limit).offset(offset).all()

    # Compute facets
    facets = _compute_facets(db, project_id, user)

    return {
        "items": [_item_to_response(item) for item in items],
        "total": total,
        "limit": limit,
        "offset": offset,
        "facets": facets,
    }


@router.get("/projects/{project_id}/items/{item_id}")
async def get_project_item(
    project_id: str,
    item_id: str,
    request: Request,
    db: Session = Depends(get_db),
):
    """Get single project item detail with source info."""
    user = _get_user(request)
    _check_project_access(db, project_id, user)

    item = (
        db.query(ProjectItem)
        .filter(ProjectItem.id == item_id, ProjectItem.project_id == project_id)
        .first()
    )
    if not item_visible(db, user, item):  # Story 12.4: internal items of other organizations → 404
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project item {item_id} not found",
        )

    return _item_to_response(item)


@router.post("/projects/{project_id}/items", status_code=status.HTTP_201_CREATED)
async def create_project_item(
    project_id: str,
    body: ProjectItemCreate,
    request: Request,
    db: Session = Depends(get_db),
):
    """Create a manual input project item."""
    user = _get_user(request)
    project = _check_project_access(db, project_id, user, WRITE)

    item = ProjectItem(
        id=uuid.uuid4(),
        project_id=project_id,
        # Story 12.4: a manual item is owned by the creator's organization and internal to it
        owner_organization_id=acting_organization_id(db, user, project),
        item_type=body.item_type.value,
        source_type="manual_input",
        statement=body.statement,
        decision_statement=body.statement,
        who=body.who,
        timestamp="",
        discipline=body.affected_disciplines[0].value if body.affected_disciplines else "general",
        affected_disciplines=[d.value for d in body.affected_disciplines],
        why=body.why or "",
        causation=body.causation,
        owner=body.owner,
        due_date=body.due_date,
        is_done=body.is_done,
        impacts=body.impacts.model_dump() if body.impacts else None,
        consensus={k: v.model_dump() for k, v in body.consensus.items()} if body.consensus else {},
        is_milestone=False,
    )

    db.add(item)
    db.commit()
    db.refresh(item)

    return _item_to_response(item)


@router.patch("/projects/{project_id}/items/{item_id}")
async def update_project_item(
    project_id: str,
    item_id: str,
    body: ProjectItemUpdate,
    request: Request,
    db: Session = Depends(get_db),
):
    """Update a project item (milestone toggle, is_done, statement)."""
    user = _get_user(request)
    project = _check_project_access(db, project_id, user, WRITE)

    item = (
        db.query(ProjectItem)
        .filter(ProjectItem.id == item_id, ProjectItem.project_id == project_id)
        .first()
    )
    if not item_visible(db, user, item):  # Story 12.4
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project item {item_id} not found",
        )

    # is_milestone toggle requires organization admin on the project (Story 12.2)
    if body.is_milestone is not None:
        if not has_access(project_access_level(db, user, project), ADMIN):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only organization admins can toggle milestone status",
            )
        item.is_milestone = body.is_milestone

    if body.is_done is not None:
        item.is_done = body.is_done

    if body.statement is not None:
        item.statement = body.statement
        item.decision_statement = body.statement

    db.commit()
    db.refresh(item)

    return _item_to_response(item)


@router.get("/projects/{project_id}/milestones")
async def list_milestones(
    project_id: str,
    request: Request,
    db: Session = Depends(get_db),
    item_type: Optional[str] = None,
    source_type: Optional[str] = None,
    discipline: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: str = Query("created_at", pattern=r"^(created_at|confidence|item_type)$"),
    sort_order: str = Query("desc", pattern=r"^(asc|desc)$"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
):
    """List milestone-only project items. Equivalent to /items?is_milestone=true."""
    # Delegate to list_project_items with is_milestone=True
    return await list_project_items(
        project_id=project_id,
        request=request,
        db=db,
        item_type=item_type,
        source_type=source_type,
        discipline=discipline,
        is_milestone=True,
        date_from=date_from,
        date_to=date_to,
        search=search,
        sort_by=sort_by,
        sort_order=sort_order,
        limit=limit,
        offset=offset,
    )
