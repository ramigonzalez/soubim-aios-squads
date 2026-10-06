"""Background worker (Story 13.2): `python -m app.worker`.

Claims jobs from the `jobs` table and runs their handler. Same codebase as the API,
separate process (a second service on Railway, 13.8). Stops gracefully on SIGTERM/SIGINT
after the current job.
"""

import logging
import os
import signal
import socket
import time
from typing import Callable, Dict

from sqlalchemy.orm import Session

from app.database.models import Source
from app.database.session import SessionLocal
from app.services import jobs
from app.services.extraction_v2 import ExtractionError

logger = logging.getLogger("app.worker")

POLL_SECONDS = float(os.getenv("WORKER_POLL_SECONDS", "2"))
STALE_CHECK_SECONDS = 60


def handle_process_source(payload: dict) -> None:
    """Run the ingestion pipeline for an approved source (meeting, email, document)."""
    from app.services.ingestion_pipeline import process_approved_source

    process_approved_source(payload["source_id"], raise_errors=True)


def handle_fathom_import(payload: dict) -> None:
    """Download a picked Fathom recording into storage and create its meeting (Story 13.4)."""
    from app.services.fathom_import import run_import

    run_import(payload["import_id"])


def _not_implemented(story: str) -> Callable[[dict], None]:
    def handler(payload: dict) -> None:
        raise jobs.PermanentJobError(f"Job type not implemented yet (Story {story})")
    return handler


HANDLERS: Dict[str, Callable[[dict], None]] = {
    "process_source": handle_process_source,
    "fathom_import": handle_fathom_import,
    "transcribe": _not_implemented("14.1"),
}

# Errors that retrying will not fix: the job fails immediately
PERMANENT_ERRORS = (jobs.PermanentJobError, ExtractionError, KeyError, ValueError)


def _mark_source_failed(db: Session, source_id, error: str) -> None:
    source = db.query(Source).filter(Source.id == source_id).first()
    if source and source.ingestion_status != "processed":
        source.ingestion_status = "failed"
        source.extraction_error = error[:2000]
        db.commit()


def run_once(worker_id: str, session_factory=SessionLocal) -> bool:
    """Claim and run one job. Returns False when the queue had nothing due."""
    db = session_factory()
    try:
        job = jobs.claim_next(db, worker_id)
        if job is None:
            return False
        handler = HANDLERS.get(job.type)
        logger.info(f"Running job {job.id} type={job.type} attempt={job.attempts}/{job.max_attempts}")
        try:
            if handler is None:
                raise jobs.PermanentJobError(f"Unknown job type: {job.type}")
            handler(job.payload or {})
        except Exception as e:  # noqa: BLE001 — every failure is recorded on the job
            db.rollback()
            error = str(e) or e.__class__.__name__
            finally_failed = jobs.mark_failed(db, job, error, retryable=not isinstance(e, PERMANENT_ERRORS))
            logger.warning(f"Job {job.id} failed ({'final' if finally_failed else 'will retry'}): {error}")
            if finally_failed and job.source_id:
                _mark_source_failed(db, job.source_id, error)
            return True
        jobs.mark_succeeded(db, job)
        logger.info(f"Job {job.id} succeeded")
        return True
    finally:
        db.close()


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
    worker_id = f"{socket.gethostname()}:{os.getpid()}"
    stopping = {"flag": False}

    def stop(signum, _frame):
        logger.info(f"Signal {signum} received — finishing the current job, then stopping")
        stopping["flag"] = True

    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)
    logger.info(f"Worker {worker_id} started (handlers: {', '.join(HANDLERS)})")

    last_stale_check = 0.0
    while not stopping["flag"]:
        if time.monotonic() - last_stale_check > STALE_CHECK_SECONDS:
            db = SessionLocal()
            try:
                jobs.requeue_stale(db)
            finally:
                db.close()
            last_stale_check = time.monotonic()
        try:
            worked = run_once(worker_id)
        except Exception:  # noqa: BLE001 — keep the worker alive (e.g. database briefly unavailable)
            logger.exception("Worker loop error")
            worked = False
        if not worked:
            time.sleep(POLL_SECONDS)
    logger.info("Worker stopped")


if __name__ == "__main__":
    main()
