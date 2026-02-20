"""Project service for querying and filtering projects."""

from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import datetime, timedelta
from typing import Tuple, List, Dict
from uuid import UUID

from app.database.models import Project, ProjectMember, ProjectItem, User

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

    query = db.query(Project)

    # Filter by archive status
    if not archived:
        query = query.filter(Project.archived_at.is_(None))

    # Filter by user role
    if user.role == "director":
        # Director sees all projects
        pass
    else:
        # Architect/client see only assigned projects
        query = query.join(
            ProjectMember,
            ProjectMember.project_id == Project.id,
        ).filter(ProjectMember.user_id == user_id)

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
            .filter(Decision.project_id == project.id)
            .scalar()
        )
        member_count = (
            db.query(func.count(ProjectMember.user_id))
            .filter(ProjectMember.project_id == project.id)
            .scalar()
        )
        latest_decision = (
            db.query(func.max(Decision.created_at))
            .filter(Decision.project_id == project.id)
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

    # Check authorization
    user = db.query(User).filter(User.id == user_id).one()
    if user.role != "director":
        # Check if user is member
        is_member = (
            db.query(ProjectMember)
            .filter(
                ProjectMember.project_id == project_id,
                ProjectMember.user_id == user_id,
            )
            .first()
        )
        if not is_member:
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
    decisions = db.query(Decision).filter(Decision.project_id == project_id).all()

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
