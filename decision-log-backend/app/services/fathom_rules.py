"""Fathom routing rules per project (Story 13.16).

A rule says which webhook meetings belong to a project:

- ``title`` ``contains`` <text>
- ``participant_email`` ``equals`` <email>      (calendar invitees and the recorder)
- ``participant_domain`` ``equals`` <domain>    (the part after ``@``, or ``email_domain`` when sent)

Matching is case-insensitive and ignores surrounding whitespace. A project matches when any of its
rules matches (OR). The candidates are the projects the connection's user can write to that are not
archived; routing never resolves a conflict by itself.

The payload field names (``title``/``meeting_title``, ``calendar_invitees[].email``,
``calendar_invitees[].email_domain``, ``recorded_by.email``) are read defensively: a missing or
malformed field is simply no match, never an error.
"""

from dataclasses import dataclass, field as dc_field
from typing import Iterable, List, Optional, Set

from sqlalchemy.orm import Session

from app.database.models import Project, ProjectFathomRule
from app.services.access import WRITE, has_access, project_access_level

TITLE, EMAIL, DOMAIN = "title", "participant_email", "participant_domain"
FIELDS = (TITLE, EMAIL, DOMAIN)
OPERATORS = {TITLE: "contains", EMAIL: "equals", DOMAIN: "equals"}
MAX_VALUE_LENGTH = 200


class InvalidRule(ValueError):
    """The rule's value does not fit its field."""


def normalize(value: str) -> str:
    return " ".join(value.split()).lower()


def validate_value(field: str, value: str) -> str:
    """The value as stored (surrounding whitespace removed). Raises ``InvalidRule``."""
    if field not in FIELDS:
        raise InvalidRule("unknown field")
    cleaned = (value or "").strip()
    if not cleaned:
        raise InvalidRule("value is empty")
    if len(cleaned) > MAX_VALUE_LENGTH:
        raise InvalidRule(f"value is longer than {MAX_VALUE_LENGTH} characters")
    if field == DOMAIN and "@" in cleaned:
        raise InvalidRule("a domain has no @")
    if field == EMAIL and (cleaned.count("@") != 1 or cleaned.startswith("@") or cleaned.endswith("@")):
        raise InvalidRule("not an email address")
    if field in (EMAIL, DOMAIN) and any(c.isspace() for c in cleaned):
        raise InvalidRule("an email or domain has no spaces")
    return cleaned


# --------------------------------------------------------------------------- payload


@dataclass
class MeetingFacts:
    """What the rules look at, read from the webhook payload (all lower-case)."""

    title: str = ""
    emails: Set[str] = dc_field(default_factory=set)
    domains: Set[str] = dc_field(default_factory=set)


def _person_email(person) -> Optional[str]:
    if not isinstance(person, dict):
        return None
    email = person.get("email")
    if isinstance(email, str) and "@" in email.strip():
        return email.strip().lower()
    return None


def meeting_facts(payload) -> MeetingFacts:
    facts = MeetingFacts()
    if not isinstance(payload, dict):
        return facts
    for key in ("title", "meeting_title"):
        value = payload.get(key)
        if isinstance(value, str) and value.strip():
            facts.title = normalize(value)
            break
    people = payload.get("calendar_invitees")
    people = list(people) if isinstance(people, list) else []
    people.append(payload.get("recorded_by"))
    for person in people:
        email = _person_email(person)
        if email:
            facts.emails.add(email)
            facts.domains.add(email.rsplit("@", 1)[1])
        if isinstance(person, dict) and isinstance(person.get("email_domain"), str) and person["email_domain"].strip():
            facts.domains.add(person["email_domain"].strip().lower().lstrip("@"))
    return facts


def rule_matches(rule: ProjectFathomRule, facts: MeetingFacts) -> bool:
    value = normalize(rule.value or "")
    if not value:
        return False
    if rule.field == TITLE:
        return value in facts.title
    if rule.field == EMAIL:
        return value in facts.emails
    if rule.field == DOMAIN:
        return value.lstrip("@") in facts.domains
    return False


# --------------------------------------------------------------------------- routing


def candidate_projects(db: Session, user) -> List[Project]:
    """Projects with at least one rule that ``user`` can write to and that are not archived."""
    with_rules = db.query(ProjectFathomRule.project_id).distinct()
    projects = db.query(Project).filter(Project.id.in_(with_rules), Project.archived_at.is_(None)).all()
    return [p for p in projects if has_access(project_access_level(db, user, p), WRITE)]


def matching_projects(db: Session, user, payload) -> List[Project]:
    """The candidate projects whose rules match the meeting, sorted by name."""
    facts = meeting_facts(payload)
    candidates = candidate_projects(db, user)
    if not candidates:
        return []
    rules = db.query(ProjectFathomRule).filter(ProjectFathomRule.project_id.in_([p.id for p in candidates])).all()
    matched_ids = {str(r.project_id) for r in rules if rule_matches(r, facts)}
    return sorted((p for p in candidates if str(p.id) in matched_ids), key=lambda p: (p.name or "").lower())


def rules_of(db: Session, project_id) -> Iterable[ProjectFathomRule]:
    return (
        db.query(ProjectFathomRule)
        .filter(ProjectFathomRule.project_id == project_id)
        .order_by(ProjectFathomRule.created_at, ProjectFathomRule.id)
        .all()
    )
