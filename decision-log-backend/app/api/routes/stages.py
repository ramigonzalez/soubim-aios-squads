"""Stage Schedule endpoints (Story 6.1)."""

import uuid
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api.models.project import StageCreate, StageResponse, StageTemplateResponse, StageUpdate
from app.database.models import Project, ProjectMember, ProjectStage, StageTemplate
from app.database.session import get_db

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


def validate_stage_schedule(stages: List[StageCreate]):
    """Validate no overlaps and sequential ordering."""
    sorted_stages = sorted(stages, key=lambda s: s.stage_from)
    for i, stage in enumerate(sorted_stages):
        if stage.stage_from >= stage.stage_to:
            raise HTTPException(
                status_code=400,
                detail=f"Stage '{stage.stage_name}': start must be before end",
            )
        if i > 0 and stage.stage_from < sorted_stages[i - 1].stage_to:
            raise HTTPException(
                status_code=400,
                detail=f"Stage '{stage.stage_name}' overlaps with '{sorted_stages[i - 1].stage_name}'",
            )


def _stage_to_response(stage: ProjectStage, project: Project) -> dict:
    return {
        "id": str(stage.id),
        "stage_name": stage.stage_name,
        "stage_from": stage.stage_from.isoformat() if stage.stage_from else None,
        "stage_to": stage.stage_to.isoformat() if stage.stage_to else None,
        "sort_order": stage.sort_order,
        "is_current": str(project.actual_stage_id) == str(stage.id) if project.actual_stage_id else False,
    }


@router.get("/projects/{project_id}/stages")
async def list_stages(
    project_id: str,
    request: Request,
    db: Session = Depends(get_db),
):
    """List stages ordered by sort_order."""
    user = _get_user(request)
    project = _check_project_access(db, project_id, user)

    stages = (
        db.query(ProjectStage)
        .filter(ProjectStage.project_id == project_id)
        .order_by(ProjectStage.sort_order)
        .all()
    )
    return {"stages": [_stage_to_response(s, project) for s in stages]}


@router.post("/projects/{project_id}/stages", status_code=status.HTTP_201_CREATED)
async def set_stages(
    project_id: str,
    stages: List[StageCreate],
    request: Request,
    db: Session = Depends(get_db),
):
    """Set stage schedule (replaces all existing stages)."""
    user = _get_user(request)
    project = _check_project_access(db, project_id, user)

    # Validate schedule
    validate_stage_schedule(stages)

    # Delete existing stages
    db.query(ProjectStage).filter(ProjectStage.project_id == project_id).delete()

    # Reset actual_stage_id
    project.actual_stage_id = None

    # Create new stages
    created = []
    for i, stage_data in enumerate(stages):
        stage = ProjectStage(
            id=uuid.uuid4(),
            project_id=project_id,
            stage_name=stage_data.stage_name,
            stage_from=datetime.combine(stage_data.stage_from, datetime.min.time()),
            stage_to=datetime.combine(stage_data.stage_to, datetime.min.time()),
            sort_order=i,
        )
        db.add(stage)
        created.append(stage)

    db.commit()
    for s in created:
        db.refresh(s)

    return {"stages": [_stage_to_response(s, project) for s in created]}


@router.patch("/projects/{project_id}/stages/{stage_id}")
async def update_stage(
    project_id: str,
    stage_id: str,
    body: StageUpdate,
    request: Request,
    db: Session = Depends(get_db),
):
    """Update a single stage."""
    user = _get_user(request)
    project = _check_project_access(db, project_id, user)

    stage = (
        db.query(ProjectStage)
        .filter(ProjectStage.id == stage_id, ProjectStage.project_id == project_id)
        .first()
    )
    if not stage:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stage not found")

    if body.stage_name is not None:
        stage.stage_name = body.stage_name
    if body.stage_from is not None:
        stage.stage_from = datetime.combine(body.stage_from, datetime.min.time())
    if body.stage_to is not None:
        stage.stage_to = datetime.combine(body.stage_to, datetime.min.time())

    # Re-validate date constraints
    if stage.stage_from >= stage.stage_to:
        raise HTTPException(status_code=400, detail="stage_from must be before stage_to")

    db.commit()
    db.refresh(stage)

    return _stage_to_response(stage, project)


@router.get("/stage-templates")
async def list_stage_templates(
    request: Request,
    db: Session = Depends(get_db),
):
    """List predefined stage templates."""
    _get_user(request)

    templates = db.query(StageTemplate).all()
    return {
        "templates": [
            {
                "id": str(t.id),
                "project_type": t.project_type,
                "template_name": t.template_name,
                "stages": t.stages,
            }
            for t in templates
        ]
    }
