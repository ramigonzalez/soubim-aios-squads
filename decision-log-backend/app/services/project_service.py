"""Project service for querying and filtering projects."""

from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database.models import Project, ProjectItem, ProjectMember, User
from app.services.extraction_runs import active_items_filter
from app.services.access import NONE, accessible_projects_filter, project_access_level, visible_items_filter
from app.services.organizations import active_organization_projects_filter

# Backward compatibility alias
Decision = ProjectItem


class ProjectNotFoundError(Exception):
    """Raised when project is not found."""
    pass


class PermissionDeniedError(Exception):
    """Raised when user doesn't have access to project."""
    pass


def get_projects(
    db: Session,
    user_id: str,
    limit: int = 50,
    offset: int = 0,
    archived: bool = False,
    active_organization_id: Optional[str] = None,
) -> Tuple[List[Dict], int]:
    """
    Get all projects accessible to user with pagination.

    Args:
        db: Database session
        user_id: Current user ID
        limit: Results per page (default 50)
        offset: Pagination offset (default 0)
        archived: Include archived projects (default False)

    Returns:
        Tuple of (projects_list, total_count)
    """
    user = db.query(User).filter(User.id == user_id).one()

    # Story 12.2: only projects of the user's organizations (see app/services/access.py)
    query = db.query(Project).filter(accessible_projects_filter(user))
    # Story 12.5: with an active organization, only its projects and those shared with it
    if active_organization_id:
        query = query.filter(active_organization_projects_filter(active_organization_id))

    # Filter by archive status
    if not archived:
        query = query.filter(Project.archived_at.is_(None))

    # Get total count
    total_count = query.count()

    # Apply sorting and pagination
    projects = query.order_by(Project.created_at.desc()).limit(limit).offset(offset).all()

    # Format response
    result = []
    for project in projects:
        # Count decisions and members
        decision_count = (
            db.query(func.count(Decision.id))
            .filter(Decision.project_id == project.id, visible_items_filter(user), active_items_filter())  # 12.4, 13.7
            .scalar()
        )
        member_count = (
            db.query(func.count(ProjectMember.user_id))
            .filter(ProjectMember.project_id == project.id)
            .scalar()
        )
        latest_decision = (
            db.query(func.max(Decision.created_at))
            .filter(Decision.project_id == project.id, visible_items_filter(user), active_items_filter())
            .scalar()
        )

        result.append(
            {
                "id": str(project.id),
                "name": project.name,
                "description": project.description,
                "created_at": project.created_at.isoformat(),
                "member_count": member_count or 0,
                "decision_count": decision_count or 0,
                "latest_decision": latest_decision.isoformat() if latest_decision else None,
            }
        )

    return result, total_count


def get_project(db: Session, project_id: str, user_id: str) -> Dict:
    """
    Get detailed project information with statistics.

    Args:
        db: Database session
        project_id: Project UUID
        user_id: Current user ID

    Returns:
        Project details with stats

    Raises:
        ProjectNotFoundError: If project not found
        PermissionDeniedError: If user doesn't have access
    """
    # Get project
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise ProjectNotFoundError(f"Project {project_id} not found")

    # Check authorization (Story 12.2: organization-scoped)
    user = db.query(User).filter(User.id == user_id).one()
    if project_access_level(db, user, project) == NONE:
        raise PermissionDeniedError(
            f"User {user_id} doesn't have access to project {project_id}"
        )

    # Get members
    members = (
        db.query(ProjectMember, User)
        .join(User, ProjectMember.user_id == User.id)
        .filter(ProjectMember.project_id == project_id)
        .all()
    )

    member_list = [
        {
            "user_id": str(pm.ProjectMember.user_id),
            "name": pm.User.name,
            "email": pm.User.email,
            "role": pm.ProjectMember.role,
        }
        for pm in members
    ]

    # Get statistics
    decisions = (
        db.query(Decision)
        .filter(Decision.project_id == project_id, visible_items_filter(user), active_items_filter())
        .all()
    )

    total_decisions = len(decisions)

    # Decisions last week
    one_week_ago = datetime.utcnow() - timedelta(days=7)
    decisions_last_week = len(
        [d for d in decisions if d.created_at >= one_week_ago]
    )

    # By discipline
    decisions_by_discipline = {}
    for decision in decisions:
        discipline = decision.discipline
        decisions_by_discipline[discipline] = decisions_by_discipline.get(discipline, 0) + 1

    # By meeting type (from transcripts)
    from app.database.models import Transcript
    transcripts = db.query(Transcript).filter(
        Transcript.project_id == project_id
    ).all()

    decisions_by_meeting_type = {}
    for decision in decisions:
        if decision.transcript_id:
            transcript = next(
                (t for t in transcripts if t.id == decision.transcript_id),
                None,
            )
            if transcript and transcript.meeting_type:
                meeting_type = transcript.meeting_type
                decisions_by_meeting_type[meeting_type] = (
                    decisions_by_meeting_type.get(meeting_type, 0) + 1
                )

    return {
        "id": str(project.id),
        "name": project.name,
        "description": project.description,
        "created_at": project.created_at.isoformat(),
        "archived_at": project.archived_at.isoformat() if project.archived_at else None,
        "members": member_list,
        "stats": {
            "total_decisions": total_decisions,
            "decisions_last_week": decisions_last_week,
            "decisions_by_discipline": decisions_by_discipline,
            "decisions_by_meeting_type": decisions_by_meeting_type,
        },
    }
