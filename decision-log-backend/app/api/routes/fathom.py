"""Fathom connection endpoints (Story 13.3).

- GET    /api/integrations/fathom/connect  → {url}: the Fathom consent page (auth required)
- GET    /api/fathom/callback              → Fathom redirects here (public; the signed state identifies the user)
- GET    /api/integrations/fathom          → connection status
- DELETE /api/integrations/fathom          → disconnect (deletes the stored tokens)

The callback path must match FATHOM_REDIRECT_URI and the redirect URL registered in the Fathom app.
"""

import logging
from typing import Optional
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.api.middleware.auth import get_current_user
from app.config import settings
from app.database.models import User
from app.database.session import get_db
from app.integrations import fathom
from app.services import fathom_connections
from app.services.fathom_connections import InvalidState

logger = logging.getLogger(__name__)

router = APIRouter()

CALLBACK_PATH = "/fathom/callback"  # mounted under /api
SETTINGS_PAGE = "/settings/integrations"


def _require_configured() -> None:
    if not fathom.is_configured():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fathom integration is not configured")


def _back_to_settings(result: str, reason: Optional[str] = None) -> RedirectResponse:
    params = {"fathom": result}
    if reason:
        params["reason"] = reason
    url = f"{settings.frontend_url.rstrip('/')}{SETTINGS_PAGE}?{urlencode(params)}"
    return RedirectResponse(url, status_code=status.HTTP_302_FOUND)


@router.get("/integrations/fathom")
async def fathom_status(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Is the current user's Fathom account connected?"""
    configured = fathom.is_configured()
    conn = fathom_connections.get_connection(db, user) if configured else None
    return {
        "configured": configured,
        "connected": conn is not None,
        "needs_reconnect": bool(conn and conn.needs_reconnect),
        "account_label": conn.account_label if conn else None,
        "connected_at": conn.connected_at.isoformat() if conn and conn.connected_at else None,
    }


@router.get("/integrations/fathom/connect")
async def fathom_connect(user=Depends(get_current_user)):
    """URL of the Fathom consent page; the frontend sends the browser there."""
    _require_configured()
    return {"url": fathom.authorize_url(fathom_connections.sign_state(user.id))}


@router.delete("/integrations/fathom", status_code=status.HTTP_204_NO_CONTENT)
async def fathom_disconnect(db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Disconnect: delete the stored tokens."""
    if not fathom_connections.delete_connection(db, user):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fathom is not connected")


@router.get(CALLBACK_PATH)
def fathom_callback(
    code: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    error: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Fathom redirects the browser here after consent. Public: no JWT, the signed state names the user."""
    _require_configured()
    if error:
        return _back_to_settings("error", "denied" if error == "access_denied" else "fathom_error")
    if not code or not state:
        return _back_to_settings("error", "invalid_request")
    try:
        user_id = fathom_connections.verify_state(state)
    except InvalidState as exc:
        logger.warning("Fathom callback rejected: %s", exc)
        return _back_to_settings("error", "invalid_state")
    user = db.query(User).filter(User.id == user_id, User.deleted_at.is_(None)).first()
    if user is None:
        return _back_to_settings("error", "invalid_state")
    try:
        fathom_connections.complete_connection(db, user, code)
    except fathom.FathomError as exc:
        logger.warning("Fathom connection failed for user %s: %s", user.id, exc)
        return _back_to_settings("error", "exchange_failed")
    logger.info("Fathom connected for user %s", user.id)
    return _back_to_settings("connected")
