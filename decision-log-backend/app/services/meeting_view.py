"""Meeting data for the Promem revamp (REVAMP-MAPPING G3, G4).

- Transcripts are stored as "M:SS - Name" turn headers; uncertain speakers as "⚠️ Name [reason]".
  Speaker corrections are applied when the transcript is served (the stored text never changes).
- Candidates for an uncertain turn: the meeting's participants, else the project's participants.
- The project's meetings list with item counts per type.
"""

import re
from typing import Dict, Iterable, List, Optional

from sqlalchemy.orm import Session

from app.database.models import ProjectItem, ProjectParticipant, Source, TranscriptSpeakerCorrection
from app.services.access import visible_items_filter, visible_sources_filter
from app.services.extraction_runs import active_items_filter

TURN_HEADER = re.compile(r"^(\d+):(\d{2})(?::(\d{2}))? - (⚠️ )?(.+?)(?: \[(.*)\])?$")
MEETING_STATUSES = ("approved", "processed")


def participant_names(participants) -> List[str]:
    """Display names from stored participants: strings (uploads, Tactiq) or ``{name, email}`` (Fathom)."""
    names: List[str] = []
    for entry in participants or []:
        if isinstance(entry, str):
            name = entry.strip()
        elif isinstance(entry, dict):
            name = (entry.get("name") or entry.get("email") or "").strip()
        else:
            name = ""
        if name and name not in names:
            names.append(name)
    return names


def _turn_start(match: re.Match) -> int:
    a, b, c = match.group(1), match.group(2), match.group(3)
    return int(a) * 60 + int(b) if c is None else int(a) * 3600 + int(b) * 60 + int(c)


def apply_speaker_corrections(transcript: Optional[str], corrections: Dict[int, str]) -> Optional[str]:
    """Rewrite the header of each corrected turn as a certain speaker (drops "⚠️" and the reason)."""
    if not transcript or not corrections:
        return transcript
    lines = []
    for line in transcript.split("\n"):
        match = TURN_HEADER.match(line.rstrip())
        if match and _turn_start(match) in corrections:
            timestamp = line.split(" - ", 1)[0]
            line = f"{timestamp} - {corrections[_turn_start(match)]}"
        lines.append(line)
    return "\n".join(lines)


def corrections_for(db: Session, source_id) -> Dict[int, str]:
    rows = db.query(TranscriptSpeakerCorrection).filter(TranscriptSpeakerCorrection.source_id == source_id).all()
    return {row.turn_start: row.speaker for row in rows}


def speaker_candidates(db: Session, source: Source) -> List[str]:
    names = participant_names(source.participants)
    if names:
        return names
    rows = db.query(ProjectParticipant).filter(ProjectParticipant.project_id == source.project_id).order_by(ProjectParticipant.name).all()
    return [r.name for r in rows if r.name]


def item_counts(db: Session, user, source_ids: Iterable) -> Dict[str, Dict[str, int]]:
    """{source_id: {item_type: count}} over the items the user can see."""
    ids = list(source_ids)
    if not ids:
        return {}
    items = (
        db.query(ProjectItem.source_id, ProjectItem.item_type)
        .filter(ProjectItem.source_id.in_(ids), visible_items_filter(user), active_items_filter())
        .all()
    )
    counts: Dict[str, Dict[str, int]] = {}
    for source_id, item_type in items:
        by_type = counts.setdefault(str(source_id), {})
        by_type[item_type] = by_type.get(item_type, 0) + 1
    return counts


def project_meetings(db: Session, user, project_id) -> List[Source]:
    """Approved / processed meetings of the project the user can see, newest first."""
    return (
        db.query(Source)
        .filter(
            Source.project_id == project_id,
            Source.source_type == "meeting",
            Source.ingestion_status.in_(MEETING_STATUSES),
            visible_sources_filter(user),
        )
        .order_by(Source.occurred_at.desc())
        .all()
    )
