"""Project Participants CRUD endpoints (Story 6.1)."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api.models.project import ParticipantCreate, ParticipantUpdate
from app.database.models import Project, ProjectMember, ProjectParticipant
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


def _participant_to_response(p: ProjectParticipant) -> dict:
    return {
        "id": str(p.id),
        "name": p.name,
        "email": p.email,
        "discipline": p.discipline,
        "role": p.role,
    }


@router.get("/projects/{project_id}/participants")
async def list_participants(
    project_id: str,
    request: Request,
    db: Session = Depends(get_db),
):
    """List project participants."""
    user = _get_user(request)
    _check_project_access(db, project_id, user)

    participants = (
        db.query(ProjectParticipant)
        .filter(ProjectParticipant.project_id == project_id)
        .order_by(ProjectParticipant.name)
        .all()
    )
    return {"participants": [_participant_to_response(p) for p in participants]}


@router.post("/projects/{project_id}/participants", status_code=status.HTTP_201_CREATED)
async def add_participant(
    project_id: str,
    body: ParticipantCreate,
    request: Request,
    db: Session = Depends(get_db),
):
    """Add a participant to a project."""
    user = _get_user(request)
    _check_project_access(db, project_id, user)

    # Check unique email per project
    if body.email:
        existing = (
            db.query(ProjectParticipant)
            .filter(
                ProjectParticipant.project_id == project_id,
                ProjectParticipant.email == body.email,
            )
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Participant with email '{body.email}' already exists in this project",
            )
    else:
        # Check unique name per project when no email
        existing = (
            db.query(ProjectParticipant)
            .filter(
                ProjectParticipant.project_id == project_id,
                ProjectParticipant.name == body.name,
                ProjectParticipant.email.is_(None),
            )
            .first()
        )
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Participant '{body.name}' already exists in this project",
            )

    participant = ProjectParticipant(
        id=uuid.uuid4(),
        project_id=project_id,
        name=body.name,
        email=body.email,
        discipline=body.discipline.value,
        role=body.role,
    )
    db.add(participant)
    db.commit()
    db.refresh(participant)

    return _participant_to_response(participant)


@router.patch("/projects/{project_id}/participants/{participant_id}")
async def update_participant(
    project_id: str,
    participant_id: str,
    body: ParticipantUpdate,
    request: Request,
    db: Session = Depends(get_db),
):
    """Update a project participant."""
    user = _get_user(request)
    _check_project_access(db, project_id, user)

    participant = (
        db.query(ProjectParticipant)
        .filter(
            ProjectParticipant.id == participant_id,
            ProjectParticipant.project_id == project_id,
        )
        .first()
    )
    if not participant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Participant not found")

    if body.name is not None:
        participant.name = body.name
    if body.email is not None:
        participant.email = body.email
    if body.discipline is not None:
        participant.discipline = body.discipline.value
    if body.role is not None:
        participant.role = body.role

    db.commit()
    db.refresh(participant)

    return _participant_to_response(participant)


@router.delete("/projects/{project_id}/participants/{participant_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_participant(
    project_id: str,
    participant_id: str,
    request: Request,
    db: Session = Depends(get_db),
):
    """Remove a participant from a project."""
    user = _get_user(request)
    _check_project_access(db, project_id, user)

    participant = (
        db.query(ProjectParticipant)
        .filter(
            ProjectParticipant.id == participant_id,
            ProjectParticipant.project_id == project_id,
        )
        .first()
    )
    if not participant:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Participant not found")

    db.delete(participant)
    db.commit()
