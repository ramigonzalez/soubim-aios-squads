"""Firm branding shown on public client links (Promem revamp G7)."""

import base64
import re
from typing import Dict, Optional

from fastapi import HTTPException, status

from app.database.models import Organization

LOGO_TYPES = ("image/png", "image/jpeg", "image/svg+xml", "image/webp")
LOGO_MAX_BYTES = 300 * 1024
_DATA_URL = re.compile(r"^data:(image/[a-z+.-]+);base64,([A-Za-z0-9+/=\s]+)$")


def validate_logo(data_url: Optional[str]) -> Optional[str]:
    """A PNG / JPEG / SVG / WebP data URL of at most 300 KB; empty clears the logo."""
    if not data_url:
        return None
    match = _DATA_URL.match(data_url.strip())
    if not match or match.group(1) not in LOGO_TYPES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="logo_type")
    try:
        raw = base64.b64decode(match.group(2), validate=False)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="logo_type")
    if len(raw) > LOGO_MAX_BYTES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="logo_size")
    return data_url.strip()


def branding(org: Optional[Organization]) -> Optional[Dict]:
    if org is None:
        return None
    return {"name": org.name, "tagline": org.tagline, "contact_email": org.contact_email, "logo": org.logo_data}
