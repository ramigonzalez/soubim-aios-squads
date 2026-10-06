"""Tests for the background job queue and worker (Story 13.2)."""

import asyncio
import json
from datetime import datetime, timedelta
from types import SimpleNamespace

import pytest
from sqlalchemy.orm import Session, sessionmaker

from app import worker
from app.api.models.ingestion import IngestionUpdate
from app.api.routes import ingestion as ingestion_routes
from app.database.models import Job, Project, ProjectItem, Source, User
from app.services import extraction_v2, ingestion_pipeline, jobs
from tests.unit.test_meeting_extraction import OUTPUT, FakeClient, _message

T0 = datetime(2026, 10, 5, 12, 0, 0)


@pytest.fixture
def source(db_session: Session) -> Source:
    project = Project(name="D/SEASON")
    db_session.add(project)
    db_session.flush()
    src = Source(
        project_id=project.id, source_type="meeting", title="Quinzenal", occurred_at=datetime(2026, 9, 4),
        duration_minutes=98, raw_content="33:40 - Debora\n  Soleira do mesmo revestimento.",
        ingestion_status="approved", included=True,
    )
    db_session.add(src)
    db_session.commit()
    return src


@pytest.fixture
def factory(db_session: Session):
    return sessionmaker(bind=db_session.get_bind())


class TestQueue:
    def test_claim_marks_the_oldest_due_job_running(self, db_session: Session):
        first = jobs.enqueue(db_session, "process_source", {"n": 1})
        first.run_after = T0
        jobs.enqueue(db_session, "process_source", {"n": 2}).run_after = T0 + timedelta(seconds=1)
        db_session.commit()

        claimed = jobs.claim_next(db_session, "w1", now=T0 + timedelta(minutes=1))

        assert claimed.id == first.id
        assert (claimed.status, claimed.attempts, claimed.locked_by) == ("running", 1, "w1")

    def test_jobs_scheduled_for_later_are_not_claimed(self, db_session: Session):
        jobs.enqueue(db_session, "process_source").run_after = T0 + timedelta(hours=1)
        db_session.commit()
        assert jobs.claim_next(db_session, "w1", now=T0) is None

    def test_retry_with_exponential_backoff_then_final_failure(self, db_session: Session):
        job = jobs.enqueue(db_session, "process_source", max_attempts=3)
        job.run_after = T0
        db_session.commit()

        delays = []
        for attempt in range(1, 4):
            now = job.run_after
            claimed = jobs.claim_next(db_session, "w1", now=now)
            assert claimed.attempts == attempt
            final = jobs.mark_failed(db_session, claimed, "API timeout", now=now)
            if not final:
                delays.append((claimed.run_after - now).total_seconds())

        assert delays == [30, 60]  # 30 s, then 60 s
        assert final is True and job.status == "failed" and job.last_error == "API timeout"

    def test_permanent_error_fails_immediately(self, db_session: Session):
        jobs.enqueue(db_session, "process_source").run_after = T0
        db_session.commit()
        job = jobs.claim_next(db_session, "w1", now=T0)

        assert jobs.mark_failed(db_session, job, "bad input", retryable=False) is True
        assert job.status == "failed" and job.attempts == 1

    def test_stale_running_job_is_requeued(self, db_session: Session):
        jobs.enqueue(db_session, "process_source").run_after = T0
        db_session.commit()
        job = jobs.claim_next(db_session, "dead-worker", now=T0)

        assert jobs.requeue_stale(db_session, now=T0 + timedelta(minutes=10)) == 0
        assert jobs.requeue_stale(db_session, now=T0 + timedelta(minutes=31)) == 1
        db_session.refresh(job)
        assert (job.status, job.locked_by) == ("queued", None)


@pytest.mark.postgresql
class TestConcurrentWorkers:
    def test_a_locked_job_is_skipped_by_another_worker(self, pg_engine):
        Session_ = sessionmaker(bind=pg_engine)
        setup = Session_()
        a = jobs.enqueue(setup, "process_source", {"n": 1})
        a.run_after = T0
        b = jobs.enqueue(setup, "process_source", {"n": 2})
        b.run_after = T0 + timedelta(seconds=1)
        setup.commit()
        a_id, b_id = a.id, b.id
        setup.close()

        holder = Session_()
        locked = (holder.query(Job).filter(Job.id == a_id).with_for_update().one())  # worker 1 mid-claim
        other = Session_()
        try:
            claimed = jobs.claim_next(other, "w2", now=T0 + timedelta(minutes=1))
            assert locked.id == a_id
            assert claimed.id == b_id  # skipped the locked row instead of waiting or taking it
            assert jobs.claim_next(other, "w2", now=T0 + timedelta(minutes=1)) is None
        finally:
            holder.rollback()
            holder.close()
            other.close()


@pytest.fixture
def fake_claude(monkeypatch, factory):
    def _set(message):
        monkeypatch.setattr(extraction_v2, "_client", lambda: FakeClient(message))
        monkeypatch.setattr(ingestion_pipeline, "SessionLocal", factory)
    return _set


class TestWorker:
    def test_processes_an_approved_meeting(self, db_session: Session, source, factory, fake_claude):
        fake_claude(_message(json.dumps(OUTPUT)))
        jobs.enqueue(db_session, "process_source", {"source_id": str(source.id)}, source_id=source.id)
        db_session.commit()

        assert worker.run_once("w1", session_factory=factory) is True
        assert worker.run_once("w1", session_factory=factory) is False  # queue empty

        db_session.expire_all()
        job = db_session.query(Job).one()
        assert job.status == "succeeded"
        assert db_session.get(Source, source.id).ingestion_status == "processed"
        assert db_session.query(ProjectItem).filter(ProjectItem.source_id == source.id).count() == 2

    def test_extraction_error_fails_job_and_source_without_retry(self, db_session: Session, source, factory,
                                                                 fake_claude):
        fake_claude(_message("not json"))
        jobs.enqueue(db_session, "process_source", {"source_id": str(source.id)}, source_id=source.id)
        db_session.commit()

        worker.run_once("w1", session_factory=factory)

        db_session.expire_all()
        job = db_session.query(Job).one()
        src = db_session.get(Source, source.id)
        assert (job.status, job.attempts) == ("failed", 1)
        assert src.ingestion_status == "failed"
        assert src.extraction_error.startswith("Model response is not valid JSON")

    def test_transient_error_is_retried_and_source_fails_only_at_the_end(self, db_session: Session, source,
                                                                         factory, monkeypatch):
        calls = []

        def flaky(payload):
            calls.append(payload)
            raise RuntimeError("Anthropic API overloaded")

        monkeypatch.setitem(worker.HANDLERS, "process_source", flaky)
        job = jobs.enqueue(db_session, "process_source", {"source_id": str(source.id)},
                           source_id=source.id, max_attempts=2)
        db_session.commit()

        worker.run_once("w1", session_factory=factory)
        db_session.expire_all()
        job = db_session.get(Job, job.id)
        assert job.status == "queued" and db_session.get(Source, source.id).ingestion_status == "approved"

        job.run_after = datetime.utcnow() - timedelta(seconds=1)  # skip the backoff wait
        db_session.commit()
        worker.run_once("w1", session_factory=factory)

        db_session.expire_all()
        assert len(calls) == 2
        assert db_session.get(Job, job.id).status == "failed"
        src = db_session.get(Source, source.id)
        assert src.ingestion_status == "failed" and src.extraction_error == "Anthropic API overloaded"

    @pytest.mark.parametrize("job_type, message", [
        ("fathom_import", "Story 13.4"), ("transcribe", "Story 14.1"), ("nonsense", "Unknown job type"),
    ])
    def test_unimplemented_and_unknown_job_types_fail_permanently(self, db_session: Session, factory,
                                                                  job_type, message):
        jobs.enqueue(db_session, job_type, {})
        db_session.commit()

        worker.run_once("w1", session_factory=factory)

        db_session.expire_all()
        job = db_session.query(Job).one()
        assert job.status == "failed" and message in job.last_error


class TestIngestionRoutes:
    def _director(self, db_session: Session) -> User:
        user = User(email="dir@soubim.com", password_hash="x", name="Gabriela", role="director")
        db_session.add(user)
        db_session.commit()
        return user

    def test_approving_enqueues_a_job_instead_of_running_in_the_web_process(self, db_session: Session, source):
        source.ingestion_status = "pending"
        db_session.commit()
        request = SimpleNamespace(state=SimpleNamespace(user=self._director(db_session)))

        asyncio.run(ingestion_routes.update_source_status(
            str(source.id), IngestionUpdate(ingestion_status="approved"), request, db=db_session))

        job = db_session.query(Job).one()
        assert (job.type, job.status, job.source_id) == ("process_source", "queued", source.id)
        assert job.payload == {"source_id": str(source.id)}
        assert db_session.get(Source, source.id).ingestion_status == "approved"

    def test_history_shows_approved_sources_with_their_job(self, db_session: Session, source):
        jobs.enqueue(db_session, "process_source", {"source_id": str(source.id)}, source_id=source.id)
        db_session.commit()

        request = SimpleNamespace(state=SimpleNamespace(user=self._director(db_session)))
        data = asyncio.run(ingestion_routes.list_history(
            request, project_id=None, source_type=None, date_from=None, date_to=None, limit=50, offset=0,
            db=db_session))

        row = next(s for s in data["sources"] if s["id"] == str(source.id))
        assert row["status"] == "approved"
        assert row["job"]["status"] == "queued" and row["job"]["attempts"] == 0
