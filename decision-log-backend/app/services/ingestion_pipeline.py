"""Ingestion pipeline service — processes approved sources through ETL.

When a source is approved by an admin, this service:
1. Loads the project participant roster for LLM context
2. Calls the extraction service to extract project items from the transcript
3. Stores extracted items as ProjectItem records linked to the source
4. Updates source ingestion_status to 'processed'

Runs as a background task — creates its own DB session.
"""

import asyncio
import logging
from datetime import datetime
from uuid import uuid4

from app.config import settings
from app.database.models import ProjectItem, ProjectParticipant, Source
from app.database.session import SessionLocal

logger = logging.getLogger(__name__)


def process_approved_source(source_id: str) -> None:
    """Process an approved source through the extraction pipeline.

    Opens its own DB session since this runs as a FastAPI BackgroundTask
    (the request session is already closed by the time this executes).

    Args:
        source_id: UUID string of the approved source to process.
    """
    db = SessionLocal()
    try:
        source = db.query(Source).filter(Source.id == source_id).first()
        if not source:
            logger.error(f"Source {source_id} not found for pipeline processing")
            return

        if source.ingestion_status != "approved":
            logger.warning(
                f"Source {source_id} has status '{source.ingestion_status}', expected 'approved'"
            )
            return

        # Load project participant roster for LLM context
        participants = (
            db.query(ProjectParticipant)
            .filter(ProjectParticipant.project_id == source.project_id)
            .all()
        )
        participant_list = [
            {"name": p.name, "email": p.email, "discipline": p.discipline, "role": p.role}
            for p in participants
        ]

        # Import extraction service (lazy import to avoid circular deps)
        from app.services.extraction_v2 import extract_items_from_transcript

        # Run the async extraction in a new event loop
        extracted_items = asyncio.run(
            extract_items_from_transcript(
                transcript_text=source.raw_content or "",
                meeting_title=source.title or "Untitled Meeting",
                meeting_date=str(source.occurred_at) if source.occurred_at else str(datetime.utcnow()),
                meeting_type=source.meeting_type or "general",
                duration_minutes=source.duration_minutes or 0,
                participants=participant_list,
                api_key=settings.anthropic_api_key,
            )
        )

        # Try to enrich with embeddings (optional — may not be available)
        try:
            from app.services.enrichment_service import build_embedding_text, generate_embedding
            has_enrichment = True
        except ImportError:
            has_enrichment = False

        # Store extracted items as ProjectItem records
        for item_data in extracted_items:
            embedding = None
            if has_enrichment:
                try:
                    embedding_text = build_embedding_text(item_data)
                    embedding = generate_embedding(embedding_text)
                except Exception as e:
                    logger.warning(f"Embedding generation failed for item: {e}")

            project_item = ProjectItem(
                id=uuid4(),
                project_id=source.project_id,
                source_id=source.id,
                item_type=item_data.get("item_type", "decision"),
                source_type="meeting",
                decision_statement=item_data.get("decision_statement", item_data.get("statement", "")),
                statement=item_data.get("statement", item_data.get("decision_statement", "")),
                who=item_data.get("who", "Unknown"),
                timestamp=item_data.get("timestamp", "00:00:00"),
                discipline=item_data.get("discipline", "general"),
                why=item_data.get("why", ""),
                causation=item_data.get("causation"),
                impacts=item_data.get("impacts"),
                consensus=item_data.get("consensus", {}),
                confidence=item_data.get("confidence"),
                affected_disciplines=item_data.get("affected_disciplines", []),
                is_milestone=item_data.get("is_milestone", False),
                owner=item_data.get("owner"),
                source_excerpt=item_data.get("source_excerpt"),
                embedding=embedding,
            )
            db.add(project_item)

        # Mark source as processed
        source.ingestion_status = "processed"
        db.commit()
        logger.info(
            f"Source {source_id} processed: {len(extracted_items)} items extracted"
        )

    except Exception as e:
        logger.error(f"Error processing source {source_id}: {e}")
        db.rollback()
        # Source stays as 'approved' (not 'processed') on failure — per spec
    finally:
        db.close()
