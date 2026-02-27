"""Email extraction service — extracts project items from email content.

Story 10.1: Email Item Extraction Pipeline
Handles quoted reply stripping, thread deduplication, discipline inference,
and Claude API extraction of 5 item types from email bodies.
"""

import json
import logging
from pathlib import Path

from anthropic import Anthropic

from app.config import settings
from app.database.models import Source, ProjectParticipant

logger = logging.getLogger(__name__)

PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "extract_email.md"


def strip_quoted_replies(body: str) -> str:
    """Remove quoted text from email body.

    Strips content starting from the first quoted reply marker:
    - Lines starting with '>'
    - "On ... wrote:" patterns (Gmail-style)
    - '---Original Message---'
    - '---------- Forwarded message'
    """
    lines = body.split("\n")
    clean_lines = []
    for line in lines:
        if line.startswith(">"):
            break
        if line.startswith("On ") and " wrote:" in line:
            break
        if "---Original Message---" in line:
            break
        if "---------- Forwarded message" in line:
            break
        clean_lines.append(line)
    return "\n".join(clean_lines)


class EmailExtractor:
    """Extracts project items from email source content using Claude API."""

    def __init__(self, db_session):
        self.db = db_session
        self.prompt_template = PROMPT_PATH.read_text() if PROMPT_PATH.exists() else ""

    def extract(self, source: Source, participants: list) -> list[dict]:
        """Extract project items from an email source.

        Args:
            source: The Source record with source_type='email'.
            participants: List of ProjectParticipant records for the project.

        Returns:
            List of dicts with keys: item_type, statement, who,
            affected_disciplines, owner, due_date.
        """
        clean_body = strip_quoted_replies(source.raw_content or "")
        if not clean_body.strip():
            return []

        if self.check_thread_overlap(source):
            logger.warning(f"Thread overlap detected for source {source.id}")

        prompt = self._build_prompt(source, participants, clean_body)

        try:
            client = Anthropic(api_key=settings.anthropic_api_key)
            response = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=4096,
                messages=[{"role": "user", "content": prompt}],
            )
            raw_text = response.content[0].text.strip()
            # Extract JSON from response (handle markdown code blocks)
            if raw_text.startswith("```"):
                raw_text = raw_text.split("\n", 1)[1].rsplit("```", 1)[0]
            items = json.loads(raw_text)
            return items if isinstance(items, list) else []
        except Exception as e:
            logger.error(f"Email extraction failed for source {source.id}: {e}")
            return []

    def _build_prompt(
        self, source: Source, participants: list, clean_body: str
    ) -> str:
        """Build the extraction prompt from the template and source data."""
        prompt = self.prompt_template

        # Extract project name from relationship if available
        project_name = ""
        if hasattr(source, "project") and source.project:
            project_name = getattr(source.project, "name", "") or ""

        prompt = prompt.replace("{{project_name}}", project_name)
        prompt = prompt.replace("{{email_subject}}", source.title or "")
        prompt = prompt.replace("{{email_from}}", source.email_from or "")
        prompt = prompt.replace("{{email_date}}", str(source.occurred_at or ""))

        participant_text = "\n".join(
            f"- {p.name} ({getattr(p, 'email', '')}) — Discipline: {p.discipline}"
            for p in participants
        )
        prompt = prompt.replace("{{participants}}", participant_text)
        prompt = prompt.replace("{{email_body}}", clean_body)

        return prompt

    def check_thread_overlap(self, source: Source) -> bool:
        """Check if other emails in this thread were already processed.

        Returns True if at least one other email with the same
        email_thread_id has ingestion_status='processed'.
        """
        if not source.email_thread_id:
            return False
        return (
            self.db.query(Source)
            .filter(
                Source.email_thread_id == source.email_thread_id,
                Source.id != source.id,
                Source.ingestion_status == "processed",
            )
            .count()
            > 0
        )
