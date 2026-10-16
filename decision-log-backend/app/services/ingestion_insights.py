"""What the Ingestão decision panel shows about a pending source (Promem revamp G2).

Computed when the inbox is read, from what is already stored, so it also covers sources that
arrived before this existed:
- ``routing``: why the source is in its project, and how sure we are (high · medium · low)
- ``flags``: external participants, a possible duplicate, a low-confidence match
- ``preview``: a few lines of the transcript, e-mail or document
- ``participants``: display names
"""

import re
from datetime import timedelta
from typing import Dict, List, Optional, Set

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database.models import OrganizationMember, ProjectFathomRule, ProjectParticipant, Source, User
from app.services import fathom_rules
from app.services.meeting_view import TURN_HEADER, participant_names

HIGH, MEDIUM, LOW = "high", "medium", "low"
PREVIEW_LINES = 3
PREVIEW_CHARS = 220


def _emails_of(source: Source) -> List[str]:
    """Participant e-mails: Fathom invitees ({name, email}) or the e-mail's from / to / cc."""
    emails: List[str] = []
    for entry in source.participants or []:
        if isinstance(entry, dict) and isinstance(entry.get("email"), str) and "@" in entry["email"]:
            emails.append(entry["email"].strip().lower())
    for value in [source.email_from, *(source.email_to or []), *(source.email_cc or [])]:
        if isinstance(value, str):
            match = re.search(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+", value)
            if match:
                emails.append(match.group(0).lower())
    return list(dict.fromkeys(emails))


def _project_people(db: Session, project_id) -> List[ProjectParticipant]:
    return db.query(ProjectParticipant).filter(ProjectParticipant.project_id == project_id).all()


def _firm_domains(db: Session, organization_id) -> Set[str]:
    """E-mail domains of the owning organization's members (an "internal" address)."""
    if organization_id is None:
        return set()
    emails = (
        db.query(User.email)
        .join(OrganizationMember, OrganizationMember.user_id == User.id)
        .filter(OrganizationMember.organization_id == organization_id, OrganizationMember.role != "external")
        .all()
    )
    return {e.rsplit("@", 1)[1].lower() for (e,) in emails if e and "@" in e}


def routing(db: Session, source: Source) -> Dict:
    """{confidence, reasons: [{code, ...}]} — why the source belongs to its project."""
    reasons: List[Dict] = []
    deterministic = False
    project = source.project

    if source.source_type == "document" and source.drive_file_id and project is not None and project.drive_folder_id:
        reasons.append({"code": "drive_folder"})
        deterministic = True

    if source.source_type == "meeting":
        facts = fathom_rules.MeetingFacts(title=fathom_rules.normalize(source.title or ""))
        for email in _emails_of(source):
            facts.emails.add(email)
            facts.domains.add(email.rsplit("@", 1)[1])
        rules = db.query(ProjectFathomRule).filter(ProjectFathomRule.project_id == source.project_id).all()
        for rule in rules:
            if fathom_rules.rule_matches(rule, facts):
                reasons.append({"code": "fathom_rule", "field": rule.field, "operator": rule.operator, "value": rule.value})
                deterministic = True

    if source.created_by is not None and source.creator is not None:
        reasons.append({"code": "manual", "who": source.creator.name})
        deterministic = True
    elif source.source_type == "meeting" and source.webhook_id and source.source_label in (None, "", "Tactiq", "Fireflies"):
        reasons.append({"code": "webhook", "tool": source.source_label or "Tactiq"})
        deterministic = True

    people = _project_people(db, source.project_id)
    if source.source_type == "email":
        sender = next((e for e in _emails_of(source)[:1]), None)
        participant = next((p for p in people if p.email and sender and p.email.lower() == sender), None)
        if participant:
            reasons.append({"code": "email_participant", "who": participant.name})
            deterministic = True
        if source.email_thread_id:
            earlier = (
                db.query(Source.id)
                .filter(
                    Source.project_id == source.project_id,
                    Source.email_thread_id == source.email_thread_id,
                    Source.id != source.id,
                    Source.ingestion_status.in_(["approved", "processed"]),
                )
                .first()
            )
            if earlier:
                reasons.append({"code": "email_thread"})
                deterministic = True

    if source.source_type in ("meeting", "email"):
        # one entry per person: (name, email); e-mail sources only have addresses
        attendees = []
        for entry in source.participants or []:
            if isinstance(entry, dict):
                attendees.append(((entry.get("name") or "").strip().lower(), (entry.get("email") or "").strip().lower()))
            elif isinstance(entry, str) and entry.strip():
                attendees.append((entry.strip().lower(), ""))
        if source.source_type == "email":
            attendees = [("", email) for email in _emails_of(source)]
        if attendees:
            team_names = {p.name.lower() for p in people if p.name}
            team_emails = {p.email.lower() for p in people if p.email}
            count = sum(1 for name, email in attendees if (name and name in team_names) or (email and email in team_emails))
            if count:
                reasons.append({"code": "participants_overlap", "count": count, "total": len(attendees)})

    if project is not None and project.name and source.title and project.name.lower() in source.title.lower():
        reasons.append({"code": "title_match", "term": project.name})

    if deterministic:
        confidence = HIGH
    elif reasons:
        confidence = MEDIUM
    else:
        confidence = LOW
    return {"confidence": confidence, "reasons": reasons}


def flags(db: Session, source: Source, confidence: str) -> List[Dict]:
    """Boxes above the summary: [{kind: info | warn, code, ...}]."""
    result: List[Dict] = []

    # External participants: e-mails outside the firm's domains, or roster people marked as client
    domains = _firm_domains(db, source.owner_organization_id)
    externals: List[str] = []
    if domains:
        names_by_email = {}
        for entry in source.participants or []:
            if isinstance(entry, dict) and entry.get("email"):
                names_by_email[entry["email"].strip().lower()] = (entry.get("name") or entry["email"]).strip()
        for email in _emails_of(source):
            if email.rsplit("@", 1)[1] not in domains:
                externals.append(names_by_email.get(email, email))
    if not externals:
        clients = {p.name.lower(): p.name for p in _project_people(db, source.project_id) if p.name and (p.discipline == "client" or (p.role or "").lower() in ("client", "cliente"))}
        externals = [clients[n.lower()] for n in participant_names(source.participants) if n.lower() in clients]
    if externals:
        result.append({"kind": "info", "code": "external", "count": len(externals), "names": externals[:4]})

    # Possible duplicate: same kind and title within a day, or the same e-mail thread already in the project
    if source.title and source.occurred_at:
        window = timedelta(days=1)
        twin = (
            db.query(Source)
            .filter(
                Source.project_id == source.project_id,
                Source.id != source.id,
                Source.source_type == source.source_type,
                func.lower(Source.title) == source.title.lower(),
                Source.occurred_at.between(source.occurred_at - window, source.occurred_at + window),
                Source.ingestion_status != "rejected",
            )
            .first()
        )
        if twin is not None:
            result.append({"kind": "warn", "code": "duplicate", "title": twin.title, "date": twin.occurred_at.isoformat()})

    if confidence == LOW:
        result.append({"kind": "warn", "code": "lowConfidence"})
    return result


def preview(source: Source) -> List[Dict]:
    """A few lines of the source: transcript turns, the e-mail header and text, or document text."""
    text = source.raw_content or ""
    lines: List[Dict] = []
    if source.source_type == "meeting":
        current: Optional[Dict] = None
        for raw in text.split("\n"):
            match = TURN_HEADER.match(raw.rstrip())
            if match:
                if current and current["text"]:
                    lines.append(current)
                    if len(lines) >= PREVIEW_LINES:
                        break
                current = {"at": raw.split(" - ", 1)[0].strip(), "who": match.group(5).split(" (")[0], "text": ""}
            elif current is not None and raw.startswith("  "):
                current["text"] = f"{current['text']} {raw.strip()}".strip()[:PREVIEW_CHARS]
        if current and current["text"] and len(lines) < PREVIEW_LINES:
            lines.append(current)
        if not lines and text.strip():
            lines.append({"at": None, "who": None, "text": " ".join(text.split())[:PREVIEW_CHARS]})
    elif source.source_type == "email":
        recipients = ", ".join([*(source.email_to or []), *(source.email_cc or [])][:4])
        lines.append({"at": None, "who": "from_to", "text": f"{source.email_from or ''} → {recipients}".strip()})
        body = " ".join(text.split())
        if body:
            lines.append({"at": None, "who": "text", "text": body[:PREVIEW_CHARS]})
    elif text.strip():
        paragraphs = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
        for paragraph in paragraphs[:2]:
            lines.append({"at": None, "who": None, "text": " ".join(paragraph.split())[:PREVIEW_CHARS]})
    return lines


def insights(db: Session, source: Source) -> Dict:
    explanation = routing(db, source)
    return {
        "routing": explanation,
        "flags": flags(db, source, explanation["confidence"]),
        "preview": preview(source),
        "participants": participant_names(source.participants),
        "duration_minutes": source.duration_minutes,
        "candidates": source.candidates,
        "candidates_ready": source.candidates_at is not None,
        "created_by_name": source.creator.name if source.creator is not None else None,
    }
