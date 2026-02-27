"""Unit tests for email matcher service.

Story 7.4: Backend Gmail API Poller
"""

import pytest
from unittest.mock import MagicMock

from app.services.email_matcher import EmailMatcherService


@pytest.fixture
def matcher():
    return EmailMatcherService()


@pytest.fixture
def mock_projects():
    """Two mock Project objects."""
    p1 = MagicMock()
    p1.id = "project-uuid-1"
    p1.name = "Skyline Tower"
    p1.archived_at = None

    p2 = MagicMock()
    p2.id = "project-uuid-2"
    p2.name = "Harbor District"
    p2.archived_at = None

    return [p1, p2]


@pytest.fixture
def mock_db(mock_projects):
    db = MagicMock()
    db.query.return_value.filter.return_value.all.return_value = mock_projects
    return db


class TestEmailMatcher:

    def test_matches_via_project_label(self, matcher, mock_db):
        """Matches project by Gmail label 'project/skyline-tower'."""
        result = matcher.match_project(
            db=mock_db,
            gmail_labels=["project/skyline-tower"],
            email_subject="Update",
            email_from="sender@example.com",
        )
        assert result == "project-uuid-1"

    def test_matches_via_soubim_prefix_label(self, matcher, mock_db):
        """Matches project by Gmail label 'soubim/harbor-district'."""
        result = matcher.match_project(
            db=mock_db,
            gmail_labels=["soubim/harbor-district"],
            email_subject="Update",
            email_from="sender@example.com",
        )
        assert result == "project-uuid-2"

    def test_matches_via_subject_fallback(self, matcher, mock_db):
        """Falls back to subject matching when no label matches."""
        result = matcher.match_project(
            db=mock_db,
            gmail_labels=["INBOX"],
            email_subject="Skyline Tower: structural update",
            email_from="sender@example.com",
        )
        assert result == "project-uuid-1"

    def test_returns_none_when_no_match(self, matcher, mock_db):
        """Returns None when no project matches."""
        result = matcher.match_project(
            db=mock_db,
            gmail_labels=["INBOX"],
            email_subject="Completely unrelated email",
            email_from="spam@example.com",
        )
        assert result is None

    def test_returns_none_when_no_projects(self, matcher):
        """Returns None when database has no active projects."""
        db = MagicMock()
        db.query.return_value.filter.return_value.all.return_value = []

        result = matcher.match_project(
            db=db,
            gmail_labels=["project/anything"],
            email_subject="Any subject",
            email_from="sender@example.com",
        )
        assert result is None

    def test_label_matching_case_insensitive(self, matcher, mock_db):
        """Label matching is case-insensitive."""
        result = matcher.match_project(
            db=mock_db,
            gmail_labels=["Project/SKYLINE-TOWER"],
            email_subject="Update",
            email_from="sender@example.com",
        )
        assert result == "project-uuid-1"

    def test_matches_via_proj_prefix_label(self, matcher, mock_db):
        """Matches project by Gmail label 'proj/skyline-tower'."""
        result = matcher.match_project(
            db=mock_db,
            gmail_labels=["proj/skyline-tower"],
            email_subject="Update",
            email_from="sender@example.com",
        )
        assert result == "project-uuid-1"

    def test_label_with_underscores_matches(self, matcher, mock_db):
        """Label with underscores normalizes to match project name."""
        result = matcher.match_project(
            db=mock_db,
            gmail_labels=["project/harbor_district"],
            email_subject="Update",
            email_from="sender@example.com",
        )
        assert result == "project-uuid-2"

    def test_subject_match_case_insensitive(self, matcher, mock_db):
        """Subject matching is case-insensitive."""
        result = matcher.match_project(
            db=mock_db,
            gmail_labels=[],
            email_subject="HARBOR DISTRICT permit update",
            email_from="sender@example.com",
        )
        assert result == "project-uuid-2"
