"""Background job queue on PostgreSQL (Story 13.2).

The web API enqueues jobs; workers (`python -m app.worker`) claim one at a time with
SELECT … FOR UPDATE SKIP LOCKED, so concurrent workers never run the same job.
Failed jobs are retried with exponential backoff until max_attempts.
"""

import logging
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

from sqlalchemy.orm import Session

from app.database.models import Job

logger = logging.getLogger(__name__)

RETRY_BASE_SECONDS = 30  # 30 s, 60 s, 120 s, …
STALE_AFTER = timedelta(minutes=30)  # a running job older than this lost its worker


class PermanentJobError(Exception):
    """A failure that retrying will not fix (bad input, missing handler)."""


def enqueue(
    db: Session,
    job_type: str,
    payload: Optional[Dict[str, Any]] = None,
    source_id=None,
    organization_id=None,
    max_attempts: int = 3,
) -> Job:
    """Add a job to the queue. Does not commit — it becomes visible with the caller's transaction."""
    job = Job(
        type=job_type,
        payload=payload or {},
        status="queued",
        max_attempts=max_attempts,
        run_after=datetime.utcnow(),
        source_id=source_id,
        organization_id=organization_id,
    )
    db.add(job)
    db.flush()
    return job


def claim_next(db: Session, worker_id: str, now: Optional[datetime] = None) -> Optional[Job]:
    """Lock and mark as running the oldest due job, or return None. Commits."""
    now = now or datetime.utcnow()
    job = (
        db.query(Job)
        .filter(Job.status == "queued", Job.run_after <= now)
        .order_by(Job.run_after, Job.created_at)
        .with_for_update(skip_locked=True)
        .first()
    )
    if job is None:
        db.rollback()  # release the transaction opened by the SELECT
        return None
    job.status = "running"
    job.attempts += 1
    job.locked_by = worker_id
    job.locked_at = now
    db.commit()
    return job


def mark_succeeded(db: Session, job: Job) -> None:
    job.status = "succeeded"
    job.locked_by = None
    job.locked_at = None
    job.last_error = None
    db.commit()


def mark_failed(db: Session, job: Job, error: str, retryable: bool = True, now: Optional[datetime] = None) -> bool:
    """Record a failure. Re-queues with backoff if retryable and attempts remain.

    Returns True when the job is finally failed (no more retries). Commits.
    """
    now = now or datetime.utcnow()
    job.last_error = (error or "error")[:2000]
    job.locked_by = None
    job.locked_at = None
    if retryable and job.attempts < job.max_attempts:
        job.status = "queued"
        job.run_after = now + timedelta(seconds=RETRY_BASE_SECONDS * 2 ** (job.attempts - 1))
        db.commit()
        return False
    job.status = "failed"
    db.commit()
    return True


def requeue_stale(db: Session, now: Optional[datetime] = None) -> int:
    """Put running jobs whose worker died (locked longer than STALE_AFTER) back in the queue. Commits."""
    now = now or datetime.utcnow()
    count = (
        db.query(Job)
        .filter(Job.status == "running", Job.locked_at < now - STALE_AFTER)
        .update({Job.status: "queued", Job.locked_by: None, Job.locked_at: None, Job.run_after: now},
                synchronize_session=False)
    )
    db.commit()
    if count:
        logger.warning(f"Re-queued {count} stale job(s)")
    return count


def latest_job_for_source(db: Session, source_id) -> Optional[Job]:
    return (
        db.query(Job)
        .filter(Job.source_id == source_id)
        .order_by(Job.created_at.desc())
        .first()
    )
