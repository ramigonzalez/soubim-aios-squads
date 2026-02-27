"""V2 Extraction Service — extracts all 5 item types from meeting transcripts.

Story 5.4: AI Extraction Prompt Evolution

Uses Claude API with structured prompts to classify meeting content into:
idea, topic, decision, action_item, information
"""

import json
import logging
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


async def extract_items_from_transcript(
    transcript_text: str,
    meeting_title: str = "Untitled Meeting",
    meeting_date: str = "",
    meeting_type: str = "General",
    duration_minutes: int = 0,
    participants: Optional[List[Dict[str, Any]]] = None,
    api_key: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Extract project items from a meeting transcript using Claude API.

    Args:
        transcript_text: Full meeting transcript text
        meeting_title: Title of the meeting
        meeting_date: Date of the meeting
        meeting_type: Type of meeting
        duration_minutes: Duration in minutes
        participants: Participant roster for discipline inference
        api_key: Anthropic API key (falls back to settings)

    Returns:
        List of extracted item dicts with item_type, statement, who, etc.
    """
    prompt = build_extraction_prompt(
        transcript_text=transcript_text,
        meeting_title=meeting_title,
        meeting_date=meeting_date,
        meeting_type=meeting_type,
        duration_minutes=duration_minutes,
        participants=participants,
    )

    try:
        import anthropic
        from app.config import settings

        client = anthropic.Anthropic(api_key=api_key or settings.anthropic_api_key)

        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=4096,
            messages=[
                {"role": "user", "content": prompt},
            ],
        )

        # Parse JSON from response
        response_text = response.content[0].text

        # Extract JSON from response (may be wrapped in markdown code blocks)
        json_text = response_text
        if "```json" in json_text:
            json_text = json_text.split("```json")[1].split("```")[0].strip()
        elif "```" in json_text:
            json_text = json_text.split("```")[1].split("```")[0].strip()

        result = json.loads(json_text)
        items = result.get("items", [])

        # Validate and normalize items
        validated = []
        for item in items:
            validated_item = _validate_item(item)
            if validated_item:
                validated.append(validated_item)

        logger.info(f"Extracted {len(validated)} items from transcript: {meeting_title}")
        return validated

    except ImportError:
        logger.warning("anthropic package not available — returning empty extraction")
        return []
    except json.JSONDecodeError as e:
        logger.error(f"Failed to parse extraction response as JSON: {e}")
        return []
    except Exception as e:
        logger.error(f"Extraction failed: {e}")
        return []


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
