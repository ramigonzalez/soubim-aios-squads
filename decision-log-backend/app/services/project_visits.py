"""Per-user project visits (Promem revamp, REVAMP-MAPPING G1).

"Novos desde sua última visita" needs the user's visit *before* the current session: opening a
project several times in a row must not reset what counts as new. Visits less than
``VISIT_SESSION_MINUTES`` apart are one session.
"""

from datetime import datetime, timedelta
from typing import Dict, Iterable, Optional, Tuple

from sqlalchemy.orm import Session

from app.database.models import ProjectVisit

VISIT_SESSION_MINUTES = 30
# Without a recorded visit, "new" means created in the last week.
NEW_ITEMS_FALLBACK_DAYS = 7

LAST_VISIT = "last_visit"
LAST_7_DAYS = "last_7_days"


def _session_gap() -> timedelta:
    return timedelta(minutes=VISIT_SESSION_MINUTES)


def visit_since(visit: Optional[ProjectVisit], now: datetime) -> Optional[datetime]:
    """The visit that defines "new" for ``now``: the last visit when it was in an earlier session,
    otherwise (still inside the current session) the visit before it."""
    if visit is None:
        return None
    if now - visit.last_seen_at > _session_gap():
        return visit.last_seen_at
    return visit.previous_seen_at


def new_items_cutoff(visit: Optional[ProjectVisit], now: datetime) -> Tuple[datetime, str]:
    """(cutoff, basis): items created after ``cutoff`` are new. Falls back to the last 7 days."""
    since = visit_since(visit, now)
    if since is not None:
        return since, LAST_VISIT
    return now - timedelta(days=NEW_ITEMS_FALLBACK_DAYS), LAST_7_DAYS


def record_visit(db: Session, user_id, project_id, now: Optional[datetime] = None) -> ProjectVisit:
    """Record that ``user_id`` opened ``project_id``. A visit after a gap starts a new session and
    moves the old ``last_seen_at`` to ``previous_seen_at``."""
    now = now or datetime.utcnow()
    visit = db.query(ProjectVisit).filter_by(user_id=user_id, project_id=project_id).one_or_none()
    if visit is None:
        visit = ProjectVisit(user_id=user_id, project_id=project_id, last_seen_at=now, previous_seen_at=None)
        db.add(visit)
    else:
        if now - visit.last_seen_at > _session_gap():
            visit.previous_seen_at = visit.last_seen_at
        visit.last_seen_at = now
    db.commit()
    db.refresh(visit)
    return visit


def visits_by_project(db: Session, user_id, project_ids: Iterable) -> Dict[str, ProjectVisit]:
    """The user's visit rows for these projects, keyed by project id string."""
    ids = list(project_ids)
    if not ids:
        return {}
    rows = db.query(ProjectVisit).filter(ProjectVisit.user_id == user_id, ProjectVisit.project_id.in_(ids)).all()
    return {str(row.project_id): row for row in rows}
