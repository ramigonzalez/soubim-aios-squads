"""Gmail API polling service for email ingestion.

Polls Gmail for project-related emails, deduplicates by thread ID + message ID,
creates Source records with status='pending', and generates AI one-line summaries.

Story 7.4: Backend Gmail API Poller
"""

import base64
import logging
import time
from datetime import datetime, timezone
from email.utils import parseaddr
from html.parser import HTMLParser
from typing import Optional
from uuid import uuid4

from anthropic import Anthropic
from googleapiclient.errors import HttpError
from sqlalchemy.orm import Session

from app.config import settings
from app.database.models import Source
from app.database.session import SessionLocal
from app.services.email_matcher import email_matcher_service
from app.services.gmail_auth import gmail_auth_service

logger = logging.getLogger(__name__)

# Gmail API quota retry config
MAX_RETRIES = 5
RETRY_BASE_SECONDS = 1  # Doubles each attempt: 1, 2, 4, 8, 16


class HTMLStripper(HTMLParser):
    """Minimal HTML-to-plaintext converter for email body cleaning."""

    def __init__(self):
        super().__init__()
        self.reset()
        self.fed = []

    def handle_data(self, d):
        self.fed.append(d)

    def get_data(self):
        return " ".join(self.fed)


def strip_html(html_body: str) -> str:
    """Strip HTML tags and return plain text."""
    stripper = HTMLStripper()
    stripper.feed(html_body)
    return stripper.get_data().strip()


class GmailPollerService:
    """
    Polls Gmail for project-related emails and creates Source records.

    Responsibilities:
    - Authenticate with Gmail API (delegated to GmailAuthService)
    - Fetch new emails matching configured label filter
    - Match emails to projects (delegated to EmailMatcherService)
    - Deduplicate by thread ID + message ID
    - Create Source records with status='pending'
    - Generate AI one-line summaries via Claude
    - Respect Gmail API quotas with exponential backoff
    """

    def __init__(self):
        self.anthropic = Anthropic(api_key=settings.anthropic_api_key)
        self._api_call_count = 0

    def run_poll_cycle(self) -> dict:
        """
        Execute one complete polling cycle.

        Returns:
            dict with keys: emails_fetched, emails_stored, emails_skipped, errors
        """
        stats = {
            "emails_fetched": 0,
            "emails_stored": 0,
            "emails_skipped": 0,
            "errors": 0,
        }

        logger.info("GmailPoller: Starting poll cycle")
        self._api_call_count = 0

        try:
            service = gmail_auth_service.get_service()
        except Exception as e:
            logger.error(f"GmailPoller: Auth failed, skipping cycle: {e}")
            stats["errors"] += 1
            return stats

        # Fetch message list from Gmail
        try:
            messages = self._list_messages(service)
        except Exception as e:
            logger.error(f"GmailPoller: Failed to list messages: {e}")
            stats["errors"] += 1
            return stats

        stats["emails_fetched"] = len(messages)
        logger.info(
            f"GmailPoller: Fetched {len(messages)} messages "
            f"(API calls: {self._api_call_count})"
        )

        # Process each message
        db = SessionLocal()
        try:
            for msg_stub in messages:
                try:
                    stored = self._process_message(service, db, msg_stub["id"])
                    if stored:
                        stats["emails_stored"] += 1
                    else:
                        stats["emails_skipped"] += 1
                except Exception as e:
                    logger.error(
                        f"GmailPoller: Error processing message {msg_stub['id']}: {e}"
                    )
                    stats["errors"] += 1
        finally:
            db.close()

        logger.info(
            f"GmailPoller: Cycle complete -- "
            f"stored={stats['emails_stored']}, "
            f"skipped={stats['emails_skipped']}, "
            f"errors={stats['errors']}, "
            f"total_api_calls={self._api_call_count}"
        )
        return stats

    def _list_messages(self, service) -> list[dict]:
        """
        Fetch list of unread message stubs from Gmail.

        Applies GMAIL_LABEL_FILTER if configured.
        Returns list of {id, threadId} dicts.
        """
        query_parts = ["is:unread"]

        if settings.gmail_label_filter:
            query_parts.append(f"label:{settings.gmail_label_filter}")

        query = " ".join(query_parts)

        response = self._call_gmail_api(
            service.users().messages().list,
            userId="me",
            q=query,
            maxResults=settings.gmail_max_results_per_poll,
        )

        return response.get("messages", [])

    def _process_message(self, service, db: Session, message_id: str) -> bool:
        """
        Fetch full message, match to project, deduplicate, and store.

        Returns True if a Source record was created, False if skipped.
        """
        # Fetch full message from Gmail
        msg = self._call_gmail_api(
            service.users().messages().get,
            userId="me",
            id=message_id,
            format="full",
        )

        # Extract headers
        headers = {
            h["name"]: h["value"]
            for h in msg.get("payload", {}).get("headers", [])
        }
        subject = headers.get("Subject", "(no subject)")
        from_raw = headers.get("From", "")
        to_raw = headers.get("To", "")
        cc_raw = headers.get("Cc", "")
        date_raw = headers.get("Date", "")
        thread_id = msg.get("threadId", "")
        label_ids = msg.get("labelIds", [])

        # Parse sender
        _, email_from = parseaddr(from_raw)

        # Parse recipients
        email_to = self._parse_address_list(to_raw)
        email_cc = self._parse_address_list(cc_raw)

        # Parse date
        occurred_at = self._parse_date(date_raw)

        # Decode email body
        raw_content = self._extract_body(msg.get("payload", {}))

        # Resolve Gmail label names for matching
        # Note: labelIds are IDs, not names -- use subject-based matching as fallback
        label_names = self._resolve_label_names(service, label_ids)

        # Match to project
        project_id = email_matcher_service.match_project(
            db=db,
            gmail_labels=label_names,
            email_subject=subject,
            email_from=email_from,
        )

        if not project_id:
            logger.debug(
                f"GmailPoller: No project match for '{subject}', skipping"
            )
            return False

        # Deduplicate: check for existing Source with same thread_id + message_id
        if self._is_duplicate(db, thread_id, message_id):
            logger.debug(
                f"GmailPoller: Duplicate detected "
                f"(thread={thread_id}, msg={message_id}), skipping"
            )
            return False

        # Generate AI summary
        ai_summary = self._generate_summary(subject, raw_content)

        # Create Source record
        source = Source(
            id=uuid4(),
            project_id=project_id,
            source_type="email",
            title=subject,
            occurred_at=occurred_at,
            ingestion_status="pending",
            raw_content=raw_content,
            ai_summary=ai_summary,
            email_from=email_from,
            email_to=email_to,
            email_cc=email_cc,
            email_thread_id=thread_id,
            webhook_id=message_id,  # Reused as deduplication key
        )

        db.add(source)
        db.commit()

        logger.info(
            f"GmailPoller: Stored Source for '{subject}' "
            f"(project={project_id}, thread={thread_id})"
        )
        return True

    def _is_duplicate(self, db: Session, thread_id: str, message_id: str) -> bool:
        """
        Check if a Source record already exists for this message.

        Uses email_thread_id + webhook_id (message ID) as composite key.
        """
        existing = (
            db.query(Source)
            .filter(
                Source.email_thread_id == thread_id,
                Source.webhook_id == message_id,
                Source.source_type == "email",
            )
            .first()
        )
        return existing is not None

    def _generate_summary(self, subject: str, body: str) -> Optional[str]:
        """
        Generate a one-line AI summary of the email using Claude.

        Returns None if generation fails (non-blocking).
        """
        if not body:
            return None

        try:
            # Truncate body to avoid excessive token usage
            truncated_body = body[:3000] if len(body) > 3000 else body

            response = self.anthropic.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=100,
                temperature=0.0,
                messages=[
                    {
                        "role": "user",
                        "content": (
                            f"Summarize this email in one sentence for a project manager. "
                            f"Subject: {subject}\n\n{truncated_body}"
                        ),
                    }
                ],
            )

            summary = response.content[0].text.strip()

            # Enforce 150-character cap
            if len(summary) > 150:
                summary = summary[:147] + "..."

            return summary

        except Exception as e:
            logger.warning(
                f"GmailPoller: AI summary generation failed for '{subject}': {e}"
            )
            return None

    def _extract_body(self, payload: dict) -> str:
        """
        Extract plain text body from Gmail message payload.

        Handles both single-part and multipart messages.
        Prefers text/plain; falls back to stripping HTML from text/html.
        """
        mime_type = payload.get("mimeType", "")

        # Single-part message
        if mime_type in ("text/plain", "text/html"):
            data = payload.get("body", {}).get("data", "")
            if data:
                decoded = base64.urlsafe_b64decode(data + "==").decode(
                    "utf-8", errors="replace"
                )
                return decoded if mime_type == "text/plain" else strip_html(decoded)

        # Multipart message -- recurse through parts
        if mime_type.startswith("multipart/"):
            parts = payload.get("parts", [])

            # Prefer text/plain part
            for part in parts:
                if part.get("mimeType") == "text/plain":
                    data = part.get("body", {}).get("data", "")
                    if data:
                        return base64.urlsafe_b64decode(data + "==").decode(
                            "utf-8", errors="replace"
                        )

            # Fall back to text/html
            for part in parts:
                if part.get("mimeType") == "text/html":
                    data = part.get("body", {}).get("data", "")
                    if data:
                        html = base64.urlsafe_b64decode(data + "==").decode(
                            "utf-8", errors="replace"
                        )
                        return strip_html(html)

            # Recurse into nested multipart
            for part in parts:
                if part.get("mimeType", "").startswith("multipart/"):
                    result = self._extract_body(part)
                    if result:
                        return result

        return ""

    def _parse_address_list(self, raw: str) -> list[str]:
        """Parse comma-separated email addresses into a list."""
        if not raw:
            return []
        addresses = []
        for addr in raw.split(","):
            _, email = parseaddr(addr.strip())
            if email:
                addresses.append(email)
        return addresses

    def _parse_date(self, date_raw: str) -> datetime:
        """Parse RFC 2822 date string to UTC datetime."""
        try:
            from email.utils import parsedate_to_datetime

            dt = parsedate_to_datetime(date_raw)
            return dt.astimezone(timezone.utc).replace(tzinfo=None)
        except Exception:
            logger.warning(
                f"GmailPoller: Could not parse date '{date_raw}', using now()"
            )
            return datetime.utcnow()

    def _resolve_label_names(
        self, service, label_ids: list[str]
    ) -> list[str]:
        """
        Resolve Gmail label IDs to human-readable label names.

        System labels (INBOX, UNREAD, etc.) are excluded.
        """
        system_labels = {
            "INBOX",
            "SENT",
            "UNREAD",
            "STARRED",
            "IMPORTANT",
            "SPAM",
            "TRASH",
            "CATEGORY_PERSONAL",
            "CATEGORY_SOCIAL",
            "CATEGORY_PROMOTIONS",
            "CATEGORY_UPDATES",
            "CATEGORY_FORUMS",
        }
        names = []
        for label_id in label_ids:
            if label_id in system_labels:
                continue
            try:
                label_info = self._call_gmail_api(
                    service.users().labels().get,
                    userId="me",
                    id=label_id,
                )
                names.append(label_info.get("name", ""))
            except Exception as e:
                logger.debug(
                    f"GmailPoller: Could not resolve label {label_id}: {e}"
                )
        return names

    def _call_gmail_api(self, method, **kwargs):
        """
        Execute a Gmail API method with exponential backoff retry.

        Args:
            method: Bound method from googleapiclient
                (e.g., service.users().messages().list)
            **kwargs: Arguments forwarded to the method

        Returns:
            API response dict

        Raises:
            HttpError: If all retries exhausted
        """
        self._api_call_count += 1
        last_error = None

        for attempt in range(MAX_RETRIES):
            try:
                return method(**kwargs).execute()
            except HttpError as e:
                if e.status_code in (429, 500, 503):
                    wait_seconds = RETRY_BASE_SECONDS * (2**attempt)
                    logger.warning(
                        f"GmailPoller: API error {e.status_code} on attempt "
                        f"{attempt + 1}/{MAX_RETRIES}. "
                        f"Retrying in {wait_seconds}s..."
                    )
                    time.sleep(wait_seconds)
                    last_error = e
                else:
                    # Non-retryable error (e.g., 403 forbidden, 404 not found)
                    logger.error(
                        f"GmailPoller: Non-retryable API error "
                        f"{e.status_code}: {e}"
                    )
                    raise

        logger.error(
            f"GmailPoller: Max retries ({MAX_RETRIES}) exhausted. "
            f"Last error: {last_error}"
        )
        raise last_error


# Singleton instance
gmail_poller_service = GmailPollerService()
