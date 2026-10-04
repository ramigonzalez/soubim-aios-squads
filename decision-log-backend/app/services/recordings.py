"""Meeting recordings: local storage and signed, expiring links (Story 7.13).

A browser <video> element cannot send the Bearer token, so the recording route is
public and protected instead by an HMAC signature over (source_id, expiry), issued
only to users who passed the project access check.

Local storage: uploads/recordings/<source_id>.<ext> (relative to the backend dir,
like uploads/documents). Production storage (Drive / S3) is an open decision.
"""

import hashlib
import hmac
import time
from pathlib import Path
from typing import Optional

from app.config import settings

RECORDINGS_DIR = Path("uploads/recordings")
VIDEO_EXTENSIONS = (".mp4", ".webm", ".mov", ".m4v")
LINK_TTL_SECONDS = 6 * 60 * 60


def recording_file(source_id: str) -> Optional[Path]:
    """Return the stored recording for a source, if any."""
    for ext in VIDEO_EXTENSIONS:
        path = RECORDINGS_DIR / f"{source_id}{ext}"
        if path.is_file():
            return path
    return None


def _signature(source_id: str, expires: int) -> str:
    message = f"{source_id}:{expires}".encode()
    return hmac.new(settings.jwt_secret_key.encode(), message, hashlib.sha256).hexdigest()


def signed_recording_path(source_id: str, now: Optional[float] = None) -> str:
    """Relative API path (under /api) for a recording link valid for LINK_TTL_SECONDS."""
    expires = int((now if now is not None else time.time()) + LINK_TTL_SECONDS)
    return f"/recordings/{source_id}?expires={expires}&signature={_signature(source_id, expires)}"


def verify_signature(source_id: str, expires: int, signature: str, now: Optional[float] = None) -> bool:
    """True if the signature matches and the link has not expired."""
    if expires < (now if now is not None else time.time()):
        return False
    return hmac.compare_digest(_signature(source_id, expires), signature)
