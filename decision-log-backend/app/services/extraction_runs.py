"""Extraction versions (Story 13.7).

Every extraction of a meeting is stored as an ``ExtractionRun``; its items carry the run's
id. One run per source is active and only its items are listed. Items without a run
(manual items, email/document items) are always listed.
"""

import hashlib
from typing import Any, Dict, List, Optional

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.database.models import ExtractionRun, ProjectItem, Source
from app.services.prompt_loader import PROMPTS_DIR


def active_items_filter():
    """SQL condition on ``ProjectItem``: not from a run, or from its source's active run.

    Add it to every query that lists or counts items.
    """
    return or_(
        ProjectItem.extraction_run_id.is_(None),
        ProjectItem.extraction_run_id.in_(select(ExtractionRun.id).where(ExtractionRun.is_active.is_(True))),
    )


def prompt_version(name: str = "extract_meeting") -> Optional[str]:
    """Short hash of the prompt file, to tell runs made with different prompts apart."""
    path = PROMPTS_DIR / f"{name}.md"
    if not path.exists():
        return None
    return hashlib.sha256(path.read_bytes()).hexdigest()[:12]


def _set_active(db: Session, source: Source, run: ExtractionRun) -> None:
    """Make ``run`` the source's only active run and restore its summary (no commit).

    The old run is deactivated by a bulk UPDATE issued before the new one is flagged, so the
    one-active-run unique index is never violated inside the transaction.
    """
    db.query(ExtractionRun).filter(
        ExtractionRun.source_id == source.id, ExtractionRun.id != run.id, ExtractionRun.is_active.is_(True)
    ).update({ExtractionRun.is_active: False}, synchronize_session="fetch")
    run.is_active = True
    if run.meeting_summary:
        source.ai_summary = run.meeting_summary


def create_run(
    db: Session,
    source: Source,
    items: List[Dict[str, Any]],
    *,
    model: Optional[str] = None,
    meeting_summary: Optional[str] = None,
    input_tokens: Optional[int] = None,
    output_tokens: Optional[int] = None,
    created_by: Optional[Any] = None,
    activate: bool = True,
) -> ExtractionRun:
    """Store a new run for ``source`` (next version number); active by default. No commit.

    ``items`` are the validated item dicts; the caller attaches ``run.id`` to the ProjectItems.
    """
    latest = db.query(func.max(ExtractionRun.version)).filter(ExtractionRun.source_id == source.id).scalar() or 0
    run = ExtractionRun(
        source_id=source.id,
        version=latest + 1,
        created_by=created_by,
        model=model,
        prompt_version=prompt_version(),
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        meeting_summary=meeting_summary,
        raw_output={"items": items},
        is_active=False,
    )
    db.add(run)
    db.flush()
    if activate:
        _set_active(db, source, run)
        db.flush()
    return run


def activate_run(db: Session, source: Source, run: ExtractionRun) -> ExtractionRun:
    """Switch the source's active run (rollback / roll forward) in one transaction."""
    if run.source_id != source.id:
        raise ValueError("Run does not belong to this source")
    _set_active(db, source, run)
    db.commit()
    return run
