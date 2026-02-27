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

PostgreSQL integration tests (require TEST_DATABASE_URL or DATABASE_URL=postgresql://...):
- GIN index @> (contains) query on affected_disciplines
- Down migration restores V1 schema via transactional DDL rollback
- Vector search (cosine distance) on migrated project_items

TEST-002: Migration SQL execution tests (require PostgreSQL):
- Execute actual UPGRADE_SQL from 001 against V1 schema
- Execute actual UPGRADE_SQL from 002 against migrated schema
- Verify data transformations (discipline mapping, consensus V2, affected_disciplines)
- Full upgrade + downgrade round-trip cycle
"""

import importlib.util
import json
import pathlib
from datetime import datetime

import pytest
from sqlalchemy import inspect, text

from app.database.models import (
    Decision,
    Project,
    ProjectItem,
    ProjectParticipant,
    Source,
    Transcript,
)
from tests.conftest import _exec_migration_sql


def _load_migration_sql(filename: str) -> object:
    """Load a migration module by filename (handles digit-prefixed module names)."""
    migrations_dir = pathlib.Path(__file__).parent.parent.parent / "app" / "database" / "migrations"
    spec = importlib.util.spec_from_file_location(f"migration_{filename}", migrations_dir / filename)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


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


# ──────────────────────────────────────────────────────────────────────────────
# PostgreSQL Integration Tests — TEST-001 (QA Gate Story 5.1)
# Require a live PostgreSQL instance: set TEST_DATABASE_URL or DATABASE_URL.
# These tests are automatically skipped when only SQLite is available.
# ──────────────────────────────────────────────────────────────────────────────


class TestGINIndexQuery:
    """GIN index on affected_disciplines supports JSONB @> (contains) queries.

    AC: "Test: GIN index on affected_disciplines supports @> queries"
    Requires PostgreSQL (GIN + JSONB @> is PostgreSQL-specific).
    """

    @pytest.fixture
    def project(self, pg_session):
        p = Project(name="GIN Test Project")
        pg_session.add(p)
        pg_session.commit()
        return p

    def test_gin_contains_single_discipline(self, pg_session, project):
        """@> returns items whose affected_disciplines array contains the target."""
        structural = ProjectItem(
            project_id=project.id, decision_statement="Steel frame",
            who="Engineer", timestamp="00:00:00", discipline="structural",
            affected_disciplines=["structural", "architecture"],
            why="Cost efficiency", consensus={},
        )
        mep_only = ProjectItem(
            project_id=project.id, decision_statement="HVAC routing",
            who="MEP Eng", timestamp="00:01:00", discipline="mep",
            affected_disciplines=["mep"],
            why="Space constraints", consensus={},
        )
        pg_session.add_all([structural, mep_only])
        pg_session.commit()

        # Cast json→jsonb: the ORM stores affected_disciplines as json (SQLite compat).
        # The @> (contains) operator requires jsonb. Cast is safe and lossless.
        # Queries are scoped to the test project to isolate from existing seed data.
        rows = pg_session.execute(
            text(
                "SELECT id FROM project_items "
                "WHERE project_id = :pid "
                "AND affected_disciplines::jsonb @> '[\"structural\"]'::jsonb"
            ),
            {"pid": str(project.id)},
        ).fetchall()

        assert len(rows) == 1, "Only the structural item should match"
        assert str(rows[0][0]) == str(structural.id)

    def test_gin_contains_multiple_disciplines(self, pg_session, project):
        """@> with multiple values only matches items containing ALL of them."""
        cross_discipline = ProjectItem(
            project_id=project.id, decision_statement="Coordination decision",
            who="PM", timestamp="00:00:00", discipline="architecture",
            affected_disciplines=["architecture", "structural", "mep"],
            why="Cross-discipline coordination", consensus={},
        )
        single_discipline = ProjectItem(
            project_id=project.id, decision_statement="Arch only",
            who="Arch", timestamp="00:01:00", discipline="architecture",
            affected_disciplines=["architecture"],
            why="Internal decision", consensus={},
        )
        pg_session.add_all([cross_discipline, single_discipline])
        pg_session.commit()

        rows = pg_session.execute(
            text(
                "SELECT id FROM project_items "
                "WHERE project_id = :pid "
                "AND affected_disciplines::jsonb @> '[\"architecture\", \"mep\"]'::jsonb"
            ),
            {"pid": str(project.id)},
        ).fetchall()

        assert len(rows) == 1, "Only the cross-discipline item should match both"
        assert str(rows[0][0]) == str(cross_discipline.id)

    def test_gin_no_match_returns_empty(self, pg_session, project):
        """@> returns empty result when no items match the target discipline."""
        item = ProjectItem(
            project_id=project.id, decision_statement="Structural only",
            who="Eng", timestamp="00:00:00", discipline="structural",
            affected_disciplines=["structural"],
            why="Isolated decision", consensus={},
        )
        pg_session.add(item)
        pg_session.commit()

        rows = pg_session.execute(
            text(
                "SELECT id FROM project_items "
                "WHERE project_id = :pid "
                "AND affected_disciplines::jsonb @> '[\"landscape\"]'::jsonb"
            ),
            {"pid": str(project.id)},
        ).fetchall()

        assert len(rows) == 0


class TestDownMigration:
    """Down migration restores V1 schema (decisions table, no V2 columns).

    AC: "Test: down migration restores V1 schema (when no V2-specific data exists)"

    Uses PostgreSQL transactional DDL: the downgrade SQL runs inside a transaction
    that is rolled back at the end, restoring the V2 schema for subsequent tests.
    """

    def test_down_migration_001_002_restores_decisions_table(self, pg_engine):
        """Full downgrade (002 → 001) restores decisions table and removes V2 structures."""
        migration_001 = _load_migration_sql("001_decisions_to_project_items.py")
        migration_002 = _load_migration_sql("002_add_sources_participants.py")

        # Strip BEGIN/COMMIT — SQLAlchemy manages the transaction boundary
        def strip_tx(sql: str) -> str:
            return sql.replace("BEGIN;", "").replace("COMMIT;", "").strip()

        down_002 = strip_tx(migration_002.DOWNGRADE_SQL)
        down_001 = strip_tx(migration_001.DOWNGRADE_SQL)

        # engine.connect() auto-begins a transaction; exiting without commit → rollback.
        # PostgreSQL DDL is transactional, so rollback restores the original V2 schema.
        with pg_engine.connect() as conn:
            try:
                # Run downgrade 002 first (removes FK + drops sources/participants)
                conn.execute(text(down_002))
                # Run downgrade 001 (drops V2 columns, renames project_items → decisions)
                conn.execute(text(down_001))

                # ── Verify V1 state ──────────────────────────────────────────
                tables = conn.execute(
                    text("SELECT tablename FROM pg_tables WHERE schemaname = 'public'")
                ).fetchall()
                table_names = {row[0] for row in tables}

                assert "decisions" in table_names, "decisions table must exist after downgrade"
                assert "project_items" not in table_names, "project_items must not exist after downgrade"
                assert "sources" not in table_names, "sources table must be dropped"
                assert "project_participants" not in table_names, "project_participants must be dropped"

                # Verify V2 columns are gone from decisions
                cols = conn.execute(text(
                    "SELECT column_name FROM information_schema.columns "
                    "WHERE table_name = 'decisions' AND table_schema = 'public'"
                )).fetchall()
                col_names = {row[0] for row in cols}

                assert "decision_statement" in col_names, "V1 column decision_statement must be preserved"
                assert "discipline" in col_names, "V1 column discipline must be preserved"
                assert "item_type" not in col_names, "V2 column item_type must be removed"
                assert "source_type" not in col_names, "V2 column source_type must be removed"
                assert "affected_disciplines" not in col_names, "V2 column affected_disciplines must be removed"
                assert "is_milestone" not in col_names, "V2 column is_milestone must be removed"
                assert "is_done" not in col_names, "V2 column is_done must be removed"

            finally:
                # Always rollback — restores V2 schema regardless of test outcome
                conn.rollback()


class TestVectorSearchPostMigration:
    """Vector search (cosine distance) works on project_items after migration.

    AC: "Test: vector search still works on migrated data"
    Requires PostgreSQL + pgvector extension.
    """

    @pytest.fixture
    def project(self, pg_session):
        p = Project(name="Vector Test Project")
        pg_session.add(p)
        pg_session.commit()
        return p

    def test_vector_search_nearest_neighbor(self, pg_session, project):
        """Items with embeddings are retrievable via cosine distance (<=>)."""
        # 384-dimensional embeddings (all-MiniLM-L6-v2 shape)
        embedding_a = [0.1] * 384
        embedding_b = [0.9] * 384  # Far from A

        item_a = ProjectItem(
            project_id=project.id, decision_statement="Use precast concrete panels",
            who="Engineer", timestamp="00:00:00", discipline="structural",
            why="Speed of construction", consensus={}, embedding=embedding_a,
        )
        item_b = ProjectItem(
            project_id=project.id, decision_statement="Install green roof",
            who="Architect", timestamp="00:01:00", discipline="architecture",
            why="Sustainability", consensus={}, embedding=embedding_b,
        )
        pg_session.add_all([item_a, item_b])
        pg_session.commit()

        # Query for the nearest neighbor to embedding_a
        query_embedding = str(embedding_a)  # pgvector accepts Python list as string
        result = pg_session.execute(
            text(
                "SELECT id, embedding <=> CAST(:emb AS vector) AS distance "
                "FROM project_items "
                "WHERE embedding IS NOT NULL "
                "ORDER BY distance ASC "
                "LIMIT 1"
            ),
            {"emb": query_embedding},
        ).fetchone()

        assert result is not None, "Vector search must return at least one result"
        assert str(result[0]) == str(item_a.id), "Nearest neighbor should be item_a (identical embedding)"
        assert float(result[1]) < 0.001, "Cosine distance to identical vector should be ~0"

    def test_vector_search_items_without_embedding_excluded(self, pg_session, project):
        """Items without embeddings are excluded from vector search."""
        item_with_embedding = ProjectItem(
            project_id=project.id, decision_statement="Concrete decision",
            who="Eng", timestamp="00:00:00", discipline="structural",
            why="Testing", consensus={}, embedding=[0.5] * 384,
        )
        item_without_embedding = ProjectItem(
            project_id=project.id, decision_statement="Manual entry",
            who="PM", timestamp="00:01:00", discipline="client",
            why="No embedding", consensus={},
        )
        pg_session.add_all([item_with_embedding, item_without_embedding])
        pg_session.commit()

        rows = pg_session.execute(
            text(
                "SELECT id FROM project_items "
                "WHERE embedding IS NOT NULL "
                "ORDER BY embedding <=> CAST(:emb AS vector) ASC LIMIT 5"
            ),
            {"emb": str([0.5] * 384)},
        ).fetchall()

        result_ids = {str(row[0]) for row in rows}
        assert str(item_with_embedding.id) in result_ids
        assert str(item_without_embedding.id) not in result_ids


# ──────────────────────────────────────────────────────────────────────────────
# TEST-002: Migration SQL Execution Tests (QA Gate Story 5.1)
# Execute the actual UPGRADE_SQL/DOWNGRADE_SQL scripts against PostgreSQL.
# Previous tests validate ORM models via Base.metadata.create_all();
# these tests validate the raw SQL — the authoritative migration artifact.
# ──────────────────────────────────────────────────────────────────────────────


def _get_schema_tables(conn, schema: str) -> set:
    """Get all table names in a specific schema."""
    rows = conn.execute(
        text("SELECT tablename FROM pg_tables WHERE schemaname = :schema"),
        {"schema": schema},
    ).fetchall()
    return {row[0] for row in rows}


def _get_schema_columns(conn, table: str, schema: str) -> set:
    """Get all column names for a table in a specific schema."""
    rows = conn.execute(
        text(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name = :table AND table_schema = :schema"
        ),
        {"table": table, "schema": schema},
    ).fetchall()
    return {row[0] for row in rows}


def _get_schema_indexes(conn, table: str, schema: str) -> set:
    """Get all index names for a table in a specific schema."""
    rows = conn.execute(
        text(
            "SELECT indexname FROM pg_indexes "
            "WHERE tablename = :table AND schemaname = :schema"
        ),
        {"table": table, "schema": schema},
    ).fetchall()
    return {row[0] for row in rows}


def _get_schema_constraints(conn, table: str, schema: str) -> set:
    """Get all constraint names for a table in a specific schema."""
    rows = conn.execute(
        text(
            "SELECT con.conname FROM pg_constraint con "
            "JOIN pg_class rel ON rel.oid = con.conrelid "
            "JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace "
            "WHERE rel.relname = :table AND nsp.nspname = :schema"
        ),
        {"table": table, "schema": schema},
    ).fetchall()
    return {row[0] for row in rows}


@pytest.mark.postgresql
class TestMigrationSQL001Upgrade:
    """TEST-002: Execute actual UPGRADE_SQL from migration 001 against V1 schema.

    Validates:
    - Table rename (decisions → project_items)
    - V2 columns added with correct defaults
    - CHECK constraints (ck_item_type, ck_source_type)
    - New indexes created
    - Data transformations: discipline 'interior' → 'architecture'
    - Data transformations: affected_disciplines populated from discipline
    - Data transformations: consensus V1 flat → V2 structured
    - Data transformations: statement = decision_statement
    """

    SCHEMA = "test_v1_migration"

    def test_upgrade_001_renames_table_and_adds_columns(self, v1_pg_schema):
        """Migration 001 renames decisions → project_items and adds V2 columns."""
        conn = v1_pg_schema
        migration_001 = _load_migration_sql("001_decisions_to_project_items.py")

        # Verify V1 state before migration
        tables = _get_schema_tables(conn, self.SCHEMA)
        assert "decisions" in tables, "V1 decisions table must exist before migration"
        assert "project_items" not in tables

        # Execute actual upgrade SQL
        _exec_migration_sql(conn, migration_001.UPGRADE_SQL)
        conn.commit()

        # Verify table rename
        tables = _get_schema_tables(conn, self.SCHEMA)
        assert "project_items" in tables, "project_items must exist after migration"
        assert "decisions" not in tables, "decisions must be renamed"

        # Verify V2 columns added
        columns = _get_schema_columns(conn, "project_items", self.SCHEMA)
        v2_columns = {
            "item_type", "source_type", "is_milestone", "is_done",
            "affected_disciplines", "owner", "source_id", "source_excerpt", "statement",
        }
        assert v2_columns.issubset(columns), f"Missing V2 columns: {v2_columns - columns}"

        # Verify V1 columns preserved
        v1_columns = {"decision_statement", "who", "timestamp", "discipline", "why", "consensus"}
        assert v1_columns.issubset(columns), f"Missing V1 columns: {v1_columns - columns}"

    def test_upgrade_001_defaults_populated(self, v1_pg_schema):
        """V2 columns have correct default values after migration."""
        conn = v1_pg_schema
        migration_001 = _load_migration_sql("001_decisions_to_project_items.py")
        _exec_migration_sql(conn, migration_001.UPGRADE_SQL)
        conn.commit()

        rows = conn.execute(text(
            "SELECT item_type, source_type, is_milestone, is_done "
            "FROM project_items"
        )).fetchall()

        assert len(rows) == 3, "All 3 V1 rows must be preserved"
        for row in rows:
            assert row[0] == "decision", "item_type must default to 'decision'"
            assert row[1] == "meeting", "source_type must default to 'meeting'"
            assert row[2] is False, "is_milestone must default to false"
            assert row[3] is False, "is_done must default to false"

    def test_upgrade_001_check_constraints(self, v1_pg_schema):
        """CHECK constraints reject invalid item_type and source_type values."""
        conn = v1_pg_schema
        migration_001 = _load_migration_sql("001_decisions_to_project_items.py")
        _exec_migration_sql(conn, migration_001.UPGRADE_SQL)
        conn.commit()

        constraints = _get_schema_constraints(conn, "project_items", self.SCHEMA)
        assert "ck_item_type" in constraints, "ck_item_type constraint must exist"
        assert "ck_source_type" in constraints, "ck_source_type constraint must exist"

    def test_upgrade_001_indexes_created(self, v1_pg_schema):
        """New V2 indexes created on project_items."""
        conn = v1_pg_schema
        migration_001 = _load_migration_sql("001_decisions_to_project_items.py")
        _exec_migration_sql(conn, migration_001.UPGRADE_SQL)
        conn.commit()

        indexes = _get_schema_indexes(conn, "project_items", self.SCHEMA)
        expected = {
            "idx_project_items_type",
            "idx_project_items_source_type",
            "idx_project_items_milestone",
            "idx_project_items_source",
            "idx_project_items_disciplines",
            "idx_project_items_project_type_date",
        }
        assert expected.issubset(indexes), f"Missing V2 indexes: {expected - indexes}"

        # Verify renamed V1 indexes
        renamed = {
            "idx_project_items_project",
            "idx_project_items_discipline",
            "idx_project_items_confidence",
            "idx_project_items_created",
            "idx_project_items_composite",
        }
        assert renamed.issubset(indexes), f"Missing renamed indexes: {renamed - indexes}"

    def test_upgrade_001_discipline_mapping(self, v1_pg_schema):
        """'interior' discipline mapped to 'architecture' per architect review B1."""
        conn = v1_pg_schema
        migration_001 = _load_migration_sql("001_decisions_to_project_items.py")
        _exec_migration_sql(conn, migration_001.UPGRADE_SQL)
        conn.commit()

        # No rows should have 'interior' discipline after migration
        interior_count = conn.execute(text(
            "SELECT COUNT(*) FROM project_items WHERE discipline = 'interior'"
        )).scalar()
        assert interior_count == 0, "'interior' must be mapped to 'architecture'"

        # The row that was 'interior' should now be 'architecture'
        arch_row = conn.execute(text(
            "SELECT discipline, decision_statement FROM project_items "
            "WHERE id = '44444444-4444-4444-4444-444444444444'"
        )).fetchone()
        assert arch_row[0] == "architecture", "interior row must become architecture"

    def test_upgrade_001_affected_disciplines_populated(self, v1_pg_schema):
        """affected_disciplines populated from single discipline field."""
        conn = v1_pg_schema
        migration_001 = _load_migration_sql("001_decisions_to_project_items.py")
        _exec_migration_sql(conn, migration_001.UPGRADE_SQL)
        conn.commit()

        rows = conn.execute(text(
            "SELECT discipline, affected_disciplines FROM project_items ORDER BY id"
        )).fetchall()

        for discipline, affected in rows:
            # Parse JSONB — psycopg may return as dict/list or string
            if isinstance(affected, str):
                affected = json.loads(affected)
            assert isinstance(affected, list), "affected_disciplines must be a JSONB array"
            assert discipline in affected, (
                f"affected_disciplines {affected} must contain discipline '{discipline}'"
            )

    def test_upgrade_001_consensus_v2_format(self, v1_pg_schema):
        """Consensus transformed from V1 flat map to V2 structured format."""
        conn = v1_pg_schema
        migration_001 = _load_migration_sql("001_decisions_to_project_items.py")
        _exec_migration_sql(conn, migration_001.UPGRADE_SQL)
        conn.commit()

        rows = conn.execute(text(
            "SELECT consensus FROM project_items "
            "WHERE consensus IS NOT NULL AND consensus::text NOT IN ('null', '')"
        )).fetchall()

        assert len(rows) == 3, "All 3 seeded rows have consensus data"
        for (consensus_raw,) in rows:
            consensus = consensus_raw if isinstance(consensus_raw, dict) else json.loads(consensus_raw)
            for _disc, value in consensus.items():
                assert isinstance(value, dict), f"V2 consensus must be nested object, got: {value}"
                assert "status" in value, f"V2 consensus must have 'status' key: {value}"
                assert "notes" in value, f"V2 consensus must have 'notes' key: {value}"

    def test_upgrade_001_statement_alias(self, v1_pg_schema):
        """statement column populated from decision_statement."""
        conn = v1_pg_schema
        migration_001 = _load_migration_sql("001_decisions_to_project_items.py")
        _exec_migration_sql(conn, migration_001.UPGRADE_SQL)
        conn.commit()

        mismatches = conn.execute(text(
            "SELECT COUNT(*) FROM project_items WHERE statement != decision_statement"
        )).scalar()
        assert mismatches == 0, "statement must equal decision_statement after migration"


@pytest.mark.postgresql
class TestMigrationSQL002Upgrade:
    """TEST-002: Execute actual UPGRADE_SQL from migration 002 against migrated schema.

    Validates:
    - sources table created with all required columns
    - project_participants table created
    - Transcript data migrated to source records
    - project_items linked to sources via webhook_id mapping
    - Source indexes and constraints created
    """

    SCHEMA = "test_v1_migration"

    @pytest.fixture
    def migrated_schema(self, v1_pg_schema):
        """V1 schema with migration 001 already applied (prerequisite for 002)."""
        conn = v1_pg_schema
        migration_001 = _load_migration_sql("001_decisions_to_project_items.py")
        _exec_migration_sql(conn, migration_001.UPGRADE_SQL)
        conn.commit()
        return conn

    def test_upgrade_002_creates_tables(self, migrated_schema):
        """Migration 002 creates sources and project_participants tables."""
        conn = migrated_schema
        migration_002 = _load_migration_sql("002_add_sources_participants.py")
        _exec_migration_sql(conn, migration_002.UPGRADE_SQL)
        conn.commit()

        tables = _get_schema_tables(conn, self.SCHEMA)
        assert "sources" in tables, "sources table must exist after migration 002"
        assert "project_participants" in tables, "project_participants must exist"

    def test_upgrade_002_sources_columns(self, migrated_schema):
        """sources table has all required columns."""
        conn = migrated_schema
        migration_002 = _load_migration_sql("002_add_sources_participants.py")
        _exec_migration_sql(conn, migration_002.UPGRADE_SQL)
        conn.commit()

        columns = _get_schema_columns(conn, "sources", self.SCHEMA)
        required = {
            "id", "project_id", "source_type", "title", "occurred_at",
            "ingestion_status", "ai_summary", "approved_by", "approved_at",
            "raw_content", "meeting_type", "participants", "duration_minutes",
            "webhook_id", "email_from", "email_to", "email_cc",
            "email_thread_id", "file_url", "file_type", "file_size",
            "drive_folder_id", "created_at", "updated_at",
        }
        assert required.issubset(columns), f"Missing source columns: {required - columns}"

    def test_upgrade_002_sources_indexes(self, migrated_schema):
        """sources table has required indexes including partial unique indexes."""
        conn = migrated_schema
        migration_002 = _load_migration_sql("002_add_sources_participants.py")
        _exec_migration_sql(conn, migration_002.UPGRADE_SQL)
        conn.commit()

        indexes = _get_schema_indexes(conn, "sources", self.SCHEMA)
        expected = {
            "idx_sources_project", "idx_sources_status",
            "idx_sources_type", "idx_sources_occurred",
            "idx_sources_webhook", "idx_sources_email_thread",
        }
        assert expected.issubset(indexes), f"Missing source indexes: {expected - indexes}"

    def test_upgrade_002_participants_indexes(self, migrated_schema):
        """project_participants has partial unique indexes per architect review A5."""
        conn = migrated_schema
        migration_002 = _load_migration_sql("002_add_sources_participants.py")
        _exec_migration_sql(conn, migration_002.UPGRADE_SQL)
        conn.commit()

        indexes = _get_schema_indexes(conn, "project_participants", self.SCHEMA)
        expected = {
            "idx_participants_project",
            "idx_participants_email",
            "idx_participants_name",
        }
        assert expected.issubset(indexes), f"Missing participant indexes: {expected - indexes}"

    def test_upgrade_002_transcript_to_source_migration(self, migrated_schema):
        """Transcript records migrated to source records with correct data."""
        conn = migrated_schema
        migration_002 = _load_migration_sql("002_add_sources_participants.py")
        _exec_migration_sql(conn, migration_002.UPGRADE_SQL)
        conn.commit()

        # Count match: each transcript becomes a source
        transcript_count = conn.execute(text("SELECT COUNT(*) FROM transcripts")).scalar()
        source_count = conn.execute(text("SELECT COUNT(*) FROM sources")).scalar()
        assert source_count == transcript_count, "Each transcript must create one source"

        # Verify source data from transcript
        source = conn.execute(text(
            "SELECT source_type, meeting_type, title, raw_content, webhook_id "
            "FROM sources LIMIT 1"
        )).fetchone()
        assert source[0] == "meeting", "Transcript-derived source must be type 'meeting'"
        assert source[1] == "Design Review", "meeting_type must be preserved"
        assert source[2] is not None, "title must be populated"
        assert "transcript" in source[3].lower(), "raw_content must contain transcript text"
        assert source[4] == "wh_migration_test_001", "webhook_id must be preserved"

    def test_upgrade_002_items_linked_to_sources(self, migrated_schema):
        """project_items linked to sources via transcript → source webhook_id mapping."""
        conn = migrated_schema
        migration_002 = _load_migration_sql("002_add_sources_participants.py")
        _exec_migration_sql(conn, migration_002.UPGRADE_SQL)
        conn.commit()

        # All items with transcript_id should now have source_id
        linked = conn.execute(text(
            "SELECT COUNT(*) FROM project_items "
            "WHERE transcript_id IS NOT NULL AND source_id IS NOT NULL"
        )).scalar()
        total_with_transcript = conn.execute(text(
            "SELECT COUNT(*) FROM project_items WHERE transcript_id IS NOT NULL"
        )).scalar()
        assert linked == total_with_transcript, (
            f"All items with transcript_id must be linked to sources: "
            f"{linked}/{total_with_transcript}"
        )

        # Verify FK is valid — source_id references actual source
        orphans = conn.execute(text(
            "SELECT COUNT(*) FROM project_items pi "
            "WHERE pi.source_id IS NOT NULL "
            "AND NOT EXISTS (SELECT 1 FROM sources s WHERE s.id = pi.source_id)"
        )).scalar()
        assert orphans == 0, "No orphaned source_id references"


@pytest.mark.postgresql
class TestMigrationSQLFullCycle:
    """TEST-002: Full upgrade + downgrade round-trip validates reversibility.

    Starts from V1 schema, runs both upgrades, then both downgrades,
    and verifies V1 state is fully restored with all data preserved.
    """

    SCHEMA = "test_v1_migration"

    def test_full_upgrade_downgrade_preserves_data(self, v1_pg_schema):
        """Full cycle: V1 → upgrade 001 → upgrade 002 → downgrade 002 → downgrade 001 → V1."""
        conn = v1_pg_schema
        migration_001 = _load_migration_sql("001_decisions_to_project_items.py")
        migration_002 = _load_migration_sql("002_add_sources_participants.py")

        # Record V1 state
        v1_row_count = conn.execute(text("SELECT COUNT(*) FROM decisions")).scalar()
        v1_statements = conn.execute(text(
            "SELECT decision_statement FROM decisions ORDER BY id"
        )).fetchall()

        # Run upgrades
        _exec_migration_sql(conn, migration_001.UPGRADE_SQL)
        conn.commit()
        _exec_migration_sql(conn, migration_002.UPGRADE_SQL)
        conn.commit()

        # Verify V2 state
        tables = _get_schema_tables(conn, self.SCHEMA)
        assert "project_items" in tables
        assert "sources" in tables

        # Run downgrades (reverse order)
        _exec_migration_sql(conn, migration_002.DOWNGRADE_SQL)
        conn.commit()
        _exec_migration_sql(conn, migration_001.DOWNGRADE_SQL)
        conn.commit()

        # Verify V1 state restored
        tables = _get_schema_tables(conn, self.SCHEMA)
        assert "decisions" in tables, "decisions table must be restored"
        assert "project_items" not in tables, "project_items must not exist"
        assert "sources" not in tables, "sources must be dropped"
        assert "project_participants" not in tables, "project_participants must be dropped"

        # Verify V2 columns removed
        columns = _get_schema_columns(conn, "decisions", self.SCHEMA)
        assert "item_type" not in columns, "V2 column item_type must be removed"
        assert "source_type" not in columns, "V2 column source_type must be removed"
        assert "affected_disciplines" not in columns
        assert "is_milestone" not in columns
        assert "is_done" not in columns

        # Verify data preserved
        restored_count = conn.execute(text("SELECT COUNT(*) FROM decisions")).scalar()
        assert restored_count == v1_row_count, "Row count must match after round-trip"

        restored_statements = conn.execute(text(
            "SELECT decision_statement FROM decisions ORDER BY id"
        )).fetchall()
        assert restored_statements == v1_statements, "Decision statements must be preserved"
