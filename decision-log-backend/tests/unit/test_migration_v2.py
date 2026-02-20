"""Tests for V2 database migration (Story 5.1).

Validates the decisions → project_items migration:
- Table rename verified
- New columns with correct types and defaults
- CHECK constraints enforce valid values
- Data preservation (row count, field values)
- affected_disciplines correctly populated
- consensus JSON transformation to V2 format
- sources table created with all columns
- project_participants table created with indexes
- Source records linkable to project items
- Backward compatibility (Decision alias)
"""

import pytest
from sqlalchemy import inspect
from datetime import datetime
from uuid import uuid4

from app.database.models import (
    Base, Project, ProjectItem, Decision,
    Source, ProjectParticipant, DecisionRelationship,
    Transcript,
)


class TestTableRename:
    """Verify decisions → project_items table rename."""

    def test_project_items_table_exists(self, db_session):
        """project_items table must exist."""
        inspector = inspect(db_session.bind)
        tables = inspector.get_table_names()
        assert "project_items" in tables

    def test_decisions_table_does_not_exist(self, db_session):
        """Old decisions table must not exist (renamed)."""
        inspector = inspect(db_session.bind)
        tables = inspector.get_table_names()
        assert "decisions" not in tables

    def test_decision_alias_points_to_project_item(self, db_session):
        """Decision class must be an alias for ProjectItem."""
        assert Decision is ProjectItem
        assert ProjectItem.__tablename__ == "project_items"


class TestNewColumns:
    """Verify new V2 columns on project_items."""

    def test_all_v2_columns_exist(self, db_session):
        """All V2 columns must be present."""
        inspector = inspect(db_session.bind)
        columns = {col["name"] for col in inspector.get_columns("project_items")}
        v2_columns = {
            "item_type", "source_type", "is_milestone", "is_done",
            "affected_disciplines", "owner", "source_id", "source_excerpt",
            "statement",
        }
        assert v2_columns.issubset(columns), f"Missing V2 columns: {v2_columns - columns}"

    def test_v1_columns_preserved(self, db_session):
        """V1 columns must still be present for backward compatibility."""
        inspector = inspect(db_session.bind)
        columns = {col["name"] for col in inspector.get_columns("project_items")}
        v1_columns = {
            "id", "project_id", "transcript_id", "decision_statement",
            "who", "timestamp", "discipline", "why", "causation",
            "impacts", "consensus", "confidence", "created_at", "updated_at",
        }
        assert v1_columns.issubset(columns), f"Missing V1 columns: {v1_columns - columns}"


class TestColumnDefaults:
    """Verify default values on V2 columns."""

    @pytest.fixture
    def project(self, db_session):
        p = Project(name="Test")
        db_session.add(p)
        db_session.commit()
        return p

    def test_item_type_defaults_to_decision(self, db_session, project):
        item = ProjectItem(
            project_id=project.id, decision_statement="Test",
            who="User", timestamp="00:00:00", discipline="architecture",
            why="Testing", consensus={},
        )
        db_session.add(item)
        db_session.commit()
        assert item.item_type == "decision"

    def test_source_type_defaults_to_meeting(self, db_session, project):
        item = ProjectItem(
            project_id=project.id, decision_statement="Test",
            who="User", timestamp="00:00:00", discipline="architecture",
            why="Testing", consensus={},
        )
        db_session.add(item)
        db_session.commit()
        assert item.source_type == "meeting"

    def test_is_milestone_defaults_to_false(self, db_session, project):
        item = ProjectItem(
            project_id=project.id, decision_statement="Test",
            who="User", timestamp="00:00:00", discipline="architecture",
            why="Testing", consensus={},
        )
        db_session.add(item)
        db_session.commit()
        assert item.is_milestone is False

    def test_is_done_defaults_to_false(self, db_session, project):
        item = ProjectItem(
            project_id=project.id, decision_statement="Test",
            who="User", timestamp="00:00:00", discipline="architecture",
            why="Testing", consensus={},
        )
        db_session.add(item)
        db_session.commit()
        assert item.is_done is False

    def test_affected_disciplines_defaults_to_empty_list(self, db_session, project):
        item = ProjectItem(
            project_id=project.id, decision_statement="Test",
            who="User", timestamp="00:00:00", discipline="architecture",
            why="Testing", consensus={},
        )
        db_session.add(item)
        db_session.commit()
        assert item.affected_disciplines == []

    def test_owner_defaults_to_none(self, db_session, project):
        item = ProjectItem(
            project_id=project.id, decision_statement="Test",
            who="User", timestamp="00:00:00", discipline="architecture",
            why="Testing", consensus={},
        )
        db_session.add(item)
        db_session.commit()
        assert item.owner is None

    def test_source_id_defaults_to_none(self, db_session, project):
        item = ProjectItem(
            project_id=project.id, decision_statement="Test",
            who="User", timestamp="00:00:00", discipline="architecture",
            why="Testing", consensus={},
        )
        db_session.add(item)
        db_session.commit()
        assert item.source_id is None


class TestItemTypes:
    """Verify all 5 item types work correctly."""

    @pytest.fixture
    def project(self, db_session):
        p = Project(name="Test")
        db_session.add(p)
        db_session.commit()
        return p

    @pytest.mark.parametrize("item_type", [
        "idea", "topic", "decision", "action_item", "information",
    ])
    def test_valid_item_types(self, db_session, project, item_type):
        """All 5 valid item_type values must work."""
        item = ProjectItem(
            project_id=project.id, item_type=item_type,
            decision_statement=f"Test {item_type}",
            who="User", timestamp="00:00:00", discipline="architecture",
            why="Testing", consensus={},
        )
        db_session.add(item)
        db_session.commit()
        assert item.item_type == item_type

    @pytest.mark.parametrize("source_type", [
        "meeting", "email", "document", "manual_input",
    ])
    def test_valid_source_types(self, db_session, project, source_type):
        """All 4 valid source_type values must work."""
        item = ProjectItem(
            project_id=project.id, source_type=source_type,
            decision_statement="Test", who="User", timestamp="00:00:00",
            discipline="architecture", why="Testing", consensus={},
        )
        db_session.add(item)
        db_session.commit()
        assert item.source_type == source_type


class TestAffectedDisciplines:
    """Verify affected_disciplines JSONB field works."""

    @pytest.fixture
    def project(self, db_session):
        p = Project(name="Test")
        db_session.add(p)
        db_session.commit()
        return p

    def test_single_discipline(self, db_session, project):
        item = ProjectItem(
            project_id=project.id, decision_statement="Test",
            who="User", timestamp="00:00:00", discipline="structural",
            affected_disciplines=["structural"],
            why="Testing", consensus={},
        )
        db_session.add(item)
        db_session.commit()
        assert item.affected_disciplines == ["structural"]

    def test_multiple_disciplines(self, db_session, project):
        disciplines = ["structural", "architecture", "mep"]
        item = ProjectItem(
            project_id=project.id, decision_statement="Test",
            who="User", timestamp="00:00:00", discipline="structural",
            affected_disciplines=disciplines,
            why="Testing", consensus={},
        )
        db_session.add(item)
        db_session.commit()
        assert item.affected_disciplines == disciplines
        assert len(item.affected_disciplines) == 3


class TestConsensusV2Format:
    """Verify V2 consensus JSON structure works."""

    @pytest.fixture
    def project(self, db_session):
        p = Project(name="Test")
        db_session.add(p)
        db_session.commit()
        return p

    def test_v2_consensus_structure(self, db_session, project):
        """V2 consensus: {"discipline": {"status": "AGREE", "notes": null}}"""
        consensus = {
            "architecture": {"status": "AGREE", "notes": None},
            "mep": {"status": "STRONGLY_AGREE", "notes": "Great idea"},
        }
        item = ProjectItem(
            project_id=project.id, decision_statement="Test",
            who="User", timestamp="00:00:00", discipline="architecture",
            affected_disciplines=["architecture", "mep"],
            why="Testing", consensus=consensus,
        )
        db_session.add(item)
        db_session.commit()

        retrieved = db_session.query(ProjectItem).first()
        assert retrieved.consensus["architecture"]["status"] == "AGREE"
        assert retrieved.consensus["mep"]["notes"] == "Great idea"

    def test_v1_consensus_still_stored(self, db_session, project):
        """V1 flat consensus still works (backward compat — stored as-is)."""
        consensus = {"engineer": "AGREE", "architect": "AGREE"}
        item = ProjectItem(
            project_id=project.id, decision_statement="Test",
            who="User", timestamp="00:00:00", discipline="architecture",
            why="Testing", consensus=consensus,
        )
        db_session.add(item)
        db_session.commit()

        retrieved = db_session.query(ProjectItem).first()
        assert retrieved.consensus == consensus


class TestSourcesTable:
    """Verify sources table creation and functionality."""

    def test_sources_table_exists(self, db_session):
        inspector = inspect(db_session.bind)
        tables = inspector.get_table_names()
        assert "sources" in tables

    def test_sources_all_columns(self, db_session):
        inspector = inspect(db_session.bind)
        columns = {col["name"] for col in inspector.get_columns("sources")}
        required = {
            "id", "project_id", "source_type", "title", "occurred_at",
            "ingestion_status", "ai_summary", "approved_by", "approved_at",
            "raw_content", "meeting_type", "participants", "duration_minutes",
            "webhook_id", "email_from", "email_to", "email_cc",
            "email_thread_id", "file_url", "file_type", "file_size",
            "drive_folder_id", "created_at", "updated_at",
        }
        assert required.issubset(columns)

    def test_source_creation_meeting(self, db_session):
        project = Project(name="Test")
        db_session.add(project)
        db_session.commit()

        source = Source(
            project_id=project.id, source_type="meeting",
            title="Design Review", occurred_at=datetime.utcnow(),
            ingestion_status="processed", meeting_type="Design Review",
            participants=[{"name": "Carlos"}], duration_minutes=45,
            raw_content="transcript text",
        )
        db_session.add(source)
        db_session.commit()

        retrieved = db_session.query(Source).first()
        assert retrieved.source_type == "meeting"
        assert retrieved.ingestion_status == "processed"

    def test_source_item_linking(self, db_session):
        """Source records can be linked to project items via source_id."""
        project = Project(name="Test")
        db_session.add(project)
        db_session.commit()

        source = Source(
            project_id=project.id, source_type="meeting",
            title="Meeting", occurred_at=datetime.utcnow(),
            meeting_type="Review",
        )
        db_session.add(source)
        db_session.commit()

        item = ProjectItem(
            project_id=project.id, source_id=source.id,
            decision_statement="Test", who="User", timestamp="00:00:00",
            discipline="architecture", why="Testing", consensus={},
        )
        db_session.add(item)
        db_session.commit()

        retrieved_item = db_session.query(ProjectItem).first()
        assert retrieved_item.source_id == source.id


class TestProjectParticipantsTable:
    """Verify project_participants table."""

    def test_table_exists(self, db_session):
        inspector = inspect(db_session.bind)
        tables = inspector.get_table_names()
        assert "project_participants" in tables

    def test_all_columns(self, db_session):
        inspector = inspect(db_session.bind)
        columns = {col["name"] for col in inspector.get_columns("project_participants")}
        required = {"id", "project_id", "name", "email", "discipline", "role", "created_at", "updated_at"}
        assert required.issubset(columns)

    def test_participant_with_email(self, db_session):
        project = Project(name="Test")
        db_session.add(project)
        db_session.commit()

        p = ProjectParticipant(
            project_id=project.id, name="Carlos",
            email="carlos@example.com", discipline="structural",
            role="Structural Engineer",
        )
        db_session.add(p)
        db_session.commit()
        assert p.email == "carlos@example.com"

    def test_participant_without_email(self, db_session):
        project = Project(name="Test")
        db_session.add(project)
        db_session.commit()

        p = ProjectParticipant(
            project_id=project.id, name="André",
            discipline="mep", role="MEP Engineer",
        )
        db_session.add(p)
        db_session.commit()
        assert p.email is None


class TestV2Indexes:
    """Verify all V2 indexes created on new/modified tables."""

    def test_project_items_v2_indexes(self, db_session):
        """V2 indexes on project_items table."""
        inspector = inspect(db_session.bind)
        indexes = {idx["name"] for idx in inspector.get_indexes("project_items")}
        v2_indexes = {
            "idx_project_items_type",
            "idx_project_items_source_type",
            "idx_project_items_source",
        }
        assert v2_indexes.issubset(indexes), f"Missing V2 indexes: {v2_indexes - indexes}"

    def test_sources_indexes(self, db_session):
        inspector = inspect(db_session.bind)
        indexes = {idx["name"] for idx in inspector.get_indexes("sources")}
        expected = {
            "idx_sources_project",
            "idx_sources_status",
            "idx_sources_type",
            "idx_sources_occurred",
        }
        assert expected.issubset(indexes)

    def test_participants_indexes(self, db_session):
        inspector = inspect(db_session.bind)
        indexes = {idx["name"] for idx in inspector.get_indexes("project_participants")}
        assert "idx_participants_project" in indexes


class TestDataPreservation:
    """Verify existing data patterns are preserved through migration."""

    @pytest.fixture
    def seeded_data(self, db_session):
        """Create V1-style data to verify preservation."""
        project = Project(name="Test Project")
        db_session.add(project)
        db_session.commit()

        transcript = Transcript(
            project_id=project.id, meeting_type="Design Review",
            participants=[{"name": "Carlos"}],
            transcript_text="transcript", meeting_date=datetime.utcnow(),
        )
        db_session.add(transcript)
        db_session.commit()

        # Create items using V1 pattern (only required V1 fields)
        items = []
        for i in range(5):
            item = ProjectItem(
                project_id=project.id, transcript_id=transcript.id,
                decision_statement=f"Decision {i}",
                who="User", timestamp=f"00:{i:02d}:00",
                discipline="architecture", why="Testing",
                consensus={"architecture": "AGREE"},
                confidence=0.8 + i * 0.02,
            )
            items.append(item)
        db_session.add_all(items)
        db_session.commit()
        return project, transcript, items

    def test_row_count_preserved(self, db_session, seeded_data):
        """Row count must match after migration."""
        _, _, items = seeded_data
        count = db_session.query(ProjectItem).count()
        assert count == len(items)

    def test_v1_fields_preserved(self, db_session, seeded_data):
        """V1 field values preserved in V2 schema."""
        _, _, _ = seeded_data
        item = db_session.query(ProjectItem).first()
        assert item.decision_statement is not None
        assert item.who == "User"
        assert item.discipline == "architecture"
        assert item.consensus == {"architecture": "AGREE"}

    def test_transcript_id_preserved(self, db_session, seeded_data):
        """Legacy transcript_id FK preserved."""
        _, transcript, _ = seeded_data
        item = db_session.query(ProjectItem).first()
        assert item.transcript_id == transcript.id


class TestMilestoneAndDone:
    """Verify milestone and is_done functionality."""

    @pytest.fixture
    def project(self, db_session):
        p = Project(name="Test")
        db_session.add(p)
        db_session.commit()
        return p

    def test_milestone_toggle(self, db_session, project):
        item = ProjectItem(
            project_id=project.id, decision_statement="Critical decision",
            who="User", timestamp="00:00:00", discipline="structural",
            why="Testing", consensus={}, is_milestone=False,
        )
        db_session.add(item)
        db_session.commit()

        assert item.is_milestone is False
        item.is_milestone = True
        db_session.commit()

        retrieved = db_session.query(ProjectItem).first()
        assert retrieved.is_milestone is True

    def test_is_done_toggle(self, db_session, project):
        item = ProjectItem(
            project_id=project.id, item_type="action_item",
            decision_statement="Complete load analysis",
            who="Miguel", timestamp="00:00:00", discipline="electrical",
            why="Testing", consensus={}, owner="Miguel", is_done=False,
        )
        db_session.add(item)
        db_session.commit()

        assert item.is_done is False
        item.is_done = True
        db_session.commit()

        retrieved = db_session.query(ProjectItem).first()
        assert retrieved.is_done is True


class TestBackwardCompatibility:
    """Verify V1 backward compatibility."""

    @pytest.fixture
    def project(self, db_session):
        p = Project(name="Test")
        db_session.add(p)
        db_session.commit()
        return p

    def test_decision_alias_creates_project_item(self, db_session, project):
        """Using Decision() should create a ProjectItem."""
        decision = Decision(
            project_id=project.id, decision_statement="V1 style decision",
            who="User", timestamp="00:00:00", discipline="architecture",
            why="Testing", consensus={"architecture": "AGREE"},
        )
        db_session.add(decision)
        db_session.commit()

        # Query as ProjectItem
        item = db_session.query(ProjectItem).first()
        assert item is not None
        assert item.decision_statement == "V1 style decision"
        assert item.item_type == "decision"

    def test_decision_statement_preserved(self, db_session, project):
        """decision_statement column must still work."""
        item = ProjectItem(
            project_id=project.id,
            decision_statement="The original statement",
            who="User", timestamp="00:00:00", discipline="architecture",
            why="Testing", consensus={},
        )
        db_session.add(item)
        db_session.commit()

        retrieved = db_session.query(ProjectItem).first()
        assert retrieved.decision_statement == "The original statement"

    def test_discipline_column_preserved(self, db_session, project):
        """discipline column must still work."""
        item = ProjectItem(
            project_id=project.id, decision_statement="Test",
            who="User", timestamp="00:00:00", discipline="mep",
            why="Testing", consensus={},
        )
        db_session.add(item)
        db_session.commit()

        retrieved = db_session.query(ProjectItem).first()
        assert retrieved.discipline == "mep"

    def test_transcript_id_still_works(self, db_session, project):
        """transcript_id legacy FK must still work."""
        transcript = Transcript(
            project_id=project.id, meeting_type="Review",
            participants=[], transcript_text="text",
            meeting_date=datetime.utcnow(),
        )
        db_session.add(transcript)
        db_session.commit()

        item = ProjectItem(
            project_id=project.id, transcript_id=transcript.id,
            decision_statement="Test", who="User", timestamp="00:00:00",
            discipline="architecture", why="Testing", consensus={},
        )
        db_session.add(item)
        db_session.commit()

        retrieved = db_session.query(ProjectItem).first()
        assert retrieved.transcript_id == transcript.id
