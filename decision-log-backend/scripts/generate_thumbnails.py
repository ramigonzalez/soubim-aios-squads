"""Backfill meeting thumbnails for recordings already in storage (Story 13.12).

Usage (from decision-log-backend/):
  PYTHONPATH=. venv/bin/python scripts/generate_thumbnails.py --dry-run   # list what would be done
  PYTHONPATH=. venv/bin/python scripts/generate_thumbnails.py             # enqueue `thumbnail` jobs (the worker makes them)
  PYTHONPATH=. venv/bin/python scripts/generate_thumbnails.py --inline    # make them here, no worker needed (needs ffmpeg)

Candidates: meetings without a thumbnail whose recording exists in storage. Meetings that already
have a queued/running thumbnail job are skipped, so re-running is safe. Requires S3_* settings.
"""
import argparse
import logging
import sys

logging.disable(logging.INFO)

from app.database.models import Job, Source  # noqa: E402
from app.database.session import SessionLocal  # noqa: E402
from app.services import recordings, storage, thumbnails  # noqa: E402


def backfill(db, dry_run: bool = False, inline: bool = False, out=print) -> dict:
    """Returns counts {queued, generated, skipped, failed} (dry run: `queued` = would be done)."""
    counts = {"queued": 0, "generated": 0, "skipped": 0, "failed": 0}
    pending = {
        str((job.payload or {}).get("source_id"))
        for job in db.query(Job).filter(Job.type == thumbnails.JOB_TYPE, Job.status.in_(("queued", "running"))).all()
    }
    sources = (
        db.query(Source)
        .filter(Source.source_type == "meeting", Source.thumbnail_key.is_(None))
        .order_by(Source.created_at)
        .all()
    )
    for source in sources:
        label = f"{source.id} ({source.title or 'untitled'})"
        if str(source.id) in pending:
            out(f"skip {label}: a thumbnail job is already queued")
            counts["skipped"] += 1
            continue
        org_id = recordings.org_id_for_source(db, source)
        if not storage.find_key(storage.recording_prefix(org_id, str(source.id))):
            counts["skipped"] += 1  # no stored video (transcript-only, external link or local file)
            continue
        if dry_run:
            out(f"would {'generate' if inline else 'queue'} {label}")
            counts["queued"] += 1
        elif inline:
            try:
                thumbnails.generate(db, source.id)
                out(f"generated {label}")
                counts["generated"] += 1
            except Exception as exc:  # noqa: BLE001 — report and go on with the next meeting
                db.rollback()
                out(f"FAILED {label}: {exc}")
                counts["failed"] += 1
        elif thumbnails.enqueue(db, source):
            out(f"queued {label}")
            counts["queued"] += 1
        else:
            out(f"FAILED {label}: could not enqueue")
            counts["failed"] += 1
    return counts


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--dry-run", action="store_true", help="only list what would be done")
    parser.add_argument("--inline", action="store_true", help="generate here instead of enqueueing worker jobs")
    args = parser.parse_args()
    if not storage.is_enabled():
        print("Recording storage is not configured (S3_* settings).")
        return 1
    db = SessionLocal()
    try:
        counts = backfill(db, dry_run=args.dry_run, inline=args.inline)
    finally:
        db.close()
    print(counts)
    return 1 if counts["failed"] else 0


if __name__ == "__main__":
    sys.exit(main())
