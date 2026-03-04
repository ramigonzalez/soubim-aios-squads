"""Project endpoints."""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
from uuid import UUID

from app.database.session import get_db
from app.database.models import Project, ProjectMember
from app.services.project_service import (
    get_projects,
    get_project,
    ProjectNotFoundError,
    PermissionDeniedError,
)


class ProjectCreate(BaseModel):
    """Pydantic model for POST /api/projects."""
    name: Optional[str] = None
    title: Optional[str] = None  # Frontend sends 'title', alias to 'name'
    description: Optional[str] = None
    project_type: Optional[str] = None
    drive_folder_id: Optional[str] = None  # Story 10.3

    @property
    def resolved_name(self) -> str:
        """Resolve name from either 'name' or 'title' field."""
        return self.name or self.title or ""


class ProjectUpdate(BaseModel):
    """Pydantic model for PATCH /api/projects/{id}."""
    name: Optional[str] = None
    title: Optional[str] = None  # Frontend sends 'title', alias to 'name'
    description: Optional[str] = None
    project_type: Optional[str] = None
    drive_folder_id: Optional[str] = None  # Story 10.3

router = APIRouter()


@router.get("/")
async def list_projects(
    request: Request,
    db: Session = Depends(get_db),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    archived: bool = Query(False),
):
    """
    List all projects accessible to current user.

    Query Parameters:
    - limit: Number of results per page (default 50, max 100)
    - offset: Pagination offset (default 0)
    - archived: Include archived projects (default false)

    Returns:
        List of projects with pagination metadata
    """
    # Get current user from middleware
    user = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    # Get projects
    projects, total = get_projects(
        db,
        str(user.id),
        limit=limit,
        offset=offset,
        archived=archived,
    )

    return {
        "projects": projects,
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get("/{project_id}")
async def get_project_detail(
    project_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Get detailed information about a specific project.

    Includes:
    - Project metadata
    - Team members
    - Statistics (decisions by discipline, meeting type, etc.)

    Returns:
        Project details with stats

    Raises:
        401: If not authenticated
        403: If user doesn't have access to project
        404: If project not found
    """
    # Get current user from middleware
    user = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    try:
        # Get project details
        project = get_project(db, str(project_id), str(user.id))
        return project

    except ProjectNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project not found",
        )
    except PermissionDeniedError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have access to this project",
        )


@router.patch("/{project_id}")
async def update_project(
    project_id: UUID,
    payload: ProjectUpdate,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Update project fields (partial update).

    Story 10.3: Accepts `drive_folder_id` to configure Drive monitoring.

    Returns:
        Updated project data

    Raises:
        401: If not authenticated
        403: If user is not a director
        404: If project not found
    """
    user = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    # Only directors can update project settings
    if user.role != "director":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only directors can update project settings",
        )

    project = db.query(Project).filter(Project.id == str(project_id)).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    # Apply partial updates (resolve title → name)
    update_data = payload.model_dump(exclude_unset=True)
    if 'title' in update_data:
        update_data['name'] = update_data.pop('title')
    for field, value in update_data.items():
        setattr(project, field, value)

    db.commit()
    db.refresh(project)

    return {
        "id": str(project.id),
        "name": project.name,
        "description": project.description,
        "project_type": project.project_type,
        "drive_folder_id": project.drive_folder_id,
        "created_at": project.created_at.isoformat(),
    }


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_project(
    payload: ProjectCreate,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Create a new project.

    Story 6.4: Director-only endpoint.

    Returns:
        Created project data with id

    Raises:
        401: If not authenticated
        403: If user is not a director
    """
    user = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    if user.role != "director":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only directors can create projects",
        )

    project_name = payload.resolved_name
    if not project_name.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Project name is required",
        )

    project = Project(
        name=project_name,
        description=payload.description,
        project_type=payload.project_type,
        drive_folder_id=payload.drive_folder_id,
    )
    db.add(project)
    db.flush()

    # Add creator as project member
    member = ProjectMember(
        project_id=project.id,
        user_id=user.id,
        role="director",
    )
    db.add(member)
    db.commit()
    db.refresh(project)

    return {
        "id": str(project.id),
        "name": project.name,
        "description": project.description,
        "project_type": project.project_type,
        "created_at": project.created_at.isoformat(),
    }


@router.delete("/{project_id}", status_code=status.HTTP_200_OK)
async def archive_project(
    project_id: UUID,
    request: Request,
    db: Session = Depends(get_db),
):
    """
    Soft-delete (archive) a project by setting archived_at.

    Story 6.4: Director-only endpoint.

    Returns:
        Confirmation with archived_at timestamp

    Raises:
        401: If not authenticated
        403: If user is not a director
        404: If project not found
    """
    user = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    if user.role != "director":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only directors can archive projects",
        )

    project = db.query(Project).filter(Project.id == str(project_id)).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    project.archived_at = datetime.utcnow()
    db.commit()

    return {
        "id": str(project.id),
        "archived_at": project.archived_at.isoformat(),
    }
