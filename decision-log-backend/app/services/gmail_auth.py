"""Gmail OAuth2 authentication service.

Supports two authentication flows:
- Service account (recommended for production/server-to-server)
- OAuth2 user credentials with refresh token (for development/personal Gmail)

Story 7.4: Backend Gmail API Poller
"""

import base64
import json
import logging
from typing import Optional

from google.oauth2 import service_account
from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

from app.config import settings

logger = logging.getLogger(__name__)

GMAIL_SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]


class GmailAuthService:
    """Handles Gmail API authentication and token refresh."""

    def __init__(self):
        self._credentials: Optional[Credentials] = None
        self._service = None

    def get_service(self):
        """
        Return an authenticated Gmail API service client.

        Refreshes credentials automatically if expired.

        Returns:
            googleapiclient Resource object for Gmail API v1

        Raises:
            RuntimeError: If Gmail credentials are not configured
            google.auth.exceptions.RefreshError: If token refresh fails
        """
        if not settings.is_gmail_configured():
            raise RuntimeError(
                "Gmail API credentials not configured. "
                "Set GMAIL_CLIENT_ID + GMAIL_CLIENT_SECRET + GMAIL_REFRESH_TOKEN "
                "or GMAIL_SERVICE_ACCOUNT_JSON in environment."
            )

        credentials = self._get_or_refresh_credentials()
        self._service = build(
            "gmail", "v1", credentials=credentials, cache_discovery=False
        )
        return self._service

    def _get_or_refresh_credentials(self) -> Credentials:
        """Build or refresh OAuth2 credentials."""
        # Service account path (preferred for server-to-server)
        if settings.gmail_service_account_json:
            return self._build_service_account_credentials()

        # OAuth2 user credentials path
        return self._build_oauth2_credentials()

    def _build_service_account_credentials(self) -> Credentials:
        """Build credentials from base64-encoded service account JSON."""
        try:
            json_bytes = base64.b64decode(settings.gmail_service_account_json)
            service_account_info = json.loads(json_bytes)
            credentials = service_account.Credentials.from_service_account_info(
                service_account_info,
                scopes=GMAIL_SCOPES,
            )
            logger.debug("Gmail: Using service account credentials")
            return credentials
        except Exception as e:
            logger.error(f"Gmail: Failed to build service account credentials: {e}")
            raise

    def _build_oauth2_credentials(self) -> Credentials:
        """Build OAuth2 user credentials, refreshing if expired."""
        if self._credentials and self._credentials.valid:
            return self._credentials

        credentials = Credentials(
            token=None,
            refresh_token=settings.gmail_refresh_token,
            client_id=settings.gmail_client_id,
            client_secret=settings.gmail_client_secret,
            token_uri="https://oauth2.googleapis.com/token",
        )

        if not credentials.valid:
            logger.info("Gmail: Refreshing OAuth2 access token")
            credentials.refresh(Request())

        self._credentials = credentials
        logger.debug("Gmail: OAuth2 credentials ready")
        return credentials


# Singleton instance
gmail_auth_service = GmailAuthService()
