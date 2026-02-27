"""AI summary generation service for ingested sources.

Uses Anthropic Claude API to generate one-line summaries from source content.
Runs as a background task — creates its own DB session.
"""

import logging

from anthropic import Anthropic

from app.config import settings
from app.database.models import Source
from app.database.session import SessionLocal

logger = logging.getLogger(__name__)


def generate_ai_summary(source_id: str) -> None:
    """Generate a one-line AI summary for a source record.

    Opens its own DB session since this runs as a FastAPI BackgroundTask
    (the request session is already closed by the time this executes).

    Args:
        source_id: UUID string of the source to summarize.
    """
    db = SessionLocal()
    try:
        source = db.query(Source).filter(Source.id == source_id).first()
        if not source or not source.raw_content:
            logger.warning(f"Source {source_id} not found or has no raw_content")
            return

        # Use first 2000 chars for summary
        text_preview = source.raw_content[:2000]
        prompt = f"Summarize this meeting transcript in ONE sentence (max 100 words):\n\n{text_preview}"

        client = Anthropic(api_key=settings.anthropic_api_key)
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=150,
            messages=[{"role": "user", "content": prompt}],
        )

        source.ai_summary = response.content[0].text.strip()
        db.commit()
        logger.info(f"AI summary generated for source {source_id}")

    except Exception as e:
        logger.error(f"Error generating AI summary for source {source_id}: {e}")
        db.rollback()
    finally:
        db.close()
