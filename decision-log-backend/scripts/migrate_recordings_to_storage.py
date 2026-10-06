"""Move local recordings (uploads/recordings/*) into object storage (Story 13.1).

Usage (from decision-log-backend/):
  PYTHONPATH=. venv/bin/python scripts/migrate_recordings_to_storage.py --dry-run
  PYTHONPATH=. venv/bin/python scripts/migrate_recordings_to_storage.py
  PYTHONPATH=. venv/bin/python scripts/migrate_recordings_to_storage.py --delete-local   # remove local files after a verified upload

Requires S3_* settings. Local files are kept unless --delete-local is given.
"""
import argparse
import logging
import sys
from uuid import UUID

logging.disable(logging.INFO)

from app.database.models import Source  # noqa: E402
from app.database.session import SessionLocal  # noqa: E402
from app.services import storage  # noqa: E402
from app.services import recordings  # noqa: E402
from app.services.recordings import CONTENT_TYPES, VIDEO_EXTENSIONS, org_id_for_source  # noqa: E402


def migrate(db, dry_run: bool = False, delete_local: bool = False, out=print) -> dict:
    """Upload every local recording to storage. Returns counts {migrated, skipped, failed}."""
    counts = {"migrated": 0, "skipped": 0, "failed": 0}
    files = sorted(p for p in recordings.RECORDINGS_DIR.glob("*") if p.is_file() and p.suffix.lower() in VIDEO_EXTENSIONS)
    for path in files:
        try:
            source = db.query(Source).filter(Source.id == str(UUID(path.stem))).first()
        except ValueError:
            source = None
        if source is None:
            out(f"skip {path.name}: no Source with id {path.stem}")
            counts["skipped"] += 1
            continue
        org_id = org_id_for_source(db, source)
        key = storage.recording_key(org_id, str(source.id), path.suffix)
        size = path.stat().st_size
        existing = storage.head(key)
        if existing and existing["size"] == size:
            out(f"skip {path.name}: already in storage ({key})")
            counts["skipped"] += 1
        elif dry_run:
            out(f"would upload {path.name} ({size / 1e6:.0f} MB) -> {key}")
            counts["migrated"] += 1
            continue
        else:
            try:
                storage.put_file(str(path), key, CONTENT_TYPES.get(path.suffix.lower(), "video/mp4"))
            except Exception as exc:
                out(f"FAILED {path.name}: {exc}")
                counts["failed"] += 1
                continue
            out(f"uploaded {path.name} ({size / 1e6:.0f} MB) -> {key}")
            counts["migrated"] += 1
        if delete_local and not dry_run:
            stored = storage.head(key)
            if stored and stored["size"] == size:
                path.unlink()
                out(f"deleted local {path.name}")
    return counts


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--dry-run", action="store_true", help="show what would be uploaded, change nothing")
    parser.add_argument("--delete-local", action="store_true", help="delete local files after a verified upload")
    args = parser.parse_args()
    if not storage.is_enabled():
        print("Storage is not configured (S3_ENDPOINT, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET)", file=sys.stderr)
        return 1
    db = SessionLocal()
    try:
        counts = migrate(db, dry_run=args.dry_run, delete_local=args.delete_local)
    finally:
        db.close()
    print(counts)
    return 1 if counts["failed"] else 0


if __name__ == "__main__":
    sys.exit(main())
