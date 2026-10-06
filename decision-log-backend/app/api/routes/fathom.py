"""Fathom connection endpoints (Story 13.3).

- GET    /api/integrations/fathom/connect  → {url}: the Fathom consent page (auth required)
- GET    /api/fathom/callback              → Fathom redirects here (public): parks the tokens as *pending*
- POST   /api/integrations/fathom/confirm  → the logged-in user claims the pending tokens (must match the state's user)
- GET    /api/integrations/fathom          → connection status
- DELETE /api/integrations/fathom          → disconnect (deletes the stored tokens)

The callback path must match FATHOM_REDIRECT_URI and the redirect URL registered in the Fathom app.
"""

import logging
from typing import Optional
from urllib.parse import urlencode

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.middleware.auth import get_current_user
from app.config import settings
from app.database.models import User
from app.database.session import get_db
from app.integrations import fathom
from app.services import fathom_connections
from app.services.fathom_connections import InvalidState, PendingExpired, PendingForbidden, PendingNotFound

logger = logging.getLogger(__name__)

router = APIRouter()

CALLBACK_PATH = "/fathom/callback"  # mounted under /api
SETTINGS_PAGE = "/settings/integrations"


def _require_configured() -> None:
    if not fathom.is_configured():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Fathom integration is not configured")


class ConfirmRequest(BaseModel):
    nonce: str = Field(..., min_length=1, max_length=fathom_connections.MAX_NONCE_LENGTH)


def _back_to_settings(result: str, reason: Optional[str] = None, nonce: Optional[str] = None) -> RedirectResponse:
    """Redirect to the frontend settings page — always under FRONTEND_URL (no open redirect)."""
    params = {"fathom": result}
    if reason:
        params["reason"] = reason
    if nonce:
        params["nonce"] = nonce
    url = f"{settings.frontend_url.rstrip('/')}{SETTINGS_PAGE}?{urlencode(params)}"
    return RedirectResponse(
        url,
        status_code=status.HTTP_302_FOUND,
        headers={"Cache-Control": "no-store", "Referrer-Policy": "no-referrer"},
    )


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


@router.post("/integrations/fathom/confirm")
async def fathom_confirm(body: ConfirmRequest, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Second step of the connect flow: attach the pending tokens to the logged-in user.

    Only the user who started the flow (named in the OAuth state) may confirm: 403 otherwise
    (the pending tokens are discarded), 410 when expired, 404 when unknown or already used.
    """
    _require_configured()
    try:
        fathom_connections.confirm_pending(db, user, body.nonce)
    except PendingNotFound:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unknown or already used Fathom connection request")
    except PendingExpired:
        raise HTTPException(status_code=status.HTTP_410_GONE, detail="The Fathom connection request expired, connect again")
    except PendingForbidden:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This Fathom connection was started by another user")
    logger.info("Fathom connected for user %s", user.id)
    return await fathom_status(db=db, user=user)


@router.get(CALLBACK_PATH)
def fathom_callback(
    code: Optional[str] = Query(None),
    state: Optional[str] = Query(None),
    error: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    """Fathom redirects the browser here after consent. Public (no JWT).

    Never connects directly: the tokens are parked as a pending connection and the frontend
    confirms them with the logged-in user's JWT (login-CSRF protection).
    """
    _require_configured()
    if error:
        return _back_to_settings("error", "denied" if error == "access_denied" else "fathom_error")
    if not code or not state:
        return _back_to_settings("error", "invalid_request")
    try:
        parsed = fathom_connections.parse_state(state)
    except InvalidState as exc:
        logger.warning("Fathom callback rejected: %s", exc)
        return _back_to_settings("error", "invalid_state")
    user = db.query(User).filter(User.id == parsed.user_id, User.deleted_at.is_(None)).first()
    if user is None:
        return _back_to_settings("error", "invalid_state")
    try:
        pending = fathom_connections.create_pending(db, parsed, code)
    except InvalidState as exc:
        logger.warning("Fathom callback rejected: %s", exc)
        return _back_to_settings("error", "invalid_state")
    except fathom.FathomError as exc:
        logger.warning("Fathom code exchange failed for user %s: %s", user.id, exc)
        return _back_to_settings("error", "exchange_failed")
    return _back_to_settings("pending", nonce=pending.nonce)
