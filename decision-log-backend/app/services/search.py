"""Promem revamp Phase 4d: global search (⌘K) across the projects, items and meetings the user can see.

Every word of the query must appear (in any order) in one of the searched fields; matching ignores
case and, on PostgreSQL, accents ("fundacao" finds "Fundação"). Results respect exactly the same
rules as the lists they link to: readable projects, visible + reviewable items of the active
extraction run, approved meetings the user's organization may see.
"""

import unicodedata
from typing import List, Optional

from sqlalchemy import and_, func, or_
from sqlalchemy.orm import Session

from app.database.models import Project, ProjectItem, Source
from app.services.access import accessible_projects_filter, visible_items_filter, visible_sources_filter
from app.services.extraction_runs import active_items_filter
from app.services.meeting_view import MEETING_STATUSES

MIN_QUERY = 2
MAX_TERMS = 6
ACCENTED = "áàâãäéèêëíìîïóòôõöúùûüçñ"
PLAIN = "aaaaaeeeeiiiiooooouuuucn"


def normalize(text: str) -> str:
    """Lower case without accents ("Fundação" → "fundacao")."""
    decomposed = unicodedata.normalize("NFD", text.lower())
    return "".join(c for c in decomposed if unicodedata.category(c) != "Mn")


def terms_of(query: str) -> List[str]:
    return [t for t in normalize(query).split() if t][:MAX_TERMS]


def _escape(term: str) -> str:
    return term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def _folded(db: Session, column):
    if db.bind is not None and db.bind.dialect.name == "postgresql":
        return func.translate(func.lower(column), ACCENTED, PLAIN)
    return func.lower(column)


def _matches(db: Session, terms: List[str], columns) -> Optional[object]:
    """Every term in at least one of the columns."""
    folded = [_folded(db, func.coalesce(c, "")) for c in columns]
    return and_(*[or_(*[f.like(f"%{_escape(t)}%", escape="\\") for f in folded]) for t in terms])


def search(db: Session, user, query: str, limit: int = 5) -> dict:
    terms = terms_of(query or "")
    empty = {"query": query, "projects": [], "items": [], "meetings": []}
    if not terms or len(" ".join(terms)) < MIN_QUERY:
        return empty
    limit = max(1, min(limit, 20))

    projects = (
        db.query(Project)
        .filter(accessible_projects_filter(user), _matches(db, terms, [Project.name, Project.description]))
        # active projects first, then by name
        .order_by(Project.archived_at.isnot(None), Project.name)
        .limit(limit + 1)
        .all()
    )

    items = (
        db.query(ProjectItem, Project.name)
        .join(Project, Project.id == ProjectItem.project_id)
        .filter(
            visible_items_filter(user),
            active_items_filter(),
            _matches(db, terms, [ProjectItem.title, ProjectItem.statement, ProjectItem.who]),
        )
        .order_by(func.coalesce(ProjectItem.occurred_at, ProjectItem.created_at).desc())
        .limit(limit + 1)
        .all()
    )

    meetings = (
        db.query(Source, Project.name)
        .join(Project, Project.id == Source.project_id)
        .filter(
            Source.source_type == "meeting",
            Source.ingestion_status.in_(MEETING_STATUSES),
            visible_sources_filter(user),
            _matches(db, terms, [Source.title]),
        )
        .order_by(Source.occurred_at.desc())
        .limit(limit + 1)
        .all()
    )

    def iso(value):
        return value.isoformat() if value else None

    return {
        "query": query,
        "projects": [
            {"id": str(p.id), "name": p.name, "description": p.description, "archived": p.archived_at is not None}
            for p in projects[:limit]
        ],
        "items": [
            {
                "id": str(i.id),
                "project_id": str(i.project_id),
                "project_name": name,
                "title": i.title,
                "statement": i.statement,
                "item_type": i.item_type,
                "source_type": i.source_type,
                "is_milestone": bool(i.is_milestone),
                "is_done": bool(i.is_done),
                "affected_disciplines": i.affected_disciplines or [],
                "date": iso(i.occurred_at or i.created_at),
            }
            for i, name in items[:limit]
        ],
        "meetings": [
            {"id": str(s.id), "project_id": str(s.project_id), "project_name": name, "title": s.title, "occurred_at": iso(s.occurred_at)}
            for s, name in meetings[:limit]
        ],
        "more": {"projects": len(projects) > limit, "items": len(items) > limit, "meetings": len(meetings) > limit},
    }
