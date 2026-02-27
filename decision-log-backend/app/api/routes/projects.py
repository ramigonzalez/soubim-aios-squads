"""Project endpoints (extended for Story 6.1)."""

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func
from sqlalchemy.orm import Session
from typing import Optional

from app.api.models.project import ProjectCreate, ProjectUpdate
from app.database.models import (
    Project,
    ProjectItem,
    ProjectMember,
    ProjectParticipant,
    ProjectStage,
    User,
)
from app.database.session import get_db
from app.services.project_service import (
    PermissionDeniedError,
    ProjectNotFoundError,
)

router = APIRouter()


def _get_user(request: Request):
    user = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    return user


def _check_project_access(db: Session, project_id: str, user) -> Project:
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found")
    if user.role != "director":
        is_member = (
            db.query(ProjectMember)
            .filter(ProjectMember.project_id == project_id, ProjectMember.user_id == str(user.id))
            .first()
        )
        if not is_member:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    return project


def _get_current_stage(db: Session, project: Project) -> Optional[dict]:
    """Get current stage info for a project."""
    if not project.actual_stage_id:
        return None
    stage = db.query(ProjectStage).filter(ProjectStage.id == project.actual_stage_id).first()
    if not stage:
        return None
    return {
        "name": stage.stage_name,
        "stage_from": stage.stage_from.isoformat() if stage.stage_from else None,
        "stage_to": stage.stage_to.isoformat() if stage.stage_to else None,
    }


@router.get("/")
async def list_projects(
    request: Request,
    db: Session = Depends(get_db),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    archived: bool = Query(False),
):
    """List all projects accessible to current user (V2 extended response)."""
    user = _get_user(request)

    query = db.query(Project)

    if not archived:
        query = query.filter(Project.archived_at.is_(None))

    if user.role != "director":
        query = query.join(ProjectMember, ProjectMember.project_id == Project.id).filter(
            ProjectMember.user_id == str(user.id)
        )

    total = query.count()
    projects = query.order_by(Project.created_at.desc()).limit(limit).offset(offset).all()

    result = []
    for project in projects:
        item_count = (
            db.query(func.count(ProjectItem.id))
            .filter(ProjectItem.project_id == project.id)
            .scalar()
            or 0
        )
        member_count = (
            db.query(func.count(ProjectMember.user_id))
            .filter(ProjectMember.project_id == project.id)
            .scalar()
            or 0
        )
        participant_count = (
            db.query(func.count(ProjectParticipant.id))
            .filter(ProjectParticipant.project_id == project.id)
            .scalar()
            or 0
        )
        latest_decision = (
            db.query(func.max(ProjectItem.created_at))
            .filter(ProjectItem.project_id == project.id)
            .scalar()
        )

        current_stage = _get_current_stage(db, project)

        result.append(
            {
                "id": str(project.id),
                "name": project.name,
                "description": project.description,
                "project_type": project.project_type,
                "current_stage": current_stage,
                "participant_count": participant_count,
                "item_count": item_count,
                "member_count": member_count,
                "decision_count": item_count,  # backward compat
                "latest_decision": latest_decision.isoformat() if latest_decision else None,
                "created_at": project.created_at.isoformat(),
                "archived_at": project.archived_at.isoformat() if project.archived_at else None,
            }
        )

    return {"projects": result, "total": total, "limit": limit, "offset": offset}


@router.get("/{project_id}")
async def get_project_detail(
    project_id: str,
    request: Request,
    db: Session = Depends(get_db),
):
    """Get detailed project information (V2 extended with stages + participants)."""
    user = _get_user(request)
    project = _check_project_access(db, project_id, user)

    # Get members
    members = (
        db.query(ProjectMember, User)
        .join(User, ProjectMember.user_id == User.id)
        .filter(ProjectMember.project_id == project_id)
        .all()
    )
    member_list = [
        {
            "user_id": str(pm.user_id),
            "name": u.name,
            "email": u.email,
            "role": pm.role,
        }
        for pm, u in members
    ]

    # Get stages
    stages = (
        db.query(ProjectStage)
        .filter(ProjectStage.project_id == project_id)
        .order_by(ProjectStage.sort_order)
        .all()
    )
    stages_list = [
        {
            "id": str(s.id),
            "stage_name": s.stage_name,
            "stage_from": s.stage_from.isoformat() if s.stage_from else None,
            "stage_to": s.stage_to.isoformat() if s.stage_to else None,
            "sort_order": s.sort_order,
            "is_current": str(project.actual_stage_id) == str(s.id) if project.actual_stage_id else False,
        }
        for s in stages
    ]

    # Get participants
    participant_count = (
        db.query(func.count(ProjectParticipant.id))
        .filter(ProjectParticipant.project_id == project_id)
        .scalar()
        or 0
    )

    # Get items stats
    items = db.query(ProjectItem).filter(ProjectItem.project_id == project_id).all()
    total_items = len(items)

    from datetime import timedelta
    one_week_ago = datetime.utcnow() - timedelta(days=7)
    items_last_week = len([i for i in items if i.created_at and i.created_at >= one_week_ago])

    items_by_discipline = {}
    for item in items:
        disc = item.discipline
        items_by_discipline[disc] = items_by_discipline.get(disc, 0) + 1

    current_stage = _get_current_stage(db, project)

    return {
        "id": str(project.id),
        "name": project.name,
        "description": project.description,
        "project_type": project.project_type,
        "current_stage": current_stage,
        "stages": stages_list,
        "participant_count": participant_count,
        "created_at": project.created_at.isoformat(),
        "archived_at": project.archived_at.isoformat() if project.archived_at else None,
        "members": member_list,
        "stats": {
            "total_decisions": total_items,
            "decisions_last_week": items_last_week,
            "decisions_by_discipline": items_by_discipline,
            "decisions_by_meeting_type": {},
        },
    }


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_project(
    body: ProjectCreate,
    request: Request,
    db: Session = Depends(get_db),
):
    """Create a project with optional stages and participants."""
    user = _get_user(request)

    project = Project(
        id=uuid.uuid4(),
        name=body.title,
        description=body.description,
        project_type=body.project_type,
    )
    db.add(project)
    db.flush()  # Get the project ID

    # Add stages if provided
    stage_count = 0
    if body.stages:
        from app.api.routes.stages import validate_stage_schedule
        validate_stage_schedule(body.stages)

        for i, stage_data in enumerate(body.stages):
            stage = ProjectStage(
                id=uuid.uuid4(),
                project_id=project.id,
                stage_name=stage_data.stage_name,
                stage_from=datetime.combine(stage_data.stage_from, datetime.min.time()),
                stage_to=datetime.combine(stage_data.stage_to, datetime.min.time()),
                sort_order=i,
            )
            db.add(stage)
            stage_count += 1

    # Add participants if provided
    participant_count = 0
    if body.participants:
        for p_data in body.participants:
            participant = ProjectParticipant(
                id=uuid.uuid4(),
                project_id=project.id,
                name=p_data.name,
                email=p_data.email,
                discipline=p_data.discipline.value,
                role=p_data.role,
            )
            db.add(participant)
            participant_count += 1

    # Add creator as project member
    member = ProjectMember(
        project_id=project.id,
        user_id=user.id,
        role="owner",
    )
    db.add(member)

    db.commit()
    db.refresh(project)

    return {
        "id": str(project.id),
        "name": project.name,
        "description": project.description,
        "project_type": project.project_type,
        "stage_count": stage_count,
        "participant_count": participant_count,
        "created_at": project.created_at.isoformat(),
    }


@router.patch("/{project_id}")
async def update_project(
    project_id: str,
    body: ProjectUpdate,
    request: Request,
    db: Session = Depends(get_db),
):
    """Update project (title, description, project_type, actual_stage_id)."""
    user = _get_user(request)
    project = _check_project_access(db, project_id, user)

    if body.title is not None:
        project.name = body.title
    if body.description is not None:
        project.description = body.description
    if body.project_type is not None:
        project.project_type = body.project_type
    if body.actual_stage_id is not None:
        # Validate stage belongs to this project
        stage = (
            db.query(ProjectStage)
            .filter(ProjectStage.id == body.actual_stage_id, ProjectStage.project_id == project_id)
            .first()
        )
        if not stage:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Stage not found for this project",
            )
        project.actual_stage_id = body.actual_stage_id

    db.commit()
    db.refresh(project)

    return {
        "id": str(project.id),
        "name": project.name,
        "description": project.description,
        "project_type": project.project_type,
        "created_at": project.created_at.isoformat(),
    }


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def archive_project(
    project_id: str,
    request: Request,
    db: Session = Depends(get_db),
):
    """Archive a project (soft delete)."""
    user = _get_user(request)
    project = _check_project_access(db, project_id, user)

    project.archived_at = datetime.utcnow()
    db.commit()
