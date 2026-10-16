"""Promem revamp Phase 4f: MIXED ("Com ressalvas") in new extractions, and one consensus shape."""

from pathlib import Path

from app.services.extraction_v2 import CONSENSUS_STATUSES, _validate_item, normalize_consensus

PROMPT = Path(__file__).resolve().parents[2] / "app" / "prompts" / "extract_meeting.md"


def test_prompt_offers_mixed_with_its_meaning():
    text = PROMPT.read_text()
    assert '"AGREE"|"MIXED"|"DISAGREE"|"ABSTAIN"' in text
    assert "with reservations or conditions" in text
    assert "AGREE / MIXED / DISAGREE / ABSTAIN" in text


def test_normalize_keeps_the_four_statuses_and_notes():
    raw = {
        "Structural": {"status": "mixed", "notes": " Só se o prazo não mudar "},
        "architecture": {"status": "AGREE", "notes": ""},
        "mep": "DISAGREE",
        "client": {"status": "ABSTAIN"},
    }
    assert normalize_consensus(raw) == {
        "structural": {"status": "MIXED", "notes": "Só se o prazo não mudar"},
        "architecture": {"status": "AGREE", "notes": None},
        "mep": {"status": "DISAGREE", "notes": None},
        "client": {"status": "ABSTAIN", "notes": None},
    }
    assert CONSENSUS_STATUSES == ("AGREE", "MIXED", "DISAGREE", "ABSTAIN")


def test_normalize_maps_synonyms_and_drops_the_unknown():
    raw = {
        "a": "STRONGLY_AGREE",
        "b": {"status": "agree with reservations"},
        "c": "neutral",
        "d": "DISSENT",
        "e": "MAYBE",
        "f": None,
        "": "AGREE",
    }
    assert normalize_consensus(raw) == {
        "a": {"status": "AGREE", "notes": None},
        "b": {"status": "MIXED", "notes": None},
        "c": {"status": "ABSTAIN", "notes": None},
        "d": {"status": "DISAGREE", "notes": None},
    }
    assert normalize_consensus(None) == {} and normalize_consensus(["AGREE"]) == {}


def test_decisions_carry_normalized_consensus():
    item = {
        "item_type": "decision",
        "statement": "Fachada ventilada aprovada",
        "who": "Lucia",
        "affected_disciplines": ["architecture"],
        "consensus": {"architecture": {"status": "AGREE"}, "mep": {"status": "MIXED", "notes": "Custo da subestrutura"}},
    }
    result = _validate_item(item)
    assert result["consensus"]["mep"] == {"status": "MIXED", "notes": "Custo da subestrutura"}
