"""Tests for importing pre-extracted items into a Source (Story 7.10)."""

from datetime import datetime

import pytest
from sqlalchemy.orm import Session

from app.database.models import Project, ProjectItem, Source
from app.services.item_import import import_items


@pytest.fixture
def meeting_source(db_session: Session) -> Source:
    project = Project(name="D/SEASON", description="Construtora: DIMAS")
    db_session.add(project)
    db_session.flush()
    source = Source(
        project_id=project.id,
        source_type="meeting",
        title="Quinzenal",
        occurred_at=datetime(2026, 9, 4),
        ingestion_status="pending",
        included=False,
        raw_content="0:01 - Debora\n  Oi",
    )
    db_session.add(source)
    db_session.commit()
    return source


DECISION = {
    "item_type": "decision",
    "title": "Cortes gerais só na implantação",
    "statement": "Separate general sections from detail sheets",
    "source_excerpt": "10:55 - Debora: Os cortes gerais podiam ficar só na implantação.\n11:02 - Gabriela: Pode ser.",
    "who": "Gabriela Cavalheiro",
    "timestamp": "00:08:45",
    "affected_disciplines": ["architecture", "client"],
    "confidence": 0.9,
    "why": "Site team cannot find details",
    "causation": "Debora's review of F4 sheets",
    "consensus": {"architecture": {"status": "AGREE", "notes": None}},
    "impacts": {"timeline_impact": "+1 week", "risk_level": "low"},
}
ACTION = {
    "item_type": "action_item",
    "statement": "Send stair masonry detail",
    "who": "Debora Rezende Gagliotti",
    "timestamp": "00:05:10",
    "affected_disciplines": ["architecture"],
    "confidence": 0.8,
    "owner": "Gabriela Cavalheiro",
    "due_date": "2026-09-11",
}
TOPIC = {
    "item_type": "topic",
    "statement": "Torre A structure timing",
    "who": "Gabriela Cavalheiro",
    "affected_disciplines": ["structural"],
    "confidence": 0.7,
    "discussion_points": "Waiting on structural base before facade",
}


class TestImportItems:
    def test_keeps_all_decision_fields(self, db_session: Session, meeting_source: Source):
        created, skipped = import_items(db_session, meeting_source, [DECISION])
        db_session.commit()

        assert skipped == 0
        item = db_session.query(ProjectItem).one()
        assert item.source_id == meeting_source.id
        assert item.project_id == meeting_source.project_id
        assert item.source_type == "meeting"
        assert item.why == "Site team cannot find details"
        assert item.causation == "Debora's review of F4 sheets"
        assert item.consensus == {"architecture": {"status": "AGREE", "notes": None}}
        assert item.impacts["timeline_impact"] == "+1 week"
        assert item.timestamp == "00:08:45"
        assert item.affected_disciplines == ["architecture", "client"]
        assert item.discipline == "architecture,client"
        assert item.decision_statement == item.statement

    def test_action_item_owner_and_due_date(self, db_session: Session, meeting_source: Source):
        import_items(db_session, meeting_source, [ACTION])
        db_session.commit()

        item = db_session.query(ProjectItem).one()
        assert item.owner == "Gabriela Cavalheiro"
        assert item.due_date == datetime(2026, 9, 11)
        assert item.is_done is False

    def test_non_decision_context_goes_to_why(self, db_session: Session, meeting_source: Source):
        import_items(db_session, meeting_source, [TOPIC])
        db_session.commit()

        item = db_session.query(ProjectItem).one()
        assert item.why == "Waiting on structural base before facade"
        assert item.consensus == {}
        assert item.timestamp is None

    def test_marks_source_processed(self, db_session: Session, meeting_source: Source):
        import_items(db_session, meeting_source, [DECISION, ACTION, TOPIC])
        db_session.commit()

        assert meeting_source.ingestion_status == "processed"
        assert meeting_source.included is True
        assert meeting_source.approved_at is not None
        assert meeting_source.extraction_error is None

    def test_invalid_items_are_skipped(self, db_session: Session, meeting_source: Source):
        bad = [{"item_type": "rumor", "statement": "x"}, {"item_type": "decision", "statement": "  "}, "not a dict"]
        created, skipped = import_items(db_session, meeting_source, [DECISION, *bad])

        assert len(created) == 1
        assert skipped == 3

    def test_unknown_disciplines_fall_back_to_general(self, db_session: Session, meeting_source: Source):
        created, _ = import_items(db_session, meeting_source, [{**TOPIC, "affected_disciplines": ["construtora"]}])
        assert created[0].affected_disciplines == ["general"]

    def test_unparseable_due_date_is_dropped(self, db_session: Session, meeting_source: Source):
        created, _ = import_items(db_session, meeting_source, [{**ACTION, "due_date": "next Friday"}])
        assert created[0].due_date is None

    def test_refuses_second_import_without_replace(self, db_session: Session, meeting_source: Source):
        import_items(db_session, meeting_source, [DECISION])
        db_session.commit()

        with pytest.raises(ValueError, match="already has 1 items"):
            import_items(db_session, meeting_source, [ACTION])

    def test_replace_swaps_existing_items(self, db_session: Session, meeting_source: Source):
        import_items(db_session, meeting_source, [DECISION])
        db_session.commit()

        import_items(db_session, meeting_source, [ACTION, TOPIC], replace=True)
        db_session.commit()

        types = sorted(i.item_type for i in db_session.query(ProjectItem).all())
        assert types == ["action_item", "topic"]

    def test_rejects_non_meeting_sources(self, db_session: Session, meeting_source: Source):
        meeting_source.source_type = "email"
        with pytest.raises(ValueError, match="not importable"):
            import_items(db_session, meeting_source, [DECISION])

    def test_keeps_title_and_source_excerpt(self, db_session: Session, meeting_source: Source):
        import_items(db_session, meeting_source, [DECISION, ACTION])
        db_session.commit()

        decision = db_session.query(ProjectItem).filter(ProjectItem.item_type == "decision").one()
        assert decision.title == "Cortes gerais só na implantação"
        assert decision.source_excerpt.startswith("10:55 - Debora:")
        action = db_session.query(ProjectItem).filter(ProjectItem.item_type == "action_item").one()
        assert action.title is None
        assert action.source_excerpt is None

    def test_overlong_title_is_truncated(self, db_session: Session, meeting_source: Source):
        created, _ = import_items(db_session, meeting_source, [{**TOPIC, "title": "x" * 300}])
        assert len(created[0].title) == 255

    def test_meeting_summary_stored_on_source(self, db_session: Session, meeting_source: Source):
        import_items(db_session, meeting_source, [TOPIC], meeting_summary="  Reunião quinzenal de projeto.  ")
        assert meeting_source.ai_summary == "Reunião quinzenal de projeto."

    def test_missing_summary_keeps_existing_one(self, db_session: Session, meeting_source: Source):
        meeting_source.ai_summary = "Resumo anterior"
        import_items(db_session, meeting_source, [TOPIC], meeting_summary=None)
        assert meeting_source.ai_summary == "Resumo anterior"
