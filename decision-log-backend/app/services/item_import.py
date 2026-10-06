"""Import pre-extracted items (extract_meeting.md output format) into a Source (Story 7.10).

Used when extraction runs outside the backend — e.g. the prompt is run through the
Claude Code CLI — and the resulting JSON must be stored as ProjectItems linked to the
meeting Source, keeping every field the prompt produces (why, causation, consensus,
impacts, timestamp, due_date).
"""

import logging
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy.orm import Session

from app.database.models import ProjectItem, Source
from app.services.extraction_runs import create_run
from app.services.extraction_v2 import _validate_item

logger = logging.getLogger(__name__)

IMPORTABLE_SOURCE_TYPES = {"meeting", "manual_input"}

# Field that carries the "why"/context for each non-decision item type.
_CONTEXT_FIELD = {
    "topic": "discussion_points",
    "idea": "related_topic",
    "information": "reference_source",
}


def _parse_due_date(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value)
    except (TypeError, ValueError):
        logger.warning(f"Ignoring unparseable due_date: {value!r}")
        return None


def build_project_item(source: Source, item: Dict[str, Any], run_id: Optional[Any] = None) -> ProjectItem:
    """Map one validated item dict to a ProjectItem linked to ``source`` (and to its extraction run)."""
    item_type = item["item_type"]
    disciplines = item["affected_disciplines"]
    why = item.get("why") if item_type == "decision" else item.get(_CONTEXT_FIELD.get(item_type, ""))
    return ProjectItem(
        project_id=source.project_id,
        source_id=source.id,
        extraction_run_id=run_id,
        source_type=source.source_type,
        item_type=item_type,
        statement=item["statement"],
        decision_statement=item["statement"],
        title=item.get("title"),
        source_excerpt=item.get("source_excerpt"),
        who=item["who"][:255],
        timestamp=(item.get("timestamp") or None) and str(item["timestamp"])[:20],
        affected_disciplines=disciplines,
        discipline=",".join(disciplines)[:100],
        why=why or "",
        causation=item.get("causation"),
        consensus=item.get("consensus") or {},
        impacts=item.get("impacts"),
        owner=item.get("owner"),
        due_date=_parse_due_date(item.get("due_date")),
        is_done=bool(item.get("is_done", False)),
        confidence=item.get("confidence"),
    )


def import_items(
    db: Session,
    source: Source,
    items: List[Dict[str, Any]],
    approver_id: Optional[Any] = None,
    replace: bool = False,
    meeting_summary: Optional[str] = None,
    model: Optional[str] = None,
) -> Tuple[List[ProjectItem], int]:
    """Validate ``items`` and store them as a new extraction run of ``source``; mark it processed.

    Story 13.7: ``replace`` no longer deletes anything — the items become a new active run and
    the previous run stays available as a version.

    ``meeting_summary`` (the prompt's top-level summary) is stored as the Source's ai_summary.

    Returns (created items, number of items skipped by validation). Does not commit.
    Raises ValueError if the source type is not importable, or if the source already
    has items and ``replace`` is False.
    """
    if source.source_type not in IMPORTABLE_SOURCE_TYPES:
        raise ValueError(f"Source type '{source.source_type}' is not importable")

    existing = db.query(ProjectItem).filter(ProjectItem.source_id == source.id).count()
    if existing and not replace:
        raise ValueError(f"Source {source.id} already has {existing} items (use replace to add a new version)")

    validated_items, skipped = [], 0
    for raw in items:
        validated = _validate_item(raw) if isinstance(raw, dict) else None
        if validated is None:
            skipped += 1
            continue
        # _validate_item keeps only known fields; restore is_done from the input.
        validated["is_done"] = bool(raw.get("is_done", False))
        validated_items.append(validated)

    summary = meeting_summary.strip() if meeting_summary and meeting_summary.strip() else None
    run = create_run(
        db, source, validated_items, model=model, meeting_summary=summary, created_by=approver_id
    )
    created = [build_project_item(source, v, run.id) for v in validated_items]
    db.add_all(created)

    source.included = True
    source.ingestion_status = "processed"
    source.extraction_error = None
    if approver_id is not None:
        source.approved_by = approver_id
    if source.approved_at is None:
        source.approved_at = datetime.utcnow()
    return created, skipped
