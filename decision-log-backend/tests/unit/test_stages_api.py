"""Tests for Stage Schedule API (Story 6.1)."""

import uuid
from datetime import date, datetime

import pytest
from sqlalchemy.orm import Session

from app.database.models import Project, ProjectStage, StageTemplate, User


@pytest.fixture
def test_user(db_session: Session):
    user = User(
        id=uuid.uuid4(),
        email="stages-test@example.com",
        password_hash="hashed",
        name="Stages Test User",
        role="director",
    )
    db_session.add(user)
    db_session.commit()
    return user


@pytest.fixture
def test_project(db_session: Session):
    project = Project(
        id=uuid.uuid4(),
        name="Stage Test Project",
        description="Testing stage schedule",
        project_type="architecture_full",
    )
    db_session.add(project)
    db_session.commit()
    return project


@pytest.fixture
def test_stages(db_session: Session, test_project):
    stages = []
    stage_defs = [
        ("Briefing", date(2026, 3, 1), date(2026, 3, 31), 0),
        ("Levantamento", date(2026, 4, 1), date(2026, 5, 15), 1),
        ("Estudo Preliminar", date(2026, 5, 16), date(2026, 7, 15), 2),
    ]
    for name, start, end, order in stage_defs:
        stage = ProjectStage(
            id=uuid.uuid4(),
            project_id=test_project.id,
            stage_name=name,
            stage_from=datetime.combine(start, datetime.min.time()),
            stage_to=datetime.combine(end, datetime.min.time()),
            sort_order=order,
        )
        db_session.add(stage)
        stages.append(stage)
    db_session.commit()
    return stages


@pytest.fixture
def test_templates(db_session: Session):
    templates = [
        StageTemplate(
            id=uuid.uuid4(),
            project_type="architecture_full",
            template_name="Architecture Full Project",
            stages=[
                {"stage_name": "Briefing", "default_duration_days": 30},
                {"stage_name": "Levantamento", "default_duration_days": 45},
                {"stage_name": "Estudo Preliminar", "default_duration_days": 60},
                {"stage_name": "Anteprojeto", "default_duration_days": 60},
                {"stage_name": "Projeto Legal", "default_duration_days": 30},
                {"stage_name": "Projeto Executivo", "default_duration_days": 90},
                {"stage_name": "Acompanhamento de Obra", "default_duration_days": 180},
            ],
        ),
        StageTemplate(
            id=uuid.uuid4(),
            project_type="architecture_legal",
            template_name="Architecture Legal Project",
            stages=[
                {"stage_name": "Briefing", "default_duration_days": 15},
                {"stage_name": "Estudo Preliminar", "default_duration_days": 30},
                {"stage_name": "Projeto Legal", "default_duration_days": 45},
                {"stage_name": "Projeto Executivo", "default_duration_days": 60},
            ],
        ),
    ]
    for t in templates:
        db_session.add(t)
    db_session.commit()
    return templates


class TestProjectStageORM:
    """Test ProjectStage ORM operations."""

    def test_create_stages(self, db_session, test_project, test_stages):
        stages = (
            db_session.query(ProjectStage)
            .filter(ProjectStage.project_id == test_project.id)
            .order_by(ProjectStage.sort_order)
            .all()
        )
        assert len(stages) == 3
        assert stages[0].stage_name == "Briefing"
        assert stages[1].stage_name == "Levantamento"
        assert stages[2].stage_name == "Estudo Preliminar"

    def test_stage_sort_order(self, db_session, test_project, test_stages):
        stages = (
            db_session.query(ProjectStage)
            .filter(ProjectStage.project_id == test_project.id)
            .order_by(ProjectStage.sort_order)
            .all()
        )
        for i, stage in enumerate(stages):
            assert stage.sort_order == i

    def test_stage_dates_valid(self, test_stages):
        for stage in test_stages:
            assert stage.stage_from < stage.stage_to

    def test_stages_sequential(self, test_stages):
        """Verify stages don't overlap."""
        sorted_stages = sorted(test_stages, key=lambda s: s.stage_from)
        for i in range(1, len(sorted_stages)):
            assert sorted_stages[i].stage_from >= sorted_stages[i - 1].stage_to

    def test_actual_stage_id(self, db_session, test_project, test_stages):
        """Test setting actual_stage_id on project."""
        test_project.actual_stage_id = test_stages[1].id
        db_session.commit()
        db_session.refresh(test_project)
        assert test_project.actual_stage_id == test_stages[1].id

    def test_cascade_delete(self, db_session, test_project, test_stages):
        """Stages cascade-delete when project is deleted."""
        project_id = test_project.id
        db_session.delete(test_project)
        db_session.commit()
        remaining = db_session.query(ProjectStage).filter(ProjectStage.project_id == project_id).count()
        assert remaining == 0


class TestStageValidation:
    """Test stage date validation logic."""

    def test_validate_valid_schedule(self):
        from app.api.models.project import StageCreate

        stages = [
            StageCreate(stage_name="A", stage_from=date(2026, 1, 1), stage_to=date(2026, 1, 31)),
            StageCreate(stage_name="B", stage_from=date(2026, 2, 1), stage_to=date(2026, 2, 28)),
        ]
        # Should not raise
        from app.api.routes.stages import validate_stage_schedule

        validate_stage_schedule(stages)

    def test_validate_overlapping_schedule(self):
        from app.api.models.project import StageCreate
        from app.api.routes.stages import validate_stage_schedule

        stages = [
            StageCreate(stage_name="A", stage_from=date(2026, 1, 1), stage_to=date(2026, 2, 15)),
            StageCreate(stage_name="B", stage_from=date(2026, 2, 1), stage_to=date(2026, 3, 1)),
        ]
        with pytest.raises(Exception) as exc_info:
            validate_stage_schedule(stages)
        assert "overlaps" in str(exc_info.value.detail)

    def test_validate_stage_end_before_start(self):
        from app.api.models.project import StageCreate

        with pytest.raises(ValueError, match="stage_to must be after stage_from"):
            StageCreate(stage_name="Bad", stage_from=date(2026, 3, 1), stage_to=date(2026, 2, 1))


class TestStageTemplates:
    """Test stage template operations."""

    def test_templates_seeded(self, db_session, test_templates):
        templates = db_session.query(StageTemplate).all()
        assert len(templates) == 2

    def test_full_template_has_7_stages(self, db_session, test_templates):
        full = (
            db_session.query(StageTemplate)
            .filter(StageTemplate.project_type == "architecture_full")
            .first()
        )
        assert full is not None
        assert len(full.stages) == 7
        assert full.stages[0]["stage_name"] == "Briefing"

    def test_legal_template_has_4_stages(self, db_session, test_templates):
        legal = (
            db_session.query(StageTemplate)
            .filter(StageTemplate.project_type == "architecture_legal")
            .first()
        )
        assert legal is not None
        assert len(legal.stages) == 4

    def test_template_response_format(self, test_templates):
        t = test_templates[0]
        assert t.project_type == "architecture_full"
        assert t.template_name == "Architecture Full Project"
        assert isinstance(t.stages, list)
        assert all("stage_name" in s and "default_duration_days" in s for s in t.stages)
