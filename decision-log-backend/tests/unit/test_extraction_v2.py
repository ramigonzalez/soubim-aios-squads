"""Tests for V2 Extraction Service (Story 5.4)."""

import pytest

from app.services.prompt_loader import clear_cache, list_prompts, load_prompt, render_prompt
from app.services.extraction_v2 import (
    VALID_DISCIPLINES,
    VALID_ITEM_TYPES,
    _validate_item,
    build_extraction_prompt,
    format_participant_roster,
)
from app.services.enrichment_service import build_embedding_text


class TestPromptLoader:
    """Test prompt loading and caching."""

    def test_load_meeting_prompt(self):
        prompt = load_prompt("extract_meeting")
        assert "Meeting Transcript Extraction" in prompt
        assert "{{transcript_text}}" in prompt

    def test_load_email_prompt(self):
        prompt = load_prompt("extract_email")
        assert "Email Extraction" in prompt

    def test_load_document_prompt(self):
        prompt = load_prompt("extract_document")
        assert "Document Extraction" in prompt

    def test_load_nonexistent_prompt(self):
        with pytest.raises(FileNotFoundError):
            load_prompt("nonexistent_prompt")

    def test_prompt_caching(self):
        """Second load should come from cache."""
        clear_cache()
        p1 = load_prompt("extract_meeting")
        p2 = load_prompt("extract_meeting")
        assert p1 == p2

    def test_prompt_reload(self):
        """Force reload bypasses cache."""
        clear_cache()
        p1 = load_prompt("extract_meeting")
        p2 = load_prompt("extract_meeting", reload=True)
        assert p1 == p2

    def test_render_prompt(self):
        rendered = render_prompt("extract_meeting", {
            "meeting_title": "Test Meeting",
            "meeting_date": "2026-02-01",
            "meeting_type": "Design Review",
            "duration_minutes": "60",
            "participants": "Carlos, André",
            "participant_roster": "- Carlos (structural)",
            "transcript_text": "Test transcript content",
        })
        assert "Test Meeting" in rendered
        assert "Test transcript content" in rendered
        assert "{{meeting_title}}" not in rendered

    def test_list_prompts(self):
        prompts = list_prompts()
        assert "extract_meeting" in prompts
        assert "extract_email" in prompts
        assert "extract_document" in prompts

    def test_clear_cache(self):
        load_prompt("extract_meeting")
        clear_cache()
        # Should reload from disk after clear
        p = load_prompt("extract_meeting")
        assert p is not None


class TestParticipantRoster:
    """Test participant roster formatting."""

    def test_format_roster(self):
        participants = [
            {"name": "Carlos", "discipline": "structural", "role": "Lead Engineer"},
            {"name": "Gabriela", "discipline": "architecture", "role": "Director"},
        ]
        roster = format_participant_roster(participants)
        assert "Carlos (structural) — Lead Engineer" in roster
        assert "Gabriela (architecture) — Director" in roster

    def test_format_empty_roster(self):
        assert "No participant roster" in format_participant_roster([])

    def test_format_roster_no_role(self):
        participants = [{"name": "André", "discipline": "mep"}]
        roster = format_participant_roster(participants)
        assert "André (mep)" in roster
        assert "—" not in roster


class TestExtractionPromptBuilding:
    """Test prompt construction."""

    def test_build_prompt_with_all_fields(self):
        prompt = build_extraction_prompt(
            transcript_text="Carlos: I think we should use steel.",
            meeting_title="Structural Review",
            meeting_date="2026-02-01",
            meeting_type="Design Review",
            duration_minutes=60,
            participants=[
                {"name": "Carlos", "discipline": "structural"},
            ],
        )
        assert "Structural Review" in prompt
        assert "Carlos: I think we should use steel." in prompt
        assert "Carlos (structural)" in prompt

    def test_build_prompt_minimal(self):
        prompt = build_extraction_prompt(
            transcript_text="Hello everyone.",
        )
        assert "Hello everyone." in prompt
        assert "Untitled Meeting" in prompt


class TestItemValidation:
    """Test item validation logic."""

    def test_valid_decision(self):
        item = {
            "item_type": "decision",
            "statement": "Use steel framing",
            "who": "Carlos",
            "timestamp": "00:23:15",
            "affected_disciplines": ["structural", "architecture"],
            "confidence": 0.92,
            "why": "Cost efficiency",
            "consensus": {"structural": {"status": "AGREE"}},
        }
        result = _validate_item(item)
        assert result is not None
        assert result["item_type"] == "decision"
        assert result["why"] == "Cost efficiency"
        assert result["consensus"] is not None

    def test_valid_action_item(self):
        item = {
            "item_type": "action_item",
            "statement": "Submit calculations",
            "who": "Carlos",
            "affected_disciplines": ["structural"],
            "confidence": 0.95,
            "owner": "Carlos",
        }
        result = _validate_item(item)
        assert result is not None
        assert result["item_type"] == "action_item"
        assert result["owner"] == "Carlos"

    def test_valid_topic(self):
        item = {
            "item_type": "topic",
            "statement": "Discussed foundation options",
            "who": "Carlos",
            "affected_disciplines": ["civil", "structural"],
            "confidence": 0.88,
        }
        result = _validate_item(item)
        assert result is not None
        assert result["item_type"] == "topic"

    def test_valid_idea(self):
        item = {
            "item_type": "idea",
            "statement": "Consider green roof",
            "who": "André",
            "affected_disciplines": ["landscape"],
            "confidence": 0.70,
        }
        result = _validate_item(item)
        assert result is not None
        assert result["item_type"] == "idea"

    def test_valid_information(self):
        item = {
            "item_type": "information",
            "statement": "Zoning allows 12 stories max",
            "who": "Gabriela",
            "affected_disciplines": ["general"],
            "confidence": 0.99,
        }
        result = _validate_item(item)
        assert result is not None
        assert result["item_type"] == "information"

    def test_invalid_item_type(self):
        item = {
            "item_type": "invalid_type",
            "statement": "Some text",
            "who": "Someone",
        }
        result = _validate_item(item)
        assert result is None

    def test_empty_statement(self):
        item = {
            "item_type": "decision",
            "statement": "",
            "who": "Carlos",
        }
        result = _validate_item(item)
        assert result is None

    def test_invalid_discipline_filtered(self):
        item = {
            "item_type": "decision",
            "statement": "Test decision",
            "who": "Carlos",
            "affected_disciplines": ["invalid_disc", "structural"],
            "confidence": 0.8,
        }
        result = _validate_item(item)
        assert result is not None
        assert "invalid_disc" not in result["affected_disciplines"]
        assert "structural" in result["affected_disciplines"]

    def test_no_disciplines_defaults_to_general(self):
        item = {
            "item_type": "information",
            "statement": "Test info",
            "who": "Someone",
            "affected_disciplines": [],
        }
        result = _validate_item(item)
        assert result is not None
        assert result["affected_disciplines"] == ["general"]

    def test_confidence_clamped(self):
        item = {
            "item_type": "decision",
            "statement": "Test",
            "who": "Carlos",
            "affected_disciplines": ["structural"],
            "confidence": 1.5,
        }
        result = _validate_item(item)
        assert result["confidence"] == 1.0

        item["confidence"] = -0.5
        result = _validate_item(item)
        assert result["confidence"] == 0.0


class TestEnrichment:
    """Test embedding text building."""

    def test_build_decision_embedding_text(self):
        item = {
            "item_type": "decision",
            "statement": "Use steel framing",
            "who": "Carlos",
            "why": "Cost efficiency",
            "affected_disciplines": ["structural"],
        }
        text = build_embedding_text(item)
        assert "Use steel framing" in text
        assert "decision" in text
        assert "Carlos" in text
        assert "Cost efficiency" in text

    def test_build_action_item_embedding_text(self):
        item = {
            "item_type": "action_item",
            "statement": "Submit calculations",
            "who": "Carlos",
            "owner": "Carlos",
            "affected_disciplines": ["structural"],
        }
        text = build_embedding_text(item)
        assert "Submit calculations" in text
        assert "Owner: Carlos" in text

    def test_build_minimal_embedding_text(self):
        item = {
            "item_type": "idea",
            "statement": "Green roof option",
            "who": "André",
        }
        text = build_embedding_text(item)
        assert "Green roof option" in text


class TestConstants:
    """Test constants."""

    def test_valid_item_types(self):
        assert len(VALID_ITEM_TYPES) == 5
        assert "decision" in VALID_ITEM_TYPES
        assert "action_item" in VALID_ITEM_TYPES

    def test_valid_disciplines(self):
        assert len(VALID_DISCIPLINES) == 15
        assert "architecture" in VALID_DISCIPLINES
        assert "structural" in VALID_DISCIPLINES
        assert "mep" in VALID_DISCIPLINES
