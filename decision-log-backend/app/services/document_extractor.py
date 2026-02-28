"""Document extraction service — extracts project items from document text via Claude.

Story 10.2: Document Ingestion (PDF & DOCX)
Follows the same pattern as EmailExtractor (Story 10.1).
"""

import json
import logging
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy.orm import Session

from app.config import settings
from app.database.models import Source

logger = logging.getLogger(__name__)

PROMPT_PATH = Path(__file__).parent.parent / "prompts" / "extract_document.md"


class DocumentExtractor:
    """Extracts structured project items from a document Source using Claude AI."""

    def __init__(self, db_session: Session):
        self.db = db_session
        self.prompt_template = PROMPT_PATH.read_text() if PROMPT_PATH.exists() else ""

    def extract(self, source: Source, participants: list) -> list[dict]:
        """Extract project items from a document source.

        Args:
            source: Source record with raw_content, title, file_type populated.
            participants: List of ProjectParticipant dicts with name, discipline, role.

        Returns:
            List of extracted item dicts ready for ProjectItem creation.
        """
        if not source.raw_content:
            logger.warning(f"Source {source.id} has no raw_content, skipping extraction")
            return []

        if not self.prompt_template:
            logger.error("Document extraction prompt template not found")
            return []

        # Build participant roster string
        participant_lines = []
        for p in participants:
            name = p.get("name", "Unknown")
            discipline = p.get("discipline", "general")
            role = p.get("role", "")
            participant_lines.append(f"- {name} ({discipline}, {role})")
        participants_text = "\n".join(participant_lines) if participant_lines else "No participants on record."

        # Get project name
        project_name = ""
        if source.project:
            project_name = source.project.name or ""

        # Fill prompt template
        prompt = self.prompt_template
        prompt = prompt.replace("{{project_name}}", project_name)
        prompt = prompt.replace("{{document_title}}", source.title or "Untitled Document")
        prompt = prompt.replace("{{file_type}}", source.file_type or "unknown")
        prompt = prompt.replace("{{upload_date}}", source.created_at.isoformat() if source.created_at else datetime.now(timezone.utc).isoformat())
        prompt = prompt.replace("{{participants}}", participants_text)
        prompt = prompt.replace("{{document_text}}", source.raw_content)

        # Call Claude API
        try:
            from anthropic import Anthropic

            client = Anthropic(api_key=settings.anthropic_api_key)
            response = client.messages.create(
                model="claude-sonnet-4-20250514",
                max_tokens=4096,
                messages=[
                    {
                        "role": "user",
                        "content": prompt,
                    }
                ],
            )
            raw_response = response.content[0].text.strip()
        except Exception as e:
            logger.error(f"Claude API call failed for document extraction: {e}")
            return []

        # Parse JSON response
        try:
            # Handle potential markdown code fences
            text = raw_response
            if text.startswith("```"):
                # Strip ```json ... ``` wrapper
                lines = text.split("\n")
                text = "\n".join(lines[1:-1]) if len(lines) > 2 else text

            items = json.loads(text)
            if not isinstance(items, list):
                logger.error(f"Expected JSON array from Claude, got {type(items)}")
                return []

            logger.info(f"Extracted {len(items)} items from document source {source.id}")
            return items

        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Claude response as JSON: {e}")
            logger.debug(f"Raw response: {raw_response[:500]}")
            return []
