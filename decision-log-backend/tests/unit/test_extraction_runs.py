"""Tests for extraction versions and rollback (Story 13.7). Claude is replaced by a fake client."""

import asyncio
import importlib.util
import json
import sys
from datetime import datetime, timedelta
from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, sessionmaker

from app.api.routes import decisions, extraction_runs as runs_routes, ingestion, project_items, shared_links
from app.database.models import ExtractionRun, Job, Project, ProjectItem, Source, SharedLink, User
from app.services import extraction_v2, ingestion_pipeline
from app.services.extraction_runs import activate_run
from app.services.item_import import import_items
from app.services.project_service import get_project, get_projects
from tests.org_helpers import assign_to_project, default_org_id, make_org_member
from tests.unit.test_meeting_extraction import FakeClient, _message


def run(coro):
    return asyncio.run(coro)


def req(user):
    return SimpleNamespace(state=SimpleNamespace(user=user))


def output(*statements, summary="Resumo"):
    return {
        "meeting_summary": summary,
        "items": [
            {"item_type": "decision", "statement": s, "who": "Ana", "affected_disciplines": ["architecture"],
             "why": "porque", "consensus": {}}
            for s in statements
        ],
    }


@pytest.fixture
def admin(db_session: Session) -> User:
    user = User(email="admin@soubim.com", password_hash="x", name="Admin", role="director")
    db_session.add(user)
    make_org_member(db_session, user, "admin")
    db_session.commit()
    return user


@pytest.fixture
def member(db_session: Session) -> User:
    user = User(email="member@soubim.com", password_hash="x", name="Member", role="architect")
    db_session.add(user)
    make_org_member(db_session, user, "member")
    db_session.commit()
    return user


@pytest.fixture
def meeting(db_session: Session, member: User) -> Source:
    project = Project(owner_organization_id=default_org_id(db_session), name="D/SEASON")
    db_session.add(project)
    db_session.flush()
    assign_to_project(db_session, member, project)
    source = Source(
        project_id=project.id, source_type="meeting", title="Quinzenal", occurred_at=datetime(2026, 9, 4),
        raw_content="0:01 - Ana\n  Vamos usar aço.", ingestion_status="approved", included=True,
    )
    db_session.add(source)
    db_session.commit()
    return source


@pytest.fixture
def extract(db_session: Session, monkeypatch):
    """extract(source, output, **pipeline_kwargs): run the pipeline with a fake Claude client."""

    def _extract(source: Source, data: dict, **kwargs) -> Source:
        monkeypatch.setattr(extraction_v2, "_client", lambda: FakeClient(_message(json.dumps(data))))
        monkeypatch.setattr(ingestion_pipeline, "SessionLocal", sessionmaker(bind=db_session.get_bind()))
        ingestion_pipeline.process_approved_source(str(source.id), **kwargs)
        db_session.expire_all()
        return db_session.get(Source, source.id)

    return _extract


def runs_of(db, source):
    return db.query(ExtractionRun).filter(ExtractionRun.source_id == source.id).order_by(ExtractionRun.version).all()


def listed(db, user, project_id):
    data = run(project_items.list_project_items(
        project_id=str(project_id), request=req(user), db=db, item_type=None, source_type=None, discipline=None,
        is_milestone=None, date_from=None, date_to=None, search=None, sort_by="created_at", sort_order="desc",
        limit=50, offset=0))
    return sorted(i["statement"] for i in data["items"])


class TestRunsCreatedByExtraction:
    def test_first_extraction_creates_active_run_with_details(self, db_session, meeting, extract):
        source = extract(meeting, output("Usar aço"))

        (r,) = runs_of(db_session, source)
        assert (r.version, r.is_active, r.status) == (1, True, "completed")
        assert r.model and r.prompt_version and (r.input_tokens, r.output_tokens) == (30000, 9000)
        assert r.meeting_summary == "Resumo" and r.raw_output["items"][0]["statement"] == "Usar aço"
        items = db_session.query(ProjectItem).filter(ProjectItem.source_id == source.id).all()
        assert [i.extraction_run_id for i in items] == [r.id]
        assert source.ai_summary == "Resumo"

    def test_re_extract_creates_a_new_active_run_and_keeps_the_previous_one(self, db_session, meeting, extract):
        extract(meeting, output("Usar aço"))
        source = extract(meeting, output("Usar concreto", "Prazo 3 meses", summary="Novo resumo"),
                         re_extract=True)

        v1, v2 = runs_of(db_session, source)
        assert (v1.is_active, v2.is_active, v2.version) == (False, True, 2)
        assert source.ingestion_status == "processed" and source.ai_summary == "Novo resumo"
        assert db_session.query(ProjectItem).filter(ProjectItem.extraction_run_id == v1.id).count() == 1
        assert db_session.query(ProjectItem).filter(ProjectItem.extraction_run_id == v2.id).count() == 2

    def test_processed_meeting_is_not_extracted_again_without_re_extract(self, db_session, meeting, extract):
        extract(meeting, output("Usar aço"))
        source = extract(meeting, output("Outro"))
        assert len(runs_of(db_session, source)) == 1

    def test_failed_re_extract_keeps_the_active_run_and_the_processed_status(self, db_session, meeting, extract):
        extract(meeting, output("Usar aço"))
        with pytest.raises(extraction_v2.ExtractionError):
            extract(meeting, {"nope": 1}, re_extract=True, raise_errors=True)
        db_session.expire_all()
        (r,) = runs_of(db_session, meeting)
        assert r.is_active and db_session.get(Source, meeting.id).ingestion_status == "processed"

    def test_import_script_path_creates_runs(self, db_session, meeting):
        import_items(db_session, meeting, output("A")["items"], meeting_summary="S1", model="claude-x")
        import_items(db_session, meeting, output("B", "C")["items"], replace=True, meeting_summary="S2")
        db_session.commit()

        v1, v2 = runs_of(db_session, meeting)
        assert (v1.model, v1.is_active, v2.is_active) == ("claude-x", False, True)
        assert db_session.query(ProjectItem).filter(ProjectItem.source_id == meeting.id).count() == 3
        assert meeting.ai_summary == "S2"

    def test_only_one_active_run_per_source_is_enforced_by_the_database(self, db_session, meeting):
        import_items(db_session, meeting, output("A")["items"])
        db_session.commit()
        db_session.add(ExtractionRun(source_id=meeting.id, version=2, is_active=True))
        with pytest.raises(IntegrityError):
            db_session.flush()
        db_session.rollback()


class TestOnlyActiveRunIsListed:
    @pytest.fixture
    def two_versions(self, db_session, meeting, admin):
        """v1: A (decision, milestone); v2 (active): B, C. Plus a manual item without a run."""
        import_items(db_session, meeting, output("A")["items"], model="m1")
        import_items(db_session, meeting, output("B", "C")["items"], replace=True, model="m2")
        db_session.add(ProjectItem(
            project_id=meeting.project_id, item_type="idea", source_type="manual_input", statement="Manual",
            who="Ana", discipline="general", why="", consensus={}, is_milestone=True))
        db_session.flush()
        for item in db_session.query(ProjectItem).all():
            item.is_milestone = item.statement in ("A", "B", "Manual")
        db_session.commit()
        return meeting

    def test_items_list_facets_and_milestones(self, db_session, two_versions, admin):
        pid = two_versions.project_id
        assert listed(db_session, admin, pid) == ["B", "C", "Manual"]
        data = run(project_items.list_project_items(
            project_id=str(pid), request=req(admin), db=db_session, item_type=None, source_type=None,
            discipline=None, is_milestone=None, date_from=None, date_to=None, search="A", sort_by="created_at",
            sort_order="desc", limit=50, offset=0))
        assert data["items"] == [] or all(i["statement"] != "A" for i in data["items"])
        assert data["facets"]["item_types"] == {"decision": 2, "idea": 1}
        milestones = run(project_items.list_milestones(
            project_id=str(pid), request=req(admin), db=db_session, item_type=None, source_type=None,
            discipline=None, date_from=None, date_to=None, search=None, sort_by="created_at",
            sort_order="desc", limit=50, offset=0))
        assert sorted(i["statement"] for i in milestones["items"]) == ["B", "Manual"]

    def test_v1_decisions_endpoint(self, db_session, two_versions, admin):
        response = run(decisions.list_decisions(two_versions.project_id, db=db_session, user=admin))
        body = json.loads(response.body)
        assert sorted(d["decision_statement"] for d in body["decisions"]) == ["B", "C"]

    def test_project_counts_and_stats(self, db_session, two_versions, admin):
        projects, _ = get_projects(db_session, str(admin.id))
        assert projects[0]["decision_count"] == 3  # B, C, Manual
        stats = get_project(db_session, str(two_versions.project_id), str(admin.id))
        assert stats["stats"]["total_decisions"] == 3

    def test_ingestion_history_counts_the_active_run_only(self, db_session, two_versions, admin):
        two_versions.ingestion_status = "processed"
        db_session.commit()
        data = run(ingestion.list_history(req(admin), project_id=None, source_type=None, date_from=None,
                                          date_to=None, limit=50, offset=0, db=db_session))
        assert [s["extracted_item_count"] for s in data["sources"]] == [2]

    def test_shared_milestone_timeline(self, db_session, two_versions, admin):
        link = SharedLink(project_id=two_versions.project_id, share_token="tok", created_by=admin.id,
                          expires_at=datetime.utcnow() + timedelta(days=1))
        db_session.add(link)
        db_session.commit()
        data = run(shared_links.view_shared_timeline("tok", db=db_session))
        assert sorted(m["statement"] for m in data["milestones"]) == ["B", "Manual"]

    def test_manual_items_are_unaffected_by_rollback(self, db_session, two_versions, admin):
        v1 = runs_of(db_session, two_versions)[0]
        activate_run(db_session, two_versions, v1)
        assert listed(db_session, admin, two_versions.project_id) == ["A", "Manual"]


class TestRollback:
    @pytest.fixture
    def two_versions(self, db_session, meeting):
        import_items(db_session, meeting, output("A", summary="S1")["items"], meeting_summary="S1", model="m1")
        import_items(db_session, meeting, output("B", "C")["items"], replace=True, meeting_summary="S2", model="m2")
        db_session.commit()
        return meeting

    def test_admin_activates_an_older_version(self, db_session, two_versions, admin):
        v1, v2 = runs_of(db_session, two_versions)
        data = run(runs_routes.activate_extraction_run(two_versions.id, v1.id, db=db_session, user=admin))

        db_session.expire_all()
        assert data["can_manage"] is True
        assert [(r["version"], r["is_active"], r["item_count"]) for r in data["runs"]] == [(2, False, 2), (1, True, 1)]
        assert listed(db_session, admin, two_versions.project_id) == ["A"]
        assert db_session.get(Source, two_versions.id).ai_summary == "S1"  # the version's summary comes back

        run(runs_routes.activate_extraction_run(two_versions.id, v2.id, db=db_session, user=admin))
        assert listed(db_session, admin, two_versions.project_id) == ["B", "C"]

    def test_non_admin_cannot_activate(self, db_session, two_versions, member):
        v1, _ = runs_of(db_session, two_versions)
        with pytest.raises(HTTPException) as exc:
            run(runs_routes.activate_extraction_run(two_versions.id, v1.id, db=db_session, user=member))
        assert exc.value.status_code == 403
        assert [r.is_active for r in runs_of(db_session, two_versions)] == [False, True]

    def test_member_can_list_versions_but_not_re_extract(self, db_session, two_versions, member):
        data = run(runs_routes.list_extraction_runs(two_versions.id, db=db_session, user=member))
        assert [r["version"] for r in data["runs"]] == [2, 1]
        assert data["runs"][0]["counts_by_type"] == {"decision": 2}
        assert data["can_manage"] is False
        with pytest.raises(HTTPException) as exc:
            run(runs_routes.re_extract_source(two_versions.id, db=db_session, user=member))
        assert exc.value.status_code == 403

    def test_run_of_another_source_is_not_found(self, db_session, two_versions, admin):
        other = Source(project_id=two_versions.project_id, source_type="meeting", occurred_at=datetime.utcnow(),
                       ingestion_status="processed", included=True)
        db_session.add(other)
        db_session.commit()
        import_items(db_session, other, output("Z")["items"])
        db_session.commit()
        foreign = runs_of(db_session, other)[0]
        with pytest.raises(HTTPException) as exc:
            run(runs_routes.activate_extraction_run(two_versions.id, foreign.id, db=db_session, user=admin))
        assert exc.value.status_code == 404

    def test_switch_is_atomic_when_it_fails(self, db_session, two_versions, admin, monkeypatch):
        v1, _ = runs_of(db_session, two_versions)

        def boom(*a, **k):
            raise RuntimeError("db down")

        monkeypatch.setattr(db_session, "commit", boom)
        with pytest.raises(RuntimeError):
            run(runs_routes.activate_extraction_run(two_versions.id, v1.id, db=db_session, user=admin))
        monkeypatch.undo()
        db_session.rollback()
        assert [r.is_active for r in runs_of(db_session, two_versions)] == [False, True]
        assert listed(db_session, admin, two_versions.project_id) == ["B", "C"]

    def test_re_extract_queues_a_job_for_processed_meetings(self, db_session, two_versions, admin):
        two_versions.ingestion_status = "processed"
        db_session.commit()
        run(runs_routes.re_extract_source(two_versions.id, db=db_session, user=admin))
        job = db_session.query(Job).filter(Job.source_id == two_versions.id).one()
        assert job.type == "process_source" and job.payload["re_extract"] is True
        assert job.payload["created_by"] == str(admin.id)
        with pytest.raises(HTTPException) as exc:  # one at a time
            run(runs_routes.re_extract_source(two_versions.id, db=db_session, user=admin))
        assert exc.value.status_code == 409

    def test_re_extract_requires_a_processed_meeting(self, db_session, meeting, admin):
        with pytest.raises(HTTPException) as exc:
            run(runs_routes.re_extract_source(meeting.id, db=db_session, user=admin))
        assert exc.value.status_code == 400

    def test_deleting_the_source_removes_every_version(self, db_session, two_versions, admin):
        two_versions.ingestion_status = "processed"
        db_session.commit()
        run(ingestion.delete_source(str(two_versions.id), req(admin), db=db_session))
        assert db_session.query(ProjectItem).count() == 0
        assert db_session.query(ExtractionRun).count() == 0


class TestBackfill:
    def test_existing_items_become_version_1_active(self, db_session, meeting, monkeypatch):
        if db_session.get_bind().dialect.name != "postgresql":
            pytest.skip("backfill SQL is PostgreSQL")
        path = Path(__file__).parents[2] / "alembic" / "versions" / "012_story_13_7_extraction_runs.py"
        monkeypatch.setitem(sys.modules, "alembic", SimpleNamespace(op=None))  # the repo's alembic/ shadows the package
        spec = importlib.util.spec_from_file_location("mig012", path)
        mig = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mig)

        meeting.ai_summary = "Resumo atual"
        other = Source(project_id=meeting.project_id, source_type="meeting", occurred_at=datetime.utcnow(),
                       ingestion_status="processed", included=True)
        db_session.add(other)
        db_session.flush()
        for source, n in ((meeting, 2), (other, 1)):
            for i in range(n):
                db_session.add(ProjectItem(
                    project_id=source.project_id, source_id=source.id, item_type="decision", source_type="meeting",
                    statement=f"{source.id}-{i}", who="Ana", discipline="general", why="", consensus={}))
        db_session.add(ProjectItem(
            project_id=meeting.project_id, item_type="idea", source_type="manual_input", statement="Manual",
            who="Ana", discipline="general", why="", consensus={}))
        db_session.commit()

        for statement in mig.BACKFILL_SQL:
            db_session.execute(text(statement))
        db_session.commit()

        runs = db_session.query(ExtractionRun).order_by(ExtractionRun.source_id).all()
        assert len(runs) == 2 and all(r.version == 1 and r.is_active for r in runs)
        by_source = {r.source_id: r for r in runs}
        assert by_source[meeting.id].meeting_summary == "Resumo atual"
        for item in db_session.query(ProjectItem):
            if item.source_id is None:
                assert item.extraction_run_id is None
            else:
                assert item.extraction_run_id == by_source[item.source_id].id
