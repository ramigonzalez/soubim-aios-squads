"""Promem revamp Phase 4e: Notificações, computed on read.

Nothing is fanned out when things happen: each request derives the user's notifications of the
last ``WINDOW_DAYS`` from the data, through the same visibility rules as the lists they link to,
so nobody is ever told about something they can't open. Only the read state is stored
(``users.notifications_seen_at`` for "Marcar todas como lidas", ``notification_reads`` per row).

Events (none for the user's own actions):
- ``pending_source``: a source arrived in the Ingestão of a project the user reviews.
- ``extracted``: items extracted from a source (meetings, e-mails, documents) appeared in a project
  the user can see — one row per source, with the count.
- ``milestone``: someone marked an item as marco.
"""

from datetime import datetime, timedelta
from typing import Dict, Iterable, List, Optional

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.database.models import NotificationRead, Project, ProjectItem, Source, User
from app.services.access import can_review_items, guest_project_ids, visible_items_filter, visible_sources_filter
from app.services.extraction_runs import active_items_filter

WINDOW_DAYS = 14
LIMIT = 50


def _iso(value: Optional[datetime]) -> Optional[str]:
    return value.isoformat() if value else None


def _not_mine(column, user):
    return or_(column.is_(None), column != user.id)


def _pending_sources(db: Session, user, since: datetime) -> List[dict]:
    rows = (
        db.query(Source, Project)
        .join(Project, Project.id == Source.project_id)
        .filter(
            Source.ingestion_status == "pending",
            Source.created_at >= since,
            visible_sources_filter(user),
            Source.project_id.notin_(guest_project_ids(user)),
            _not_mine(Source.created_by, user),
        )
        .order_by(Source.created_at.desc())
        .limit(LIMIT)
        .all()
    )
    reviewer: Dict[str, bool] = {}
    events = []
    for source, project in rows:
        key = str(project.id)
        if key not in reviewer:
            reviewer[key] = can_review_items(db, user, project)
        if not reviewer[key]:
            continue
        events.append({
            "key": f"pending:{source.id}",
            "kind": "pending_source",
            "at": source.created_at,
            "project": {"id": str(project.id), "name": project.name},
            "source": {"id": str(source.id), "type": source.source_type, "title": source.title},
        })
    return events


def _extracted(db: Session, user, since: datetime) -> List[dict]:
    grouped = (
        db.query(ProjectItem.source_id, func.count(ProjectItem.id), func.max(ProjectItem.created_at))
        .filter(
            visible_items_filter(user),
            active_items_filter(),
            ProjectItem.source_id.isnot(None),
            ProjectItem.created_at >= since,
            _not_mine(ProjectItem.created_by, user),
        )
        .group_by(ProjectItem.source_id)
        .order_by(func.max(ProjectItem.created_at).desc())
        .limit(LIMIT)
        .all()
    )
    if not grouped:
        return []
    sources = {
        str(s.id): (s, p)
        for s, p in db.query(Source, Project).join(Project, Project.id == Source.project_id).filter(Source.id.in_([g[0] for g in grouped]))
    }
    events = []
    for source_id, count, last in grouped:
        source, project = sources[str(source_id)]
        events.append({
            "key": f"extracted:{source_id}:{last.isoformat()}",
            "kind": "extracted",
            "at": last,
            "count": count,
            "project": {"id": str(project.id), "name": project.name},
            "source": {"id": str(source.id), "type": source.source_type, "title": source.title},
        })
    return events


def _milestones(db: Session, user, since: datetime) -> List[dict]:
    rows = (
        db.query(ProjectItem, Project.name, User.name)
        .join(Project, Project.id == ProjectItem.project_id)
        .outerjoin(User, User.id == ProjectItem.milestone_by)
        .filter(
            visible_items_filter(user),
            active_items_filter(),
            ProjectItem.is_milestone.is_(True),
            ProjectItem.milestone_at >= since,
            _not_mine(ProjectItem.milestone_by, user),
        )
        .order_by(ProjectItem.milestone_at.desc())
        .limit(LIMIT)
        .all()
    )
    return [
        {
            "key": f"milestone:{item.id}:{item.milestone_at.isoformat()}",
            "kind": "milestone",
            "at": item.milestone_at,
            "by": by,
            "project": {"id": str(item.project_id), "name": name},
            "item": {"id": str(item.id), "type": item.item_type, "title": item.title or item.statement},
        }
        for item, name, by in rows
    ]


def notifications(db: Session, user, now: Optional[datetime] = None) -> dict:
    now = now or datetime.utcnow()
    since = now - timedelta(days=WINDOW_DAYS)
    events = sorted(
        _pending_sources(db, user, since) + _extracted(db, user, since) + _milestones(db, user, since),
        key=lambda e: e["at"],
        reverse=True,
    )[:LIMIT]
    seen = db.query(User.notifications_seen_at).filter(User.id == user.id).scalar()
    keys = [e["key"] for e in events]
    read = {k for (k,) in db.query(NotificationRead.key).filter(NotificationRead.user_id == user.id, NotificationRead.key.in_(keys))} if keys else set()
    for event in events:
        event["read"] = event["key"] in read or (seen is not None and event["at"] <= seen)
        event["at"] = _iso(event["at"])
    return {"notifications": events, "unread": sum(1 for e in events if not e["read"])}


def mark_read(db: Session, user, keys: Iterable[str]) -> None:
    now = datetime.utcnow()
    existing = {k for (k,) in db.query(NotificationRead.key).filter(NotificationRead.user_id == user.id)}
    for key in set(keys) - existing:
        db.add(NotificationRead(user_id=user.id, key=key[:120], read_at=now))
    db.commit()


def mark_all_read(db: Session, user) -> None:
    db.query(User).filter(User.id == user.id).update({User.notifications_seen_at: datetime.utcnow()})
    # single reads before "all" are covered by the timestamp now
    db.query(NotificationRead).filter(NotificationRead.user_id == user.id).delete()
    db.commit()
