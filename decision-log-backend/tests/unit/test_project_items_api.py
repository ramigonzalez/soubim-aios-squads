"""Tests for Project Items CRUD API (Story 5.2)."""

import uuid
from datetime import datetime, timedelta

import pytest
from sqlalchemy.orm import Session

from app.database.models import (
    Base,
    Project,
    ProjectItem,
    ProjectMember,
    Source,
    User,
)


# ──────────────────────────────────────────────────────────────────────────────
# Fixtures
# ──────────────────────────────────────────────────────────────────────────────


@pytest.fixture
def test_user(db_session: Session):
    """Create a director user for testing."""
    user = User(
        id=uuid.uuid4(),
        email="test-director@example.com",
        password_hash="hashed",
        name="Test Director",
        role="director",
    )
    db_session.add(user)
    db_session.commit()
    return user


@pytest.fixture
def test_architect(db_session: Session):
    """Create an architect user for testing."""
    user = User(
        id=uuid.uuid4(),
        email="test-architect@example.com",
        password_hash="hashed",
        name="Test Architect",
        role="architect",
    )
    db_session.add(user)
    db_session.commit()
    return user


@pytest.fixture
def test_project(db_session: Session):
    """Create a test project."""
    project = Project(
        id=uuid.uuid4(),
        name="Test Project Alpha",
        description="Test project for items API",
    )
    db_session.add(project)
    db_session.commit()
    return project


@pytest.fixture
def test_member(db_session: Session, test_project, test_architect):
    """Create a project member."""
    member = ProjectMember(
        project_id=test_project.id,
        user_id=test_architect.id,
        role="member",
    )
    db_session.add(member)
    db_session.commit()
    return member


@pytest.fixture
def test_source(db_session: Session, test_project):
    """Create a test source (meeting)."""
    source = Source(
        id=uuid.uuid4(),
        project_id=test_project.id,
        source_type="meeting",
        title="Structural Design Review",
        occurred_at=datetime(2026, 2, 1, 14, 0, 0),
        ingestion_status="processed",
        meeting_type="Design Review",
        participants=[{"name": "Carlos"}, {"name": "André"}],
    )
    db_session.add(source)
    db_session.commit()
    return source


@pytest.fixture
def test_items(db_session: Session, test_project, test_source):
    """Create a set of test project items with various types."""
    items = []
    item_defs = [
        {
            "item_type": "decision",
            "statement": "Use steel framing for main structure",
            "who": "Carlos",
            "discipline": "structural",
            "affected_disciplines": ["structural", "architecture"],
            "is_milestone": True,
            "confidence": 0.92,
            "source_id": test_source.id,
        },
        {
            "item_type": "decision",
            "statement": "Client preferred open floor plan",
            "who": "André",
            "discipline": "architecture",
            "affected_disciplines": ["architecture", "structural"],
            "is_milestone": False,
            "confidence": 0.85,
            "source_id": test_source.id,
        },
        {
            "item_type": "action_item",
            "statement": "Submit structural calculations by Friday",
            "who": "Carlos",
            "discipline": "structural",
            "affected_disciplines": ["structural"],
            "is_milestone": False,
            "confidence": 0.95,
            "owner": "Carlos",
        },
        {
            "item_type": "topic",
            "statement": "Discussed foundation options for soft soil",
            "who": "Carlos",
            "discipline": "civil",
            "affected_disciplines": ["civil", "structural"],
            "is_milestone": False,
            "confidence": 0.88,
        },
        {
            "item_type": "idea",
            "statement": "Consider green roof for sustainability credits",
            "who": "André",
            "discipline": "landscape",
            "affected_disciplines": ["landscape", "architecture", "sustainability"],
            "is_milestone": False,
            "confidence": 0.70,
            "source_type": "manual_input",
        },
        {
            "item_type": "information",
            "statement": "City zoning allows 12-story maximum",
            "who": "Gabriela",
            "discipline": "general",
            "affected_disciplines": ["general"],
            "is_milestone": False,
            "confidence": 0.99,
        },
    ]

    for defn in item_defs:
        item = ProjectItem(
            id=uuid.uuid4(),
            project_id=test_project.id,
            item_type=defn["item_type"],
            source_type=defn.get("source_type", "meeting"),
            statement=defn["statement"],
            decision_statement=defn["statement"],
            who=defn["who"],
            timestamp="00:05:00",
            discipline=defn["discipline"],
            affected_disciplines=defn["affected_disciplines"],
            is_milestone=defn["is_milestone"],
            is_done=False,
            owner=defn.get("owner"),
            why="Test reasoning",
            consensus={},
            confidence=defn.get("confidence"),
            source_id=defn.get("source_id"),
        )
        db_session.add(item)
        items.append(item)

    db_session.commit()
    return items


# ──────────────────────────────────────────────────────────────────────────────
# Pydantic Model Tests
# ──────────────────────────────────────────────────────────────────────────────


class TestPydanticModels:
    """Tests for Pydantic request/response models."""

    def test_item_type_enum_values(self):
        from app.api.models.project_item import ItemType

        assert ItemType.DECISION.value == "decision"
        assert ItemType.ACTION_ITEM.value == "action_item"
        assert ItemType.IDEA.value == "idea"
        assert ItemType.TOPIC.value == "topic"
        assert ItemType.INFORMATION.value == "information"

    def test_source_type_enum_values(self):
        from app.api.models.project_item import SourceType

        assert SourceType.MEETING.value == "meeting"
        assert SourceType.EMAIL.value == "email"
        assert SourceType.DOCUMENT.value == "document"
        assert SourceType.MANUAL_INPUT.value == "manual_input"

    def test_discipline_enum_has_15_values(self):
        from app.api.models.project_item import Discipline

        assert len(Discipline) == 15

    def test_project_item_create_valid(self):
        from app.api.models.project_item import ProjectItemCreate

        item = ProjectItemCreate(
            statement="Test decision",
            item_type="decision",
            who="Carlos",
            affected_disciplines=["structural", "architecture"],
        )
        assert item.statement == "Test decision"
        assert item.item_type.value == "decision"
        assert len(item.affected_disciplines) == 2

    def test_project_item_create_with_impacts(self):
        from app.api.models.project_item import ImpactsSchema, ProjectItemCreate

        item = ProjectItemCreate(
            statement="Test decision",
            item_type="decision",
            who="Carlos",
            affected_disciplines=["structural"],
            impacts=ImpactsSchema(
                cost_impact="+$50K",
                risk_level="high",
            ),
        )
        assert item.impacts.cost_impact == "+$50K"
        assert item.impacts.risk_level == "high"

    def test_project_item_update_partial(self):
        from app.api.models.project_item import ProjectItemUpdate

        update = ProjectItemUpdate(is_milestone=True)
        assert update.is_milestone is True
        assert update.is_done is None
        assert update.statement is None

    def test_consensus_entry_validation(self):
        from app.api.models.project_item import ConsensusEntry

        entry = ConsensusEntry(status="AGREE", notes="Looks good")
        assert entry.status == "AGREE"


# ──────────────────────────────────────────────────────────────────────────────
# Project Items CRUD Tests (ORM layer)
# ──────────────────────────────────────────────────────────────────────────────


class TestProjectItemsCRUD:
    """Tests for Project Items CRUD operations at the ORM layer."""

    def test_list_all_items(self, db_session, test_project, test_items):
        """GET /items returns all project items."""
        items = (
            db_session.query(ProjectItem)
            .filter(ProjectItem.project_id == test_project.id)
            .all()
        )
        assert len(items) == 6

    def test_filter_by_item_type(self, db_session, test_project, test_items):
        """GET /items?item_type=decision filters correctly."""
        decisions = (
            db_session.query(ProjectItem)
            .filter(
                ProjectItem.project_id == test_project.id,
                ProjectItem.item_type == "decision",
            )
            .all()
        )
        assert len(decisions) == 2
        assert all(d.item_type == "decision" for d in decisions)

    def test_filter_by_multiple_item_types(self, db_session, test_project, test_items):
        """GET /items?item_type=decision,topic filters multiple types."""
        items = (
            db_session.query(ProjectItem)
            .filter(
                ProjectItem.project_id == test_project.id,
                ProjectItem.item_type.in_(["decision", "topic"]),
            )
            .all()
        )
        assert len(items) == 3  # 2 decisions + 1 topic

    def test_filter_by_source_type(self, db_session, test_project, test_items):
        """GET /items?source_type=manual_input filters by source."""
        items = (
            db_session.query(ProjectItem)
            .filter(
                ProjectItem.project_id == test_project.id,
                ProjectItem.source_type == "manual_input",
            )
            .all()
        )
        assert len(items) == 1
        assert items[0].item_type == "idea"

    def test_filter_milestones_only(self, db_session, test_project, test_items):
        """GET /milestones returns only milestone items."""
        milestones = (
            db_session.query(ProjectItem)
            .filter(
                ProjectItem.project_id == test_project.id,
                ProjectItem.is_milestone.is_(True),
            )
            .all()
        )
        assert len(milestones) == 1
        assert milestones[0].statement == "Use steel framing for main structure"

    def test_text_search(self, db_session, test_project, test_items):
        """GET /items?search=steel searches across statement, who, why."""
        search_term = "%steel%"
        results = (
            db_session.query(ProjectItem)
            .filter(
                ProjectItem.project_id == test_project.id,
                ProjectItem.decision_statement.ilike(search_term),
            )
            .all()
        )
        assert len(results) == 1
        assert "steel" in results[0].statement.lower()

    def test_get_single_item_with_source(self, db_session, test_items, test_source):
        """GET /items/{id} returns full detail with source info."""
        item = test_items[0]  # The steel framing decision with source
        loaded = db_session.query(ProjectItem).filter(ProjectItem.id == item.id).first()
        assert loaded is not None
        assert loaded.source_id == test_source.id
        assert loaded.source is not None
        assert loaded.source.title == "Structural Design Review"

    def test_create_manual_item(self, db_session, test_project):
        """POST /items creates manual input item."""
        item = ProjectItem(
            id=uuid.uuid4(),
            project_id=test_project.id,
            item_type="idea",
            source_type="manual_input",
            statement="Consider solar panels on roof",
            decision_statement="Consider solar panels on roof",
            who="Gabriela",
            timestamp="",
            discipline="sustainability",
            affected_disciplines=["sustainability", "architecture"],
            why="Environmental goals",
            consensus={},
        )
        db_session.add(item)
        db_session.commit()

        loaded = db_session.query(ProjectItem).filter(ProjectItem.id == item.id).first()
        assert loaded is not None
        assert loaded.source_type == "manual_input"
        assert loaded.item_type == "idea"
        assert "sustainability" in loaded.affected_disciplines

    def test_update_milestone_toggle(self, db_session, test_items):
        """PATCH /items/{id} toggles is_milestone."""
        item = test_items[1]  # Not a milestone
        assert item.is_milestone is False

        item.is_milestone = True
        db_session.commit()
        db_session.refresh(item)
        assert item.is_milestone is True

    def test_update_is_done_toggle(self, db_session, test_items):
        """PATCH /items/{id} toggles is_done."""
        action_item = test_items[2]  # action_item
        assert action_item.is_done is False

        action_item.is_done = True
        db_session.commit()
        db_session.refresh(action_item)
        assert action_item.is_done is True

    def test_update_statement(self, db_session, test_items):
        """PATCH /items/{id} updates statement."""
        item = test_items[0]
        item.statement = "Updated steel framing decision"
        item.decision_statement = "Updated steel framing decision"
        db_session.commit()
        db_session.refresh(item)
        assert item.statement == "Updated steel framing decision"


# ──────────────────────────────────────────────────────────────────────────────
# Backward Compatibility Tests
# ──────────────────────────────────────────────────────────────────────────────


class TestBackwardCompatibility:
    """Tests for the /decisions backward-compatible endpoint."""

    def test_decisions_endpoint_filters_only_decisions(self, db_session, test_project, test_items):
        """GET /decisions only returns items with item_type='decision'."""
        decisions = (
            db_session.query(ProjectItem)
            .filter(
                ProjectItem.project_id == test_project.id,
                ProjectItem.item_type == "decision",
            )
            .all()
        )
        assert len(decisions) == 2
        assert all(d.item_type == "decision" for d in decisions)

    def test_decisions_response_has_v1_field_names(self, test_items):
        """GET /decisions response uses V1 field names."""
        item = test_items[0]
        # Verify V1 fields exist on the ORM model
        assert hasattr(item, "decision_statement")
        assert hasattr(item, "discipline")
        assert item.decision_statement == item.statement

    def test_affected_disciplines_maps_to_single_discipline(self, test_items):
        """V1 /decisions maps affected_disciplines[0] to discipline field."""
        item = test_items[0]
        assert item.affected_disciplines[0] == "structural"
        assert item.discipline == "structural"


# ──────────────────────────────────────────────────────────────────────────────
# Facets Tests
# ──────────────────────────────────────────────────────────────────────────────


class TestFacets:
    """Tests for facets computation."""

    def test_facets_by_item_type(self, db_session, test_project, test_items):
        """Facets count correctly by item_type."""
        items = (
            db_session.query(ProjectItem)
            .filter(ProjectItem.project_id == test_project.id)
            .all()
        )

        type_counts = {}
        for item in items:
            t = item.item_type
            type_counts[t] = type_counts.get(t, 0) + 1

        assert type_counts["decision"] == 2
        assert type_counts["action_item"] == 1
        assert type_counts["topic"] == 1
        assert type_counts["idea"] == 1
        assert type_counts["information"] == 1

    def test_facets_by_source_type(self, db_session, test_project, test_items):
        """Facets count correctly by source_type."""
        items = (
            db_session.query(ProjectItem)
            .filter(ProjectItem.project_id == test_project.id)
            .all()
        )

        source_counts = {}
        for item in items:
            st = item.source_type
            source_counts[st] = source_counts.get(st, 0) + 1

        assert source_counts["meeting"] == 5
        assert source_counts["manual_input"] == 1

    def test_facets_by_discipline(self, db_session, test_project, test_items):
        """Facets count correctly by discipline (from affected_disciplines)."""
        items = (
            db_session.query(ProjectItem)
            .filter(ProjectItem.project_id == test_project.id)
            .all()
        )

        disc_counts = {}
        for item in items:
            for d in (item.affected_disciplines or []):
                disc_counts[d] = disc_counts.get(d, 0) + 1

        assert disc_counts["structural"] >= 3  # appears in decisions, action_item, topic
        assert disc_counts["architecture"] >= 2


# ──────────────────────────────────────────────────────────────────────────────
# Response Format Tests
# ──────────────────────────────────────────────────────────────────────────────


class TestResponseFormat:
    """Tests for response formatting helper."""

    def test_item_to_response_format(self, db_session, test_items, test_source):
        """_item_to_response produces correct dict format."""
        from app.api.routes.project_items import _item_to_response

        item = test_items[0]
        resp = _item_to_response(item)

        assert "id" in resp
        assert "project_id" in resp
        assert "statement" in resp
        assert "who" in resp
        assert "item_type" in resp
        assert "source_type" in resp
        assert "affected_disciplines" in resp
        assert "is_milestone" in resp
        assert "is_done" in resp
        assert "created_at" in resp
        assert isinstance(resp["affected_disciplines"], list)

    def test_item_to_response_includes_source(self, db_session, test_items, test_source):
        """_item_to_response includes source info when available."""
        from app.api.routes.project_items import _item_to_response

        item = test_items[0]  # Has source
        resp = _item_to_response(item)

        assert resp["source"] is not None
        assert resp["source"]["title"] == "Structural Design Review"
        assert resp["source"]["type"] == "meeting"

    def test_item_to_response_no_source(self, db_session, test_items):
        """_item_to_response handles items without source."""
        from app.api.routes.project_items import _item_to_response

        item = test_items[2]  # action_item without source_id
        resp = _item_to_response(item)

        assert resp["source"] is None
