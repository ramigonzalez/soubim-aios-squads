"""Ingestion pipeline — processes approved sources into project items.

Story 7.1: Base pipeline for meeting transcripts.
Story 10.1: Added email source handling via EmailExtractor.
Story 10.2: Added document source handling via DocumentExtractor.
"""

import asyncio
import logging

from app.database.models import ProjectItem, ProjectParticipant, Source
from app.database.session import SessionLocal

logger = logging.getLogger(__name__)


def process_approved_source(source_id: str) -> None:
    """Process an approved source and extract project items.

    Dispatches to the appropriate extractor based on source_type:
    - 'email' -> EmailExtractor
    - 'document' -> DocumentExtractor
    - 'meeting' -> extraction_v2 transcript extractor (legacy)

    Args:
        source_id: UUID string of the Source record to process.
    """
    db = SessionLocal()
    try:
        source = db.query(Source).filter(Source.id == source_id).first()
        if not source:
            return
        if source.ingestion_status != "approved":
            return

        participants = (
            db.query(ProjectParticipant)
            .filter_by(project_id=source.project_id)
            .all()
        )

        # Story 10.1: Email source handling
        if source.source_type == "email":
            from app.services.email_extractor import EmailExtractor

            extractor = EmailExtractor(db)
            extracted_items = extractor.extract(source, list(participants))

        # Story 10.2: Document source handling
        elif source.source_type == "document":
            from app.services.document_extractor import DocumentExtractor

            participant_dicts = [
                {
                    "name": p.name,
                    "email": p.email,
                    "discipline": p.discipline or "general",
                    "role": p.role or "",
                }
                for p in participants
            ]
            extractor = DocumentExtractor(db)
            extracted_items = extractor.extract(source, participant_dicts)

        else:
            # Existing meeting extraction (Story 7.1)
            from app.services.extraction_v2 import extract_items_from_transcript

            extracted_items = asyncio.run(
                extract_items_from_transcript(
                    transcript_text=source.raw_content or "",
                    participants=[
                        {"name": p.name, "discipline": p.discipline}
                        for p in participants
                    ],
                    project_id=str(source.project_id),
                    source_id=str(source.id),
                )
            )

        # Store extracted items
        for item_data in extracted_items:
            if isinstance(item_data, dict):
                item = ProjectItem(
                    project_id=source.project_id,
                    source_id=source.id,
                    source_type=source.source_type,
                    item_type=item_data.get("item_type", "information"),
                    statement=item_data.get("statement", ""),
                    decision_statement=item_data.get("statement", ""),
                    who=item_data.get("who", source.email_from or "Unknown"),
                    timestamp=str(source.occurred_at or ""),
                    discipline=",".join(
                        item_data.get("affected_disciplines", [])
                    )
                    or "general",
                    affected_disciplines=item_data.get(
                        "affected_disciplines", []
                    ),
                    owner=item_data.get("owner"),
                    why=item_data.get("context", "Extracted from source"),
                    consensus={},
                    confidence=item_data.get("confidence"),
                )
                db.add(item)

        source.ingestion_status = "processed"
        db.commit()
    except Exception as e:
        logger.error(f"Error processing source {source_id}: {e}")
        db.rollback()
    finally:
        db.close()
