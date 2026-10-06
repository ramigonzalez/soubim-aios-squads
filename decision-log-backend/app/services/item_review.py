"""Item review helpers (Story 12.6): keep the AI's values when a reviewer edits an item, restore them."""

from datetime import datetime
from typing import Any, Dict

from app.database.models import ProjectItem

# Fields a reviewer can edit (and that ``original`` keeps)
EDITABLE_FIELDS = ("title", "statement", "why", "owner", "due_date")


def _value(item: ProjectItem, field: str) -> Any:
    value = getattr(item, field)
    return value.isoformat() if isinstance(value, datetime) else value


def _set(item: ProjectItem, field: str, value: Any) -> None:
    if field == "statement":
        item.statement = value
        item.decision_statement = value
    elif field == "why":
        item.why = value or ""
    else:
        setattr(item, field, value)


def capture_original(item: ProjectItem) -> None:
    """Store the item's current values as its ``original`` the first time it is edited."""
    if item.original is None:
        item.original = {field: _value(item, field) for field in EDITABLE_FIELDS}


def apply_edits(item: ProjectItem, edits: Dict[str, Any]) -> None:
    """Apply ``edits`` (only fields in ``EDITABLE_FIELDS``); the AI's original is kept once."""
    capture_original(item)
    for field, value in edits.items():
        if field in EDITABLE_FIELDS:
            _set(item, field, value)


def restore_original(item: ProjectItem) -> bool:
    """Put the AI's original values back and forget the edit. False when the item was never edited."""
    if item.original is None:
        return False
    for field in EDITABLE_FIELDS:
        if field not in item.original:
            continue
        value = item.original[field]
        if field == "due_date":
            value = datetime.fromisoformat(value) if value else None
        _set(item, field, value)
    item.original = None
    return True
