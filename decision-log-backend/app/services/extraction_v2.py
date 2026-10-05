"""V2 Extraction Service — extracts all 5 item types from meeting transcripts.

Story 5.4: AI Extraction Prompt Evolution

Uses Claude API with structured prompts to classify meeting content into:
idea, topic, decision, action_item, information
"""

import json
import logging
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from app.services.prompt_loader import render_prompt

logger = logging.getLogger(__name__)


def format_participant_roster(participants: List[Dict[str, Any]]) -> str:
    """Format participant list for prompt injection."""
    if not participants:
        return "No participant roster available."
    lines = []
    for p in participants:
        name = p.get("name", "Unknown")
        discipline = p.get("discipline", "general")
        role = p.get("role", "")
        line = f"- {name} ({discipline})"
        if role:
            line += f" — {role}"
        lines.append(line)
    return "\n".join(lines)


def build_extraction_prompt(
    transcript_text: str,
    meeting_title: str = "Untitled Meeting",
    meeting_date: str = "",
    meeting_type: str = "General",
    duration_minutes: int = 0,
    participants: Optional[List[Dict[str, Any]]] = None,
) -> str:
    """Build the full extraction prompt with all context variables.

    Args:
        transcript_text: Full meeting transcript
        meeting_title: Meeting title
        meeting_date: Meeting date (ISO format)
        meeting_type: Type of meeting
        duration_minutes: Duration in minutes
        participants: List of participant dicts with name, discipline, role

    Returns:
        Rendered prompt ready for LLM
    """
    participant_roster = format_participant_roster(participants or [])

    # Format participants for the header
    participant_names = ", ".join(
        p.get("name", "Unknown") for p in (participants or [])
    ) or "Unknown"

    variables = {
        "meeting_title": meeting_title,
        "meeting_date": meeting_date,
        "meeting_type": meeting_type,
        "duration_minutes": str(duration_minutes),
        "participants": participant_names,
        "participant_roster": participant_roster,
        "transcript_text": transcript_text,
    }

    return render_prompt("extract_meeting", variables)


class ExtractionError(Exception):
    """Meeting extraction failed in a way the user should see (stored as the source's extraction_error)."""


@dataclass
class ExtractionResult:
    items: List[Dict[str, Any]]
    meeting_summary: Optional[str]
    model: str
    input_tokens: int = 0
    output_tokens: int = 0


# Server-side refusal fallback (Claude API): a declined request is re-run on a fallback model
# inside the same call. Story 7.11 — opted in by default.
_FALLBACK_BETA = "server-side-fallback-2026-07-01"


def _client():
    """Anthropic client (patched in tests)."""
    import anthropic

    from app.config import settings

    return anthropic.Anthropic(api_key=settings.anthropic_api_key)


def _strip_code_fence(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1] if "\n" in text else ""
        if text.rstrip().endswith("```"):
            text = text.rstrip()[:-3]
    return text.strip()


def run_meeting_extraction(prompt: str, client=None) -> ExtractionResult:
    """Send a rendered extraction prompt to Claude and parse the items + meeting summary.

    Streams the response (long meetings produce >10k output tokens) and raises
    ExtractionError on truncation, refusal or invalid JSON instead of returning nothing.
    """
    from app.config import settings

    client = client or _client()
    with client.messages.stream(
        model=settings.llm_model,
        max_tokens=settings.extraction_max_tokens,
        messages=[{"role": "user", "content": prompt}],
        extra_headers={"anthropic-beta": _FALLBACK_BETA},
        extra_body={"output_config": {"effort": settings.extraction_effort}, "fallbacks": "default"},
    ) as stream:
        message = stream.get_final_message()

    usage = getattr(message, "usage", None)
    input_tokens = getattr(usage, "input_tokens", 0) or 0
    output_tokens = getattr(usage, "output_tokens", 0) or 0
    logger.info(f"Extraction model={message.model} input_tokens={input_tokens} output_tokens={output_tokens}")

    if message.stop_reason == "max_tokens":
        raise ExtractionError(
            f"Extraction output was cut off at the {settings.extraction_max_tokens}-token limit "
            f"(EXTRACTION_MAX_TOKENS); the meeting may be too long for one request"
        )
    if message.stop_reason == "refusal":
        details = getattr(message, "stop_details", None)
        raise ExtractionError(f"The model declined the extraction ({getattr(details, 'category', None) or 'no category'})")

    text = "".join(block.text for block in message.content if getattr(block, "type", None) == "text")
    try:
        data = json.loads(_strip_code_fence(text))
    except json.JSONDecodeError as e:
        raise ExtractionError(f"Model response is not valid JSON: {e.msg} at character {e.pos}") from e
    if not isinstance(data, dict) or not isinstance(data.get("items"), list):
        raise ExtractionError('Model response has no "items" list')

    items = [v for v in (_validate_item(i) for i in data["items"] if isinstance(i, dict)) if v]
    summary = data.get("meeting_summary")
    return ExtractionResult(
        items=items,
        meeting_summary=summary.strip() if isinstance(summary, str) and summary.strip() else None,
        model=message.model,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
    )


def extract_meeting(
    transcript_text: str,
    meeting_title: str = "Untitled Meeting",
    meeting_date: str = "",
    meeting_type: str = "General",
    duration_minutes: int = 0,
    participants: Optional[List[Dict[str, Any]]] = None,
    client=None,
) -> ExtractionResult:
    """Extract project items and a meeting summary from a meeting transcript (Story 7.11)."""
    if not transcript_text.strip():
        raise ExtractionError("The meeting has no transcript text to extract from")
    prompt = build_extraction_prompt(
        transcript_text=transcript_text,
        meeting_title=meeting_title,
        meeting_date=meeting_date,
        meeting_type=meeting_type,
        duration_minutes=duration_minutes,
        participants=participants,
    )
    result = run_meeting_extraction(prompt, client=client)
    logger.info(f"Extracted {len(result.items)} items from: {meeting_title}")
    return result


VALID_ITEM_TYPES = {"idea", "topic", "decision", "action_item", "information"}
VALID_DISCIPLINES = {
    "architecture", "structural", "mep", "electrical", "plumbing",
    "landscape", "fire_protection", "acoustical", "sustainability",
    "civil", "client", "contractor", "tenant", "engineer", "general",
}


def _validate_item(item: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """Validate and normalize an extracted item."""
    item_type = item.get("item_type", "").lower()
    if item_type not in VALID_ITEM_TYPES:
        logger.warning(f"Invalid item_type: {item_type}")
        return None

    statement = item.get("statement", "").strip()
    if not statement:
        logger.warning("Empty statement in extracted item")
        return None

    who = item.get("who", "Unknown").strip()

    # Normalize disciplines
    raw_disciplines = item.get("affected_disciplines", [])
    disciplines = [
        d.lower().strip()
        for d in raw_disciplines
        if d.lower().strip() in VALID_DISCIPLINES
    ]
    if not disciplines:
        disciplines = ["general"]

    validated = {
        "item_type": item_type,
        "statement": statement,
        "who": who,
        "timestamp": item.get("timestamp", ""),
        "affected_disciplines": disciplines,
        "confidence": min(max(float(item.get("confidence", 0.5)), 0.0), 1.0),
        "title": (item.get("title") or "").strip()[:255] or None,
        "source_excerpt": (item.get("source_excerpt") or "").strip() or None,
    }

    # Type-specific fields
    if item_type == "decision":
        validated["why"] = item.get("why", "")
        validated["causation"] = item.get("causation")
        validated["consensus"] = item.get("consensus", {})
        validated["impacts"] = item.get("impacts")

    elif item_type == "action_item":
        validated["owner"] = item.get("owner", who)
        validated["due_date"] = item.get("due_date")
        validated["is_done"] = False

    elif item_type == "topic":
        validated["discussion_points"] = item.get("discussion_points")

    elif item_type == "idea":
        validated["related_topic"] = item.get("related_topic")

    elif item_type == "information":
        validated["reference_source"] = item.get("reference_source")

    return validated
