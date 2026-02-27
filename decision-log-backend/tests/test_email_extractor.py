"""Tests for email extraction pipeline — Story 10.1.

Covers:
- strip_quoted_replies: quoted text removal (>, ---Original Message---, On...wrote:)
- EmailExtractor.extract: Claude API integration (mocked)
- Item structure validation
- Thread overlap detection
- Edge cases: empty body, only-quoted body, failed API call
- Pipeline integration: email branch in ingestion_pipeline
"""

import json
import uuid
from datetime import datetime
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from sqlalchemy.orm import Session

from app.database.models import (
    Project,
    ProjectItem,
    ProjectParticipant,
    Source,
)
from app.services.email_extractor import EmailExtractor, strip_quoted_replies

# ──────────────────────────────────────────────────────────────────────────────
# Fixtures
# ──────────────────────────────────────────────────────────────────────────────

FIXTURES_DIR = Path(__file__).parent / "fixtures" / "emails"


def _read_fixture(name: str) -> str:
    return (FIXTURES_DIR / name).read_text()


@pytest.fixture
def sample_project(db_session: Session) -> Project:
    """Create a sample project for tests."""
    project = Project(name="Test Office Tower")
    db_session.add(project)
    db_session.commit()
    db_session.refresh(project)
    return project


@pytest.fixture
def sample_participants(db_session: Session, sample_project: Project) -> list:
    """Create sample participants for the project."""
    participants = [
        ProjectParticipant(
            project_id=sample_project.id,
            name="Carlos",
            email="carlos@example.com",
            discipline="structural",
            role="Engineer",
        ),
        ProjectParticipant(
            project_id=sample_project.id,
            name="Gabriela",
            email="gabriela@example.com",
            discipline="sustainability",
            role="Consultant",
        ),
        ProjectParticipant(
            project_id=sample_project.id,
            name="Maria",
            email="maria@example.com",
            discipline="architecture",
            role="Architect",
        ),
        ProjectParticipant(
            project_id=sample_project.id,
            name="Ana",
            email="ana@example.com",
            discipline="project_management",
            role="PM",
        ),
        ProjectParticipant(
            project_id=sample_project.id,
            name="Pedro",
            email="pedro@example.com",
            discipline="mep",
            role="MEP Engineer",
        ),
    ]
    db_session.add_all(participants)
    db_session.commit()
    return participants


@pytest.fixture
def email_source(db_session: Session, sample_project: Project) -> Source:
    """Create a sample email source."""
    source = Source(
        project_id=sample_project.id,
        source_type="email",
        title="RE: Lighting Selection for Lobby",
        raw_content=_read_fixture("test_email_decision.txt"),
        occurred_at=datetime(2026, 2, 15, 10, 30),
        ingestion_status="approved",
        email_from="carlos@example.com",
        email_thread_id="thread-abc-123",
    )
    db_session.add(source)
    db_session.commit()
    db_session.refresh(source)
    return source


@pytest.fixture
def mock_anthropic_response():
    """Create a mock Claude API response with extracted items."""
    items = [
        {
            "item_type": "decision",
            "statement": "Go with LED lighting option for the main lobby",
            "who": "Carlos",
            "affected_disciplines": ["electrical", "architecture"],
            "owner": None,
            "due_date": None,
        },
        {
            "item_type": "information",
            "statement": "Smart controls will be integrated with the building management system",
            "who": "Carlos",
            "affected_disciplines": ["electrical"],
            "owner": None,
            "due_date": None,
        },
    ]
    mock_response = MagicMock()
    mock_response.content = [MagicMock(text=json.dumps(items))]
    return mock_response


# ──────────────────────────────────────────────────────────────────────────────
# strip_quoted_replies tests
# ──────────────────────────────────────────────────────────────────────────────


class TestStripQuotedReplies:
    """Tests for the strip_quoted_replies utility function."""

    def test_removes_greater_than_lines(self):
        """Lines starting with > should be stripped."""
        body = "New content here.\n> Old quoted text\n> More old text"
        result = strip_quoted_replies(body)
        assert result == "New content here."

    def test_removes_original_message_marker(self):
        """Content after ---Original Message--- should be stripped."""
        body = "Fresh text.\n---Original Message---\nOld content below."
        result = strip_quoted_replies(body)
        assert result == "Fresh text."

    def test_preserves_original_content(self):
        """Non-quoted email body should be fully preserved."""
        body = "Line one.\nLine two.\nLine three."
        result = strip_quoted_replies(body)
        assert result == body

    def test_handles_on_wrote_pattern(self):
        """Gmail-style 'On ... wrote:' pattern should trigger stripping."""
        body = "The facade is approved.\n\nOn Mon, Feb 10, 2026 at 3:45 PM John <john@example.com> wrote:\n> Old content"
        result = strip_quoted_replies(body)
        assert result == "The facade is approved.\n"

    def test_handles_forwarded_message(self):
        """Forwarded message marker should trigger stripping."""
        body = "See below.\n---------- Forwarded message ----------\nFrom: someone"
        result = strip_quoted_replies(body)
        assert result == "See below."

    def test_empty_body(self):
        """Empty string should return empty string."""
        assert strip_quoted_replies("") == ""

    def test_only_quoted_text(self):
        """Body with only quoted text should return empty string."""
        body = "> Everything is quoted\n> Nothing new here"
        result = strip_quoted_replies(body)
        assert result == ""

    def test_thread_fixture_stripping(self):
        """Test against the actual thread fixture file."""
        body = _read_fixture("test_email_thread.txt")
        result = strip_quoted_replies(body)
        assert "facade material has been approved" in result
        assert "What about the facade" not in result
        assert "aluminum and terracotta" not in result


# ──────────────────────────────────────────────────────────────────────────────
# EmailExtractor tests
# ──────────────────────────────────────────────────────────────────────────────


class TestEmailExtractor:
    """Tests for the EmailExtractor service."""

    @patch("app.services.email_extractor.Anthropic")
    def test_extract_produces_items(
        self,
        mock_anthropic_cls,
        db_session,
        email_source,
        sample_participants,
        mock_anthropic_response,
    ):
        """extract() should return a list of item dicts from Claude API."""
        mock_client = MagicMock()
        mock_client.messages.create.return_value = mock_anthropic_response
        mock_anthropic_cls.return_value = mock_client

        extractor = EmailExtractor(db_session)
        items = extractor.extract(email_source, sample_participants)

        assert len(items) == 2
        mock_client.messages.create.assert_called_once()

    @patch("app.services.email_extractor.Anthropic")
    def test_items_have_correct_structure(
        self,
        mock_anthropic_cls,
        db_session,
        email_source,
        sample_participants,
        mock_anthropic_response,
    ):
        """Each extracted item must have item_type, statement, who, affected_disciplines."""
        mock_client = MagicMock()
        mock_client.messages.create.return_value = mock_anthropic_response
        mock_anthropic_cls.return_value = mock_client

        extractor = EmailExtractor(db_session)
        items = extractor.extract(email_source, sample_participants)

        for item in items:
            assert "item_type" in item
            assert "statement" in item
            assert "who" in item
            assert "affected_disciplines" in item
            assert item["item_type"] in (
                "idea",
                "topic",
                "decision",
                "action_item",
                "information",
            )

    @patch("app.services.email_extractor.Anthropic")
    def test_handles_markdown_code_block_response(
        self,
        mock_anthropic_cls,
        db_session,
        email_source,
        sample_participants,
    ):
        """Extract JSON even when Claude wraps it in markdown code blocks."""
        items_json = json.dumps(
            [
                {
                    "item_type": "decision",
                    "statement": "Use terracotta",
                    "who": "Team",
                    "affected_disciplines": ["architecture"],
                    "owner": None,
                    "due_date": None,
                }
            ]
        )
        mock_response = MagicMock()
        mock_response.content = [
            MagicMock(text=f"```json\n{items_json}\n```")
        ]
        mock_client = MagicMock()
        mock_client.messages.create.return_value = mock_response
        mock_anthropic_cls.return_value = mock_client

        extractor = EmailExtractor(db_session)
        items = extractor.extract(email_source, sample_participants)

        assert len(items) == 1
        assert items[0]["item_type"] == "decision"

    def test_empty_body_returns_empty_list(
        self, db_session, email_source, sample_participants
    ):
        """An email with empty raw_content should return no items."""
        email_source.raw_content = ""
        db_session.commit()

        extractor = EmailExtractor(db_session)
        items = extractor.extract(email_source, sample_participants)

        assert items == []

    def test_only_quoted_text_returns_empty_list(
        self, db_session, email_source, sample_participants
    ):
        """An email that is entirely quoted replies should return no items."""
        email_source.raw_content = "> All quoted\n> Nothing new"
        db_session.commit()

        extractor = EmailExtractor(db_session)
        items = extractor.extract(email_source, sample_participants)

        assert items == []

    @patch("app.services.email_extractor.Anthropic")
    def test_failed_api_call_returns_empty_list(
        self,
        mock_anthropic_cls,
        db_session,
        email_source,
        sample_participants,
    ):
        """If the Claude API call fails, extract() should return [] without crashing."""
        mock_client = MagicMock()
        mock_client.messages.create.side_effect = Exception(
            "API connection error"
        )
        mock_anthropic_cls.return_value = mock_client

        extractor = EmailExtractor(db_session)
        items = extractor.extract(email_source, sample_participants)

        assert items == []

    @patch("app.services.email_extractor.Anthropic")
    def test_invalid_json_returns_empty_list(
        self,
        mock_anthropic_cls,
        db_session,
        email_source,
        sample_participants,
    ):
        """If Claude returns non-JSON, extract() should return [] gracefully."""
        mock_response = MagicMock()
        mock_response.content = [
            MagicMock(text="I cannot extract items from this email.")
        ]
        mock_client = MagicMock()
        mock_client.messages.create.return_value = mock_response
        mock_anthropic_cls.return_value = mock_client

        extractor = EmailExtractor(db_session)
        items = extractor.extract(email_source, sample_participants)

        assert items == []


# ──────────────────────────────────────────────────────────────────────────────
# Thread overlap detection tests
# ──────────────────────────────────────────────────────────────────────────────


class TestThreadOverlap:
    """Tests for thread deduplication / overlap detection."""

    def test_thread_overlap_detected(
        self, db_session, email_source, sample_project
    ):
        """check_thread_overlap returns True when another email in the thread was processed."""
        # Create a second source in the same thread that's already processed
        other_source = Source(
            project_id=sample_project.id,
            source_type="email",
            title="Earlier email in thread",
            raw_content="Earlier content",
            occurred_at=datetime(2026, 2, 14, 9, 0),
            ingestion_status="processed",
            email_from="maria@example.com",
            email_thread_id="thread-abc-123",  # Same thread as email_source
        )
        db_session.add(other_source)
        db_session.commit()

        extractor = EmailExtractor(db_session)
        assert extractor.check_thread_overlap(email_source) is True

    def test_no_thread_overlap_when_none_processed(
        self, db_session, email_source
    ):
        """check_thread_overlap returns False when no siblings are processed."""
        extractor = EmailExtractor(db_session)
        assert extractor.check_thread_overlap(email_source) is False

    def test_no_thread_overlap_without_thread_id(
        self, db_session, email_source
    ):
        """check_thread_overlap returns False when email has no thread_id."""
        email_source.email_thread_id = None
        db_session.commit()

        extractor = EmailExtractor(db_session)
        assert extractor.check_thread_overlap(email_source) is False

    def test_thread_overlap_ignores_non_processed(
        self, db_session, email_source, sample_project
    ):
        """check_thread_overlap ignores sibling emails that are still pending/approved."""
        other_source = Source(
            project_id=sample_project.id,
            source_type="email",
            title="Pending sibling",
            raw_content="Some content",
            occurred_at=datetime(2026, 2, 14, 9, 0),
            ingestion_status="approved",  # Not processed
            email_from="maria@example.com",
            email_thread_id="thread-abc-123",
        )
        db_session.add(other_source)
        db_session.commit()

        extractor = EmailExtractor(db_session)
        assert extractor.check_thread_overlap(email_source) is False


# ──────────────────────────────────────────────────────────────────────────────
# Pipeline integration tests
# ──────────────────────────────────────────────────────────────────────────────


class TestPipelineIntegration:
    """Tests for email branch in the ingestion pipeline."""

    @staticmethod
    def _import_pipeline():
        """Import ingestion_pipeline with mocked session module to avoid psycopg2 dep."""
        import importlib
        import sys

        # If already imported (cached), just return it
        if "app.services.ingestion_pipeline" in sys.modules:
            return sys.modules["app.services.ingestion_pipeline"]

        # Ensure database.session is importable (it may fail without psycopg2)
        if "app.database.session" not in sys.modules:
            mock_session_mod = MagicMock()
            sys.modules["app.database.session"] = mock_session_mod

        import app.services.ingestion_pipeline as pipeline_mod

        return pipeline_mod

    @staticmethod
    def _make_non_closing_session(db_session):
        """Wrap db_session so pipeline's db.close() is a no-op (preserves test session)."""
        original_close = db_session.close

        def noop_close():
            pass  # Don't actually close — test fixture manages lifecycle

        db_session.close = noop_close
        return db_session, original_close

    def test_email_branch_calls_email_extractor(
        self,
        db_session,
        email_source,
        sample_participants,
        mock_anthropic_response,
    ):
        """process_approved_source with email source should use EmailExtractor."""
        pipeline_mod = self._import_pipeline()
        source_id = str(email_source.id)

        db_session, restore_close = self._make_non_closing_session(db_session)
        mock_client = MagicMock()
        mock_client.messages.create.return_value = mock_anthropic_response

        try:
            with (
                patch.object(pipeline_mod, "SessionLocal", return_value=db_session),
                patch("app.services.email_extractor.Anthropic") as mock_anthropic_cls,
            ):
                mock_anthropic_cls.return_value = mock_client

                pipeline_mod.process_approved_source(source_id)

                # Verify Claude API was called (email extractor was invoked)
                mock_client.messages.create.assert_called_once()

            # Verify source status was updated
            db_session.refresh(email_source)
            assert email_source.ingestion_status == "processed"
        finally:
            db_session.close = restore_close

    def test_email_pipeline_stores_items(
        self,
        db_session,
        email_source,
        sample_project,
        sample_participants,
        mock_anthropic_response,
    ):
        """Pipeline should store extracted items as ProjectItem records."""
        pipeline_mod = self._import_pipeline()
        source_id = str(email_source.id)
        project_id = sample_project.id

        db_session, restore_close = self._make_non_closing_session(db_session)
        mock_client = MagicMock()
        mock_client.messages.create.return_value = mock_anthropic_response

        try:
            with (
                patch.object(pipeline_mod, "SessionLocal", return_value=db_session),
                patch("app.services.email_extractor.Anthropic") as mock_anthropic_cls,
            ):
                mock_anthropic_cls.return_value = mock_client

                pipeline_mod.process_approved_source(source_id)

            # Check that ProjectItem records were created
            items = (
                db_session.query(ProjectItem)
                .filter_by(source_id=email_source.id)
                .all()
            )
            assert len(items) == 2
            assert items[0].source_type == "email"
            assert items[0].project_id == project_id
        finally:
            db_session.close = restore_close


# ──────────────────────────────────────────────────────────────────────────────
# Prompt building tests
# ──────────────────────────────────────────────────────────────────────────────


class TestPromptBuilding:
    """Tests for prompt template rendering."""

    def test_build_prompt_includes_email_subject(
        self, db_session, email_source, sample_participants
    ):
        """The built prompt should contain the email subject."""
        extractor = EmailExtractor(db_session)
        prompt = extractor._build_prompt(
            email_source,
            sample_participants,
            "Test body content",
        )
        assert "RE: Lighting Selection for Lobby" in prompt

    def test_build_prompt_includes_participants(
        self, db_session, email_source, sample_participants
    ):
        """The built prompt should list all participants."""
        extractor = EmailExtractor(db_session)
        prompt = extractor._build_prompt(
            email_source,
            sample_participants,
            "Test body content",
        )
        assert "Carlos" in prompt
        assert "structural" in prompt
        assert "Gabriela" in prompt
        assert "sustainability" in prompt

    def test_build_prompt_includes_email_body(
        self, db_session, email_source, sample_participants
    ):
        """The built prompt should contain the cleaned email body."""
        extractor = EmailExtractor(db_session)
        body = "This is the cleaned email body."
        prompt = extractor._build_prompt(
            email_source,
            sample_participants,
            body,
        )
        assert body in prompt
