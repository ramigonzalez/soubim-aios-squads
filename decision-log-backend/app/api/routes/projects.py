"""Project endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from sqlalchemy.orm import Session
from typing import Optional
from uuid import UUID

from app.database.session import get_db
from app.services.project_service import (
    get_projects,
    get_project,
    ProjectNotFoundError,
    PermissionDeniedError,
)

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
