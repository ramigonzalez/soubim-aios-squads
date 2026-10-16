"""Similar items for the item panel's "Similares" tab (Promem revamp, REVAMP-MAPPING G11).

Candidates are the other items of the project the user can see. Each one gets a reason the UI
shows next to it:
- ``same_source``: extracted from the same meeting / e-mail / document
- ``same_discipline``: shares at least one discipline
- ``similar_topic``: embeddings (all-MiniLM-L6-v2) are close, even without either of the above

Ranking: embedding similarity when both items have one, plus a small bonus for the same source
and shared disciplines, so related items rank first even before embeddings exist.
"""

import math
from typing import List, Optional, Sequence, Tuple

from sqlalchemy.orm import Session

from app.database.models import ProjectItem
from app.services.access import visible_items_filter
from app.services.extraction_runs import active_items_filter

SAME_SOURCE = "same_source"
SAME_DISCIPLINE = "same_discipline"
SIMILAR_TOPIC = "similar_topic"

DEFAULT_LIMIT = 5
# Below this cosine similarity, an item with no shared source or discipline is not "similar".
TOPIC_THRESHOLD = 0.55


def _vector(value) -> Optional[List[float]]:
    if value is None:
        return None
    try:
        vector = [float(x) for x in value]
    except TypeError:
        return None
    return vector or None


def cosine(a: Optional[Sequence[float]], b: Optional[Sequence[float]]) -> Optional[float]:
    if not a or not b or len(a) != len(b):
        return None
    dot = sum(x * y for x, y in zip(a, b))
    norm = math.sqrt(sum(x * x for x in a)) * math.sqrt(sum(y * y for y in b))
    return dot / norm if norm else None


def _disciplines(item: ProjectItem) -> set:
    return set(item.affected_disciplines or ([item.discipline] if item.discipline else []))


def similar_items(db: Session, user, item: ProjectItem, limit: int = DEFAULT_LIMIT) -> List[Tuple[ProjectItem, str, float]]:
    """(item, reason, score) for the items most similar to ``item``, best first."""
    candidates = (
        db.query(ProjectItem)
        .filter(
            ProjectItem.project_id == item.project_id,
            ProjectItem.id != item.id,
            visible_items_filter(user),
            active_items_filter(),
        )
        .all()
    )
    base_vector = _vector(item.embedding)
    base_disciplines = _disciplines(item)
    scored = []
    for other in candidates:
        same_source = item.source_id is not None and other.source_id == item.source_id
        shared = bool(base_disciplines & _disciplines(other))
        similarity = cosine(base_vector, _vector(other.embedding))
        if same_source:
            reason = SAME_SOURCE
        elif shared:
            reason = SAME_DISCIPLINE
        elif similarity is not None and similarity >= TOPIC_THRESHOLD:
            reason = SIMILAR_TOPIC
        else:
            continue
        score = (similarity or 0.0) + (0.3 if same_source else 0.0) + (0.15 if shared else 0.0)
        scored.append((other, reason, score))
    scored.sort(key=lambda entry: (entry[2], entry[0].created_at), reverse=True)
    return scored[:limit]
