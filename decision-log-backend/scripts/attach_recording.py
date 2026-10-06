"""Attach a recording to a meeting Source (Stories 7.13, 13.1).

Usage (from decision-log-backend/):
  PYTHONPATH=. venv/bin/python scripts/attach_recording.py SOURCE_ID VIDEO_FILE     # storage if configured, else uploads/recordings/
  PYTHONPATH=. venv/bin/python scripts/attach_recording.py SOURCE_ID https://...    # external link (e.g. Fathom share URL)
"""
import logging
import shutil
import sys
from pathlib import Path

logging.disable(logging.INFO)

from app.database.models import Source  # noqa: E402
from app.database.session import SessionLocal  # noqa: E402
from app.services import recordings, storage  # noqa: E402
from app.services.recordings import (  # noqa: E402
    CONTENT_TYPES,
    VIDEO_EXTENSIONS,
    org_id_for_source,
    recording_file,
)


def attach_file(db, source, src: Path) -> str:
    """Store a video for the source: object storage when enabled, else local disk. Returns a message."""
    size_mb = src.stat().st_size / 1e6
    ext = src.suffix.lower()
    if storage.is_enabled():
        org_id = org_id_for_source(db, source)
        prefix = storage.recording_prefix(org_id, str(source.id))
        old_key = storage.find_key(prefix)
        key = storage.recording_key(org_id, str(source.id), ext)
        storage.put_file(str(src), key, CONTENT_TYPES.get(ext, "video/mp4"))  # size guard inside
        if old_key and old_key != key:
            storage.delete(old_key)
        return f"uploaded {size_mb:.0f} MB -> storage:{key} for '{source.title}'"

    storage.check_size(src.stat().st_size)
    existing = recording_file(str(source.id))
    if existing:
        existing.unlink()
    recordings.RECORDINGS_DIR.mkdir(parents=True, exist_ok=True)
    dst = recordings.RECORDINGS_DIR / f"{source.id}{ext}"
    shutil.copyfile(src, dst)
    return f"copied {size_mb:.0f} MB -> {dst} for '{source.title}'"


def main() -> int:
    if len(sys.argv) != 3:
        print(__doc__, file=sys.stderr)
        return 1
    source_id, target = sys.argv[1], sys.argv[2]

    db = SessionLocal()
    try:
        source = db.query(Source).filter(Source.id == source_id).first()
        if source is None:
            print(f"Source {source_id} not found", file=sys.stderr)
            return 1

        if target.startswith(("http://", "https://")):
            source.recording_url = target
            db.commit()
            print(f"recording link set for '{source.title}'")
            return 0

        src = Path(target)
        if not src.is_file() or src.suffix.lower() not in VIDEO_EXTENSIONS:
            print(f"Not a video file ({', '.join(VIDEO_EXTENSIONS)}): {target}", file=sys.stderr)
            return 1
        try:
            print(attach_file(db, source, src))
        except storage.RecordingTooLarge as exc:
            print(f"Refused: {exc}", file=sys.stderr)
            return 1
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())
