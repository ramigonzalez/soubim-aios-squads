"""Tests for in-app meeting extraction (Story 7.11) — Claude is replaced by a fake client."""

import json
from datetime import datetime
from types import SimpleNamespace

import pytest
from sqlalchemy.orm import Session, sessionmaker

from app.config import settings
from app.database.models import Project, ProjectItem, ProjectParticipant, Source
from app.services import extraction_v2, ingestion_pipeline
from app.services.extraction_v2 import ExtractionError, extract_meeting, run_meeting_extraction
from tests.org_helpers import default_org_id

TRANSCRIPT = """souBIM + DIMAS | D/SEASON - Quinzenal

---

33:40 - Debora Rezende Gagliotti (Dimas Construções)
  Quando tem soleira, ela é feita com o mesmo revestimento cerâmico.

1:09:12 - ⚠️ Camila / Erica [mixed voices]
  A gente manda a planilha por e-mail.
"""

OUTPUT = {
    "meeting_summary": "Reunião sobre paginação e planilhas.",
    "items": [
        {
            "item_type": "decision",
            "title": "Paginação por ambiente",
            "statement": "Paginação contínua em ambientes integrados; soleira do mesmo revestimento nos demais.",
            "who": "Debora Rezende Gagliotti",
            "timestamp": "00:33:40",
            "affected_disciplines": ["architecture", "client"],
            "confidence": 0.85,
            "why": "Evita recortes no meio das portas",
            "causation": "Problema de paginação no ático",
            "consensus": {"client": {"status": "AGREE", "notes": None}},
            "impacts": {"scope_impact": "Modelagem por ambiente", "risk_level": "low"},
            "source_excerpt": "33:40 - Debora Rezende Gagliotti: Quando tem soleira…",
        },
        {
            "item_type": "action_item",
            "title": "Enviar planilha",
            "statement": "Enviar a planilha de especificações por e-mail.",
            "who": "Camila / Erica",
            "timestamp": "01:09:12",
            "affected_disciplines": ["client"],
            "confidence": 0.7,
            "owner": "Camila / Erica",
            "due_date": "2026-09-11",
        },
        {"item_type": "rumor", "statement": "dropped by validation"},
    ],
}


def _message(text: str, stop_reason: str = "end_turn", **extra):
    return SimpleNamespace(
        content=[SimpleNamespace(type="thinking", thinking=""), SimpleNamespace(type="text", text=text)],
        stop_reason=stop_reason,
        model=settings.llm_model,
        usage=SimpleNamespace(input_tokens=30000, output_tokens=9000),
        **extra,
    )


class FakeClient:
    """Mimics client.messages.stream(...) as a context manager with get_final_message()."""

    def __init__(self, message):
        self.message = message
        self.calls = []
        self.messages = self

    def stream(self, **kwargs):
        self.calls.append(kwargs)
        client = self

        class _Stream:
            def __enter__(self):
                return self

            def __exit__(self, *exc):
                return False

            def get_final_message(self):
                return client.message

        return _Stream()


class TestRunMeetingExtraction:
    def test_parses_items_and_summary(self):
        result = run_meeting_extraction("prompt", client=FakeClient(_message(json.dumps(OUTPUT))))

        assert result.meeting_summary == "Reunião sobre paginação e planilhas."
        assert [i["item_type"] for i in result.items] == ["decision", "action_item"]  # invalid type dropped
        assert result.items[0]["why"] == "Evita recortes no meio das portas"
        assert result.output_tokens == 9000

    def test_request_uses_settings_streaming_and_fallback(self):
        client = FakeClient(_message(json.dumps(OUTPUT)))
        run_meeting_extraction("the prompt", client=client)

        call = client.calls[0]
        assert call["model"] == settings.llm_model
        assert call["max_tokens"] == settings.extraction_max_tokens >= 32000
        assert call["messages"] == [{"role": "user", "content": "the prompt"}]
        assert call["extra_body"]["output_config"] == {"effort": settings.extraction_effort}
        assert call["extra_body"]["fallbacks"] == "default"
        assert call["extra_headers"]["anthropic-beta"] == "server-side-fallback-2026-07-01"

    def test_accepts_json_inside_a_code_fence(self):
        fenced = "```json\n" + json.dumps(OUTPUT) + "\n```"
        assert len(run_meeting_extraction("p", client=FakeClient(_message(fenced))).items) == 2

    def test_truncated_output_is_an_error(self):
        with pytest.raises(ExtractionError, match="cut off"):
            run_meeting_extraction("p", client=FakeClient(_message('{"items": [', stop_reason="max_tokens")))

    def test_invalid_json_is_an_error(self):
        with pytest.raises(ExtractionError, match="not valid JSON"):
            run_meeting_extraction("p", client=FakeClient(_message("Sorry, here are the items: ...")))

    def test_missing_items_list_is_an_error(self):
        with pytest.raises(ExtractionError, match='no "items" list'):
            run_meeting_extraction("p", client=FakeClient(_message('{"meeting_summary": "x"}')))

    def test_refusal_is_an_error(self):
        message = _message("", stop_reason="refusal", stop_details=SimpleNamespace(category="cyber"))
        with pytest.raises(ExtractionError, match="declined.*cyber"):
            run_meeting_extraction("p", client=FakeClient(message))

    def test_empty_transcript_is_an_error(self):
        with pytest.raises(ExtractionError, match="no transcript"):
            extract_meeting("   ", client=FakeClient(_message(json.dumps(OUTPUT))))


class TestPrompt:
    def test_prompt_explains_timestamps_and_uncertain_speakers(self):
        prompt = extraction_v2.build_extraction_prompt(transcript_text=TRANSCRIPT)
        assert "`1:20:05` means 01:20:05" in prompt
        assert "uncertain speaker" in prompt and '"who": "Camila / Erica"' in prompt


@pytest.fixture
def approved_meeting(db_session: Session) -> Source:
    project = Project(owner_organization_id=default_org_id(db_session), name="D/SEASON")
    db_session.add(project)
    db_session.flush()
    db_session.add(ProjectParticipant(project_id=project.id, name="Debora Rezende Gagliotti",
                                      discipline="client", role="Construtora DIMAS"))
    source = Source(
        project_id=project.id, source_type="meeting", title="souBIM + DIMAS | D/SEASON - Quinzenal",
        occurred_at=datetime(2026, 9, 4), meeting_type="Quinzenal", duration_minutes=98,
        raw_content=TRANSCRIPT, ingestion_status="approved", included=True,
    )
    db_session.add(source)
    db_session.commit()
    return source


@pytest.fixture
def run_pipeline(db_session: Session, monkeypatch):
    def _run(source: Source, client: FakeClient) -> Source:
        monkeypatch.setattr(extraction_v2, "_client", lambda: client)
        monkeypatch.setattr(ingestion_pipeline, "SessionLocal", sessionmaker(bind=db_session.get_bind()))
        ingestion_pipeline.process_approved_source(str(source.id))
        db_session.expire_all()
        return db_session.get(Source, source.id)
    return _run


class TestPipeline:
    def test_approved_meeting_produces_items_with_all_fields(self, db_session: Session, approved_meeting, run_pipeline):
        client = FakeClient(_message(json.dumps(OUTPUT)))
        source = run_pipeline(approved_meeting, client)

        assert source.ingestion_status == "processed"
        assert source.ai_summary == "Reunião sobre paginação e planilhas."
        items = {i.item_type: i for i in db_session.query(ProjectItem).filter(ProjectItem.source_id == source.id)}
        decision, action = items["decision"], items["action_item"]
        assert decision.why == "Evita recortes no meio das portas"
        assert decision.causation == "Problema de paginação no ático"
        assert decision.consensus == {"client": {"status": "AGREE", "notes": None}}
        assert decision.impacts["scope_impact"] == "Modelagem por ambiente"
        assert decision.timestamp == "00:33:40"
        assert decision.title == "Paginação por ambiente"
        assert decision.source_excerpt.startswith("33:40 - Debora")
        assert action.owner == "Camila / Erica" and action.due_date == datetime(2026, 9, 11)

    def test_prompt_carries_meeting_context_and_roles(self, approved_meeting, run_pipeline):
        client = FakeClient(_message(json.dumps(OUTPUT)))
        run_pipeline(approved_meeting, client)

        prompt = client.calls[0]["messages"][0]["content"]
        assert "souBIM + DIMAS | D/SEASON - Quinzenal" in prompt
        assert "2026-09-04" in prompt and "98 minutes" in prompt and "Quinzenal" in prompt
        assert "- Debora Rezende Gagliotti (client) — Construtora DIMAS" in prompt
        assert "Untitled Meeting" not in prompt

    def test_invalid_output_marks_the_meeting_failed_with_a_clear_error(self, db_session: Session,
                                                                       approved_meeting, run_pipeline):
        source = run_pipeline(approved_meeting, FakeClient(_message("not json")))

        assert source.ingestion_status == "failed"
        assert source.extraction_error.startswith("Model response is not valid JSON")
        assert db_session.query(ProjectItem).filter(ProjectItem.source_id == source.id).count() == 0

    def test_truncated_output_marks_the_meeting_failed(self, approved_meeting, run_pipeline):
        source = run_pipeline(approved_meeting, FakeClient(_message('{"items": [', stop_reason="max_tokens")))

        assert source.ingestion_status == "failed"
        assert "cut off" in source.extraction_error
