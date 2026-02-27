"""Tests for Project Participants API (Story 6.1)."""

import uuid

import pytest
from sqlalchemy.orm import Session

from app.database.models import Project, ProjectParticipant, User


@pytest.fixture
def test_user(db_session: Session):
    user = User(
        id=uuid.uuid4(),
        email="participants-test@example.com",
        password_hash="hashed",
        name="Participants Test User",
        role="director",
    )
    db_session.add(user)
    db_session.commit()
    return user


@pytest.fixture
def test_project(db_session: Session):
    project = Project(
        id=uuid.uuid4(),
        name="Participants Test Project",
        description="Testing participants",
    )
    db_session.add(project)
    db_session.commit()
    return project


@pytest.fixture
def test_participants(db_session: Session, test_project):
    participants = [
        ProjectParticipant(
            id=uuid.uuid4(),
            project_id=test_project.id,
            name="Carlos",
            email="carlos@soubim.com",
            discipline="structural",
            role="Lead Engineer",
        ),
        ProjectParticipant(
            id=uuid.uuid4(),
            project_id=test_project.id,
            name="Gabriela",
            email="gabriela@soubim.com",
            discipline="architecture",
            role="Director",
        ),
        ProjectParticipant(
            id=uuid.uuid4(),
            project_id=test_project.id,
            name="André",
            email="andre@soubim.com",
            discipline="mep",
            role="MEP Coordinator",
        ),
    ]
    for p in participants:
        db_session.add(p)
    db_session.commit()
    return participants


class TestParticipantCRUD:
    """Test participant CRUD operations."""

    def test_list_participants(self, db_session, test_project, test_participants):
        participants = (
            db_session.query(ProjectParticipant)
            .filter(ProjectParticipant.project_id == test_project.id)
            .all()
        )
        assert len(participants) == 3

    def test_add_participant(self, db_session, test_project):
        participant = ProjectParticipant(
            id=uuid.uuid4(),
            project_id=test_project.id,
            name="Roberto",
            email="roberto@soubim.com",
            discipline="civil",
            role="Civil Engineer",
        )
        db_session.add(participant)
        db_session.commit()

        loaded = db_session.query(ProjectParticipant).filter(ProjectParticipant.id == participant.id).first()
        assert loaded is not None
        assert loaded.name == "Roberto"
        assert loaded.discipline == "civil"

    def test_add_participant_without_email(self, db_session, test_project):
        participant = ProjectParticipant(
            id=uuid.uuid4(),
            project_id=test_project.id,
            name="External Consultant",
            discipline="general",
        )
        db_session.add(participant)
        db_session.commit()

        loaded = db_session.query(ProjectParticipant).filter(ProjectParticipant.id == participant.id).first()
        assert loaded is not None
        assert loaded.email is None

    def test_update_participant(self, db_session, test_participants):
        p = test_participants[0]
        p.role = "Senior Engineer"
        db_session.commit()
        db_session.refresh(p)
        assert p.role == "Senior Engineer"

    def test_update_participant_discipline(self, db_session, test_participants):
        p = test_participants[0]
        p.discipline = "civil"
        db_session.commit()
        db_session.refresh(p)
        assert p.discipline == "civil"

    def test_delete_participant(self, db_session, test_project, test_participants):
        p = test_participants[0]
        db_session.delete(p)
        db_session.commit()

        remaining = (
            db_session.query(ProjectParticipant)
            .filter(ProjectParticipant.project_id == test_project.id)
            .count()
        )
        assert remaining == 2

    def test_cascade_delete_with_project(self, db_session, test_project, test_participants):
        project_id = test_project.id
        db_session.delete(test_project)
        db_session.commit()

        remaining = (
            db_session.query(ProjectParticipant)
            .filter(ProjectParticipant.project_id == project_id)
            .count()
        )
        assert remaining == 0


class TestParticipantValidation:
    """Test participant validation logic."""

    def test_discipline_enum_validation(self):
        from app.api.models.project_item import Discipline

        valid_disciplines = [d.value for d in Discipline]
        assert "structural" in valid_disciplines
        assert "architecture" in valid_disciplines
        assert "mep" in valid_disciplines
        assert "invalid" not in valid_disciplines

    def test_unique_email_per_project(self, db_session, test_project, test_participants):
        """Duplicate email should be detectable."""
        existing_emails = [p.email for p in test_participants if p.email]
        duplicate = (
            db_session.query(ProjectParticipant)
            .filter(
                ProjectParticipant.project_id == test_project.id,
                ProjectParticipant.email == "carlos@soubim.com",
            )
            .first()
        )
        assert duplicate is not None

    def test_unique_name_without_email(self, db_session, test_project):
        """When no email, name uniqueness should be checkable."""
        p1 = ProjectParticipant(
            id=uuid.uuid4(),
            project_id=test_project.id,
            name="Anonymous",
            discipline="general",
        )
        db_session.add(p1)
        db_session.commit()

        # Check for duplicate name
        existing = (
            db_session.query(ProjectParticipant)
            .filter(
                ProjectParticipant.project_id == test_project.id,
                ProjectParticipant.name == "Anonymous",
                ProjectParticipant.email.is_(None),
            )
            .first()
        )
        assert existing is not None

    def test_participant_response_format(self, test_participants):
        from app.api.routes.participants import _participant_to_response

        resp = _participant_to_response(test_participants[0])
        assert "id" in resp
        assert "name" in resp
        assert "email" in resp
        assert "discipline" in resp
        assert "role" in resp
        assert resp["name"] == "Carlos"
        assert resp["discipline"] == "structural"


class TestProjectExtended:
    """Test extended project operations from Story 6.1."""

    def test_project_with_type(self, db_session):
        project = Project(
            id=uuid.uuid4(),
            name="Typed Project",
            project_type="architecture_full",
        )
        db_session.add(project)
        db_session.commit()
        db_session.refresh(project)
        assert project.project_type == "architecture_full"

    def test_project_archive(self, db_session):
        from datetime import datetime

        project = Project(
            id=uuid.uuid4(),
            name="Archive Test",
        )
        db_session.add(project)
        db_session.commit()

        project.archived_at = datetime.utcnow()
        db_session.commit()
        db_session.refresh(project)
        assert project.archived_at is not None

    def test_v1_project_without_stages(self, db_session):
        """V1 projects without stages are valid."""
        project = Project(
            id=uuid.uuid4(),
            name="Legacy Project",
        )
        db_session.add(project)
        db_session.commit()
        db_session.refresh(project)
        assert project.actual_stage_id is None
        assert project.project_type is None
