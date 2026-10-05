"""Attach a recording to a meeting Source (Story 7.13).

Usage (from decision-log-backend/):
  PYTHONPATH=. venv/bin/python scripts/attach_recording.py SOURCE_ID VIDEO_FILE     # copy into uploads/recordings/
  PYTHONPATH=. venv/bin/python scripts/attach_recording.py SOURCE_ID https://...    # external link (e.g. Fathom share URL)
"""
import logging
import shutil
import sys
from pathlib import Path

logging.disable(logging.INFO)

from app.database.models import Source  # noqa: E402
from app.database.session import SessionLocal  # noqa: E402
from app.services.recordings import RECORDINGS_DIR, VIDEO_EXTENSIONS, recording_file  # noqa: E402


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
        existing = recording_file(str(source.id))
        if existing:
            existing.unlink()
        RECORDINGS_DIR.mkdir(parents=True, exist_ok=True)
        dst = RECORDINGS_DIR / f"{source.id}{src.suffix.lower()}"
        shutil.copyfile(src, dst)
        print(f"copied {src.stat().st_size / 1e6:.0f} MB -> {dst} for '{source.title}'")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())
