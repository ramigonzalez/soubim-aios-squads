"""Unit tests for Gmail poller service.

Story 7.4: Backend Gmail API Poller
"""

import base64
import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime


from app.services.gmail_poller import GmailPollerService, strip_html, MAX_RETRIES


# --- Utility function tests ---


class TestStripHtml:
    """Test HTML stripping utility."""

    def test_strips_basic_html_tags(self):
        html = "<p>Hello <b>World</b></p>"
        assert "Hello" in strip_html(html)
        assert "World" in strip_html(html)
        assert "<p>" not in strip_html(html)

    def test_handles_plain_text(self):
        text = "No HTML here"
        assert strip_html(text) == text

    def test_handles_empty_string(self):
        assert strip_html("") == ""

    def test_strips_anchor_tags(self):
        html = '<a href="https://example.com">Click here</a>'
        result = strip_html(html)
        assert "Click here" in result
        assert "<a" not in result

    def test_strips_nested_tags(self):
        html = "<div><p>Outer <span>Inner</span></p></div>"
        result = strip_html(html)
        assert "Outer" in result
        assert "Inner" in result
        assert "<div>" not in result


# --- GmailPollerService tests ---


@pytest.fixture
def poller():
    """Create a GmailPollerService instance with mocked Anthropic client."""
    with patch("app.services.gmail_poller.Anthropic"):
        service = GmailPollerService()
    return service


@pytest.fixture
def mock_db():
    """Mock SQLAlchemy session."""
    return MagicMock()


class TestGmailPollerDeduplication:
    """Test deduplication logic."""

    def test_detects_duplicate_by_thread_and_message_id(self, poller, mock_db):
        """Deduplication returns True when matching Source exists."""
        from app.database.models import Source

        existing = MagicMock(spec=Source)
        mock_db.query.return_value.filter.return_value.first.return_value = existing

        result = poller._is_duplicate(mock_db, "thread123", "msg456")

        assert result is True

    def test_no_duplicate_when_source_absent(self, poller, mock_db):
        """Deduplication returns False when no matching Source exists."""
        mock_db.query.return_value.filter.return_value.first.return_value = None

        result = poller._is_duplicate(mock_db, "thread123", "msg456")

        assert result is False


class TestGmailPollerBodyExtraction:
    """Test email body extraction from Gmail payload."""

    def test_extracts_plaintext_body(self, poller):
        """Extracts decoded plain text from text/plain part."""
        body_text = "Hello, this is the email body."
        encoded = base64.urlsafe_b64encode(body_text.encode()).decode()

        payload = {
            "mimeType": "text/plain",
            "body": {"data": encoded},
        }

        result = poller._extract_body(payload)
        assert result == body_text

    def test_extracts_html_body_stripped(self, poller):
        """Extracts and strips HTML from text/html part."""
        body_html = "<p>Project update: <b>approved</b></p>"
        encoded = base64.urlsafe_b64encode(body_html.encode()).decode()

        payload = {
            "mimeType": "text/html",
            "body": {"data": encoded},
        }

        result = poller._extract_body(payload)
        assert "Project update" in result
        assert "approved" in result
        assert "<p>" not in result

    def test_prefers_plaintext_over_html_in_multipart(self, poller):
        """Prefers text/plain when both parts exist in multipart."""
        plain = base64.urlsafe_b64encode(b"Plain text body").decode()
        html = base64.urlsafe_b64encode(b"<p>HTML body</p>").decode()

        payload = {
            "mimeType": "multipart/alternative",
            "parts": [
                {"mimeType": "text/html", "body": {"data": html}},
                {"mimeType": "text/plain", "body": {"data": plain}},
            ],
        }

        result = poller._extract_body(payload)
        assert "Plain text body" in result

    def test_falls_back_to_html_in_multipart(self, poller):
        """Falls back to HTML when no text/plain part exists."""
        html = base64.urlsafe_b64encode(b"<p>HTML only</p>").decode()

        payload = {
            "mimeType": "multipart/alternative",
            "parts": [
                {"mimeType": "text/html", "body": {"data": html}},
            ],
        }

        result = poller._extract_body(payload)
        assert "HTML only" in result
        assert "<p>" not in result

    def test_returns_empty_string_for_unsupported_type(self, poller):
        """Returns empty string when no text body is found."""
        payload = {
            "mimeType": "application/pdf",
            "body": {},
        }
        result = poller._extract_body(payload)
        assert result == ""

    def test_handles_nested_multipart(self, poller):
        """Recurses into nested multipart to find text body."""
        plain = base64.urlsafe_b64encode(b"Nested plain text").decode()

        payload = {
            "mimeType": "multipart/mixed",
            "parts": [
                {
                    "mimeType": "multipart/alternative",
                    "parts": [
                        {"mimeType": "text/plain", "body": {"data": plain}},
                    ],
                },
            ],
        }

        result = poller._extract_body(payload)
        assert "Nested plain text" in result


class TestGmailPollerAddressParsing:
    """Test email address parsing."""

    def test_parses_single_address(self, poller):
        result = poller._parse_address_list("carlos@example.com")
        assert result == ["carlos@example.com"]

    def test_parses_display_name_with_address(self, poller):
        result = poller._parse_address_list("Carlos Perez <carlos@example.com>")
        assert result == ["carlos@example.com"]

    def test_parses_multiple_addresses(self, poller):
        raw = "carlos@example.com, elena@example.com, morgan@example.com"
        result = poller._parse_address_list(raw)
        assert len(result) == 3
        assert "carlos@example.com" in result

    def test_returns_empty_for_empty_input(self, poller):
        assert poller._parse_address_list("") == []


class TestGmailPollerDateParsing:
    """Test RFC 2822 date parsing."""

    def test_parses_valid_rfc2822_date(self, poller):
        date_str = "Wed, 19 Feb 2026 10:30:00 +0000"
        result = poller._parse_date(date_str)
        assert isinstance(result, datetime)
        assert result.year == 2026
        assert result.month == 2
        assert result.day == 19

    def test_falls_back_to_now_for_invalid_date(self, poller):
        """Invalid date string returns current time without raising."""
        before = datetime.utcnow()
        result = poller._parse_date("not-a-date")
        after = datetime.utcnow()
        assert before <= result <= after

    def test_parses_date_with_timezone_offset(self, poller):
        """Parses date with non-UTC timezone and converts to UTC."""
        date_str = "Wed, 19 Feb 2026 15:30:00 +0500"
        result = poller._parse_date(date_str)
        assert isinstance(result, datetime)
        # 15:30 +0500 = 10:30 UTC
        assert result.hour == 10
        assert result.minute == 30


class TestGmailPollerExponentialBackoff:
    """Test API retry logic."""

    def test_retries_on_429_quota_exceeded(self, poller):
        """Retries on quota exceeded and eventually raises after max retries."""
        from googleapiclient.errors import HttpError
        import httplib2

        mock_response = httplib2.Response({"status": "429"})
        quota_error = HttpError(resp=mock_response, content=b"Quota exceeded")

        mock_method = MagicMock(return_value=MagicMock())
        mock_method.return_value.execute.side_effect = quota_error

        with patch("app.services.gmail_poller.MAX_RETRIES", 2):
            with patch("app.services.gmail_poller.time.sleep") as mock_sleep:
                with pytest.raises(HttpError):
                    poller._call_gmail_api(mock_method, userId="me")

        # Sleep called between retries
        assert mock_sleep.called

    def test_succeeds_after_transient_failure(self, poller):
        """Returns result after one transient failure."""
        from googleapiclient.errors import HttpError
        import httplib2

        mock_response = httplib2.Response({"status": "503"})
        transient_error = HttpError(resp=mock_response, content=b"Service unavailable")

        mock_execute = MagicMock(side_effect=[transient_error, {"messages": []}])
        mock_method = MagicMock(return_value=MagicMock(execute=mock_execute))

        with patch("app.services.gmail_poller.time.sleep"):
            result = poller._call_gmail_api(mock_method, userId="me")

        assert result == {"messages": []}

    def test_raises_immediately_on_non_retryable_error(self, poller):
        """Non-retryable errors (e.g., 403) are raised immediately without retry."""
        from googleapiclient.errors import HttpError
        import httplib2

        mock_response = httplib2.Response({"status": "403"})
        forbidden_error = HttpError(resp=mock_response, content=b"Forbidden")

        mock_method = MagicMock(return_value=MagicMock())
        mock_method.return_value.execute.side_effect = forbidden_error

        with patch("app.services.gmail_poller.time.sleep") as mock_sleep:
            with pytest.raises(HttpError):
                poller._call_gmail_api(mock_method, userId="me")

        # No sleep/retry for non-retryable errors
        mock_sleep.assert_not_called()

    def test_increments_api_call_count(self, poller):
        """API call counter increments on each call."""
        mock_method = MagicMock(return_value=MagicMock())
        mock_method.return_value.execute.return_value = {"result": "ok"}

        poller._api_call_count = 0
        poller._call_gmail_api(mock_method, userId="me")
        poller._call_gmail_api(mock_method, userId="me")

        assert poller._api_call_count == 2


class TestGmailPollerAISummary:
    """Test AI summary generation."""

    def test_generates_summary_successfully(self, poller):
        """Returns Claude-generated summary."""
        mock_response = MagicMock()
        mock_response.content = [
            MagicMock(text="Project kickoff confirmed for March 2026.")
        ]
        poller.anthropic.messages.create.return_value = mock_response

        result = poller._generate_summary(
            "Project Kickoff", "The meeting is confirmed for March."
        )

        assert result == "Project kickoff confirmed for March 2026."

    def test_truncates_summary_over_150_chars(self, poller):
        """Truncates summary exceeding 150 characters."""
        long_summary = "A" * 200
        mock_response = MagicMock()
        mock_response.content = [MagicMock(text=long_summary)]
        poller.anthropic.messages.create.return_value = mock_response

        result = poller._generate_summary("Subject", "Body")

        assert len(result) <= 150
        assert result.endswith("...")

    def test_returns_none_on_api_failure(self, poller):
        """Returns None (not raises) when Claude API fails."""
        poller.anthropic.messages.create.side_effect = Exception("API error")

        result = poller._generate_summary("Subject", "Body")

        assert result is None

    def test_returns_none_for_empty_body(self, poller):
        """Returns None without calling API when body is empty."""
        result = poller._generate_summary("Subject", "")

        poller.anthropic.messages.create.assert_not_called()
        assert result is None

    def test_truncates_body_before_sending(self, poller):
        """Long email bodies are truncated to 3000 chars before sending to Claude."""
        mock_response = MagicMock()
        mock_response.content = [MagicMock(text="Summary")]
        poller.anthropic.messages.create.return_value = mock_response

        long_body = "X" * 5000
        poller._generate_summary("Subject", long_body)

        # Check that the body sent to Claude was truncated
        call_args = poller.anthropic.messages.create.call_args
        message_content = call_args[1]["messages"][0]["content"]
        # The message includes the prompt prefix + truncated body (3000 chars)
        assert len(message_content) < 5000


class TestGmailPollerRunCycle:
    """Test the full poll cycle orchestration."""

    def test_auth_failure_returns_error_stats(self, poller):
        """Auth failure increments error count and returns early."""
        with patch(
            "app.services.gmail_poller.gmail_auth_service"
        ) as mock_auth:
            mock_auth.get_service.side_effect = RuntimeError("No credentials")

            stats = poller.run_poll_cycle()

        assert stats["errors"] == 1
        assert stats["emails_fetched"] == 0

    def test_list_messages_failure_returns_error_stats(self, poller):
        """Failure to list messages returns error stats."""
        with patch(
            "app.services.gmail_poller.gmail_auth_service"
        ) as mock_auth:
            mock_service = MagicMock()
            mock_auth.get_service.return_value = mock_service

            # list messages raises
            mock_service.users.return_value.messages.return_value.list.return_value.execute.side_effect = Exception(
                "API down"
            )

            stats = poller.run_poll_cycle()

        assert stats["errors"] == 1

    def test_individual_message_error_continues_processing(self, poller):
        """Error processing one message does not stop processing of others."""
        with patch(
            "app.services.gmail_poller.gmail_auth_service"
        ) as mock_auth, patch(
            "app.services.gmail_poller.SessionLocal"
        ) as mock_session_factory, patch.object(
            poller, "_list_messages"
        ) as mock_list, patch.object(
            poller, "_process_message"
        ) as mock_process:
            mock_auth.get_service.return_value = MagicMock()
            mock_session_factory.return_value = MagicMock()
            mock_list.return_value = [
                {"id": "msg1"},
                {"id": "msg2"},
                {"id": "msg3"},
            ]

            # First message errors, second succeeds, third skips
            mock_process.side_effect = [Exception("fail"), True, False]

            stats = poller.run_poll_cycle()

        assert stats["emails_fetched"] == 3
        assert stats["errors"] == 1
        assert stats["emails_stored"] == 1
        assert stats["emails_skipped"] == 1


class TestGmailPollerLabelResolution:
    """Test label ID to name resolution."""

    def test_skips_system_labels(self, poller):
        """System labels (INBOX, UNREAD, etc.) are excluded from resolution."""
        mock_service = MagicMock()

        result = poller._resolve_label_names(
            mock_service, ["INBOX", "UNREAD", "STARRED"]
        )

        assert result == []
        # No API calls for system labels
        mock_service.users.return_value.labels.return_value.get.assert_not_called()

    def test_resolves_custom_label(self, poller):
        """Custom label IDs are resolved to their names via API."""
        mock_service = MagicMock()
        mock_service.users.return_value.labels.return_value.get.return_value.execute.return_value = {
            "name": "project/skyline-tower"
        }

        result = poller._resolve_label_names(mock_service, ["Label_123"])

        assert result == ["project/skyline-tower"]

    def test_handles_label_resolution_error(self, poller):
        """Label resolution errors are caught and label is skipped."""
        mock_service = MagicMock()
        mock_service.users.return_value.labels.return_value.get.return_value.execute.side_effect = Exception(
            "Label not found"
        )

        result = poller._resolve_label_names(mock_service, ["Label_bad"])

        assert result == []
