"""Ingestion preview: "O que deve entrar no projeto" before approval (Promem revamp G2, step 1).

When a pending source arrives, a ``preview_candidates`` job asks a small model
(``settings.llm_preview_model``) for the items it would likely extract — type, short title,
discipline — and a one-line summary when the source has none. Approving still runs the full
extraction; the preview only helps the reviewer decide.

Step 2 (later): run the full extraction on arrival and let approval publish the staged items.
"""

import json
import logging
import re
import uuid
from datetime import datetime
from typing import Dict, List, Optional

from sqlalchemy import event
from sqlalchemy.orm import Session

from app.config import settings
from app.database.models import Job, Source
from app.services.llm_client import get_llm_client
from app.services.llm_client import response_text

logger = logging.getLogger(__name__)

JOB_TYPE = "preview_candidates"
MAX_CANDIDATES = 6
MAX_INPUT_CHARS = 12000
ITEM_TYPES = {"decision", "action_item", "topic", "idea", "information"}
DISCIPLINES = {
    "architecture", "structural", "mep", "electrical", "plumbing", "landscape", "fire_protection", "acoustical",
    "sustainability", "civil", "client", "contractor", "tenant", "engineer", "general",
}

PROMPT = """Você lê fontes de projetos de arquitetura e construção (reuniões, e-mails, documentos) antes \
de uma pessoa aprovar a extração completa. Liste até {max_items} itens que provavelmente serão \
extraídos desta fonte.

Responda só com JSON, sem texto fora dele:
{{"summary": "uma frase em português sobre do que trata a fonte",
  "items": [{{"type": "decision|action_item|topic|idea|information", "title": "título curto em português", "discipline": "{disciplines}"}}]}}

Fonte ({kind}): {title}

{content}
"""


def preview_enabled() -> bool:
    """Off in tests (they create many sources and count jobs); tests that need it patch this."""
    return settings.candidate_preview_enabled and settings.environment != "test"


def _parse(text: str) -> Dict:
    match = re.search(r"\{.*\}", text or "", re.S)
    if not match:
        raise ValueError("preview response has no JSON object")
    return json.loads(match.group(0))


def clean_candidates(raw) -> List[Dict]:
    items: List[Dict] = []
    for entry in raw if isinstance(raw, list) else []:
        if not isinstance(entry, dict):
            continue
        title = " ".join(str(entry.get("title") or "").split())[:200]
        if not title:
            continue
        kind = entry.get("type") if entry.get("type") in ITEM_TYPES else "information"
        discipline = entry.get("discipline") if entry.get("discipline") in DISCIPLINES else "general"
        items.append({"type": kind, "title": title, "discipline": discipline})
        if len(items) >= MAX_CANDIDATES:
            break
    return items


def generate(db: Session, source: Source, client=None) -> List[Dict]:
    """Ask the small model for candidates; store them (and a summary if missing) on the source."""
    content = (source.raw_content or source.ai_summary or "").strip()
    if not content:
        source.candidates = []
        source.candidates_at = datetime.utcnow()
        db.commit()
        return []
    prompt = PROMPT.format(
        max_items=MAX_CANDIDATES,
        disciplines="|".join(sorted(DISCIPLINES)),
        kind=source.source_type,
        title=source.title or "",
        content=content[:MAX_INPUT_CHARS],
    )
    client = client or get_llm_client()
    response = client.messages.create(
        model=settings.llm_preview_model,
        max_tokens=800,
        messages=[{"role": "user", "content": prompt}],
    )
    data = _parse(response_text(response))
    source.candidates = clean_candidates(data.get("items"))
    source.candidates_at = datetime.utcnow()
    summary = " ".join(str(data.get("summary") or "").split())
    if summary and not source.ai_summary:
        source.ai_summary = summary[:1000]
    db.commit()
    return source.candidates


def run(source_id: str, session_factory=None) -> None:
    """Worker entry point for ``preview_candidates`` jobs."""
    from app.database.session import SessionLocal

    db = (session_factory or SessionLocal)()
    try:
        source = db.query(Source).filter(Source.id == source_id).first()
        if source is None or source.ingestion_status != "pending" or source.candidates_at is not None:
            return
        generate(db, source)
    finally:
        db.close()


@event.listens_for(Session, "before_flush")
def _queue_preview(session: Session, flush_context, instances) -> None:
    """Every new pending source gets a preview job, whatever created it (Fathom, Gmail, Drive, uploads).

    The job carries the id in its payload, not ``jobs.source_id``: a failed preview must not mark the
    source itself as failed.
    """
    if not preview_enabled():
        return
    for obj in list(session.new):
        if isinstance(obj, Source) and (obj.ingestion_status or "pending") == "pending" and obj.candidates_at is None:
            if obj.id is None:
                obj.id = uuid.uuid4()
            session.add(Job(type=JOB_TYPE, payload={"source_id": str(obj.id)}, status="queued", max_attempts=2, run_after=datetime.utcnow()))
