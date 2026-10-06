"""Project endpoints."""

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
from uuid import UUID

from app.database.session import get_db
from app.services.access import ADMIN, admin_organization, is_platform_admin, require_project_access
from app.database.models import Project, ProjectMember
from app.services.organizations import active_organization_id
from app.services.project_sharing import add_owner_row
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


def _require_drive_folder_permission(db: Session, user, new_value, current_value=None) -> None:
    """Story 12.2 security review: only platform admins may set or change ``drive_folder_id``.

    The Drive monitor and curation upload use the platform's (souBIM) Drive service account, so a
    folder id set by another organization would ingest souBIM's files into that organization's
    project (or write its content into souBIM's folder). Re-sending the current value is allowed.
    """
    if (new_value or None) == (current_value or None):
        return
    if not is_platform_admin(db, user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only platform admins can configure the Drive folder",
        )


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
        active_organization_id=active_organization_id(request),
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
        403: If user is not an admin of the owning organization
        404: If project not found
    """
    user = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    # Story 12.2: organization admins of the owning organization only
    project = require_project_access(db, user, project_id, ADMIN)

    # Apply partial updates (resolve title → name)
    update_data = payload.model_dump(exclude_unset=True)
    if 'drive_folder_id' in update_data:
        _require_drive_folder_permission(db, user, update_data['drive_folder_id'], project.drive_folder_id)
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

    Story 6.4 / 12.2: organization admins only.

    Returns:
        Created project data with id

    Raises:
        401: If not authenticated
        403: If user is not an owner/admin of any organization
    """
    user = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    # Story 12.2: the project is owned by an organization the creator administers
    owner_org = admin_organization(db, user)
    if owner_org is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only organization admins can create projects",
        )

    _require_drive_folder_permission(db, user, payload.drive_folder_id)

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
        owner_organization_id=owner_org.id,
    )
    db.add(project)
    db.flush()
    add_owner_row(db, project, invited_by=user.id)  # Story 12.3

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

    Story 6.4 / 12.2: organization admins only.

    Returns:
        Confirmation with archived_at timestamp

    Raises:
        401: If not authenticated
        403: If user is not an admin of the owning organization
        404: If project not found
    """
    user = getattr(request.state, "user", None)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

    project = require_project_access(db, user, project_id, ADMIN)  # Story 12.2

    project.archived_at = datetime.utcnow()
    db.commit()

    return {
        "id": str(project.id),
        "archived_at": project.archived_at.isoformat(),
    }
