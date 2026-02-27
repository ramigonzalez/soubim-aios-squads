"""Unit tests for Gmail OAuth2 authentication service.

Story 7.4: Backend Gmail API Poller
"""

import base64
import json
import pytest
from unittest.mock import MagicMock, patch


class TestGmailAuthServiceOAuth2:
    """Test OAuth2 user credentials flow."""

    @patch("app.services.gmail_auth.settings")
    @patch("app.services.gmail_auth.build")
    @patch("app.services.gmail_auth.Request")
    @patch("app.services.gmail_auth.Credentials")
    def test_builds_oauth2_credentials_and_service(
        self, mock_creds_cls, mock_request, mock_build, mock_settings
    ):
        """OAuth2 flow builds credentials with client_id/secret/refresh_token."""
        from app.services.gmail_auth import GmailAuthService

        mock_settings.gmail_client_id = "test-client-id"
        mock_settings.gmail_client_secret = "test-client-secret"
        mock_settings.gmail_refresh_token = "test-refresh-token"
        mock_settings.gmail_service_account_json = None
        mock_settings.is_gmail_configured.return_value = True

        # Mock credentials as invalid so refresh is called
        mock_creds = MagicMock()
        mock_creds.valid = False
        mock_creds_cls.return_value = mock_creds

        mock_build.return_value = MagicMock()

        auth_service = GmailAuthService()
        service = auth_service.get_service()

        # Credentials constructed with correct params
        mock_creds_cls.assert_called_once_with(
            token=None,
            refresh_token="test-refresh-token",
            client_id="test-client-id",
            client_secret="test-client-secret",
            token_uri="https://oauth2.googleapis.com/token",
        )

        # Token refreshed because creds.valid was False
        mock_creds.refresh.assert_called_once()

        # Gmail service built
        mock_build.assert_called_once_with(
            "gmail", "v1", credentials=mock_creds, cache_discovery=False
        )
        assert service is not None

    @patch("app.services.gmail_auth.settings")
    @patch("app.services.gmail_auth.build")
    @patch("app.services.gmail_auth.Credentials")
    def test_reuses_valid_credentials(
        self, mock_creds_cls, mock_build, mock_settings
    ):
        """Valid cached credentials are reused without refresh."""
        from app.services.gmail_auth import GmailAuthService

        mock_settings.gmail_service_account_json = None
        mock_settings.is_gmail_configured.return_value = True

        # First call: create credentials
        mock_creds = MagicMock()
        mock_creds.valid = True
        mock_creds_cls.return_value = mock_creds

        auth_service = GmailAuthService()
        # Simulate first call caching credentials
        auth_service._credentials = mock_creds

        auth_service.get_service()

        # Credentials not recreated -- reused from cache
        mock_creds_cls.assert_not_called()
        mock_creds.refresh.assert_not_called()


class TestGmailAuthServiceAccount:
    """Test service account credentials flow."""

    @patch("app.services.gmail_auth.settings")
    @patch("app.services.gmail_auth.build")
    @patch("app.services.gmail_auth.service_account")
    def test_builds_service_account_credentials(
        self, mock_sa_module, mock_build, mock_settings
    ):
        """Service account flow decodes base64 JSON and builds credentials."""
        from app.services.gmail_auth import GmailAuthService

        # Create fake service account JSON
        sa_info = {"type": "service_account", "project_id": "test"}
        encoded = base64.b64encode(json.dumps(sa_info).encode()).decode()

        mock_settings.gmail_service_account_json = encoded
        mock_settings.is_gmail_configured.return_value = True

        mock_creds = MagicMock()
        mock_sa_module.Credentials.from_service_account_info.return_value = mock_creds

        auth_service = GmailAuthService()
        service = auth_service.get_service()

        mock_sa_module.Credentials.from_service_account_info.assert_called_once()
        mock_build.assert_called_once()
        assert service is not None

    @patch("app.services.gmail_auth.settings")
    def test_raises_on_invalid_service_account_json(self, mock_settings):
        """Invalid base64 JSON raises an error."""
        from app.services.gmail_auth import GmailAuthService

        mock_settings.gmail_service_account_json = "not-valid-base64!!!"
        mock_settings.is_gmail_configured.return_value = True

        auth_service = GmailAuthService()

        with pytest.raises(Exception):
            auth_service.get_service()


class TestGmailAuthServiceNotConfigured:
    """Test behavior when Gmail is not configured."""

    @patch("app.services.gmail_auth.settings")
    def test_raises_runtime_error_when_not_configured(self, mock_settings):
        """get_service raises RuntimeError if no credentials configured."""
        from app.services.gmail_auth import GmailAuthService

        mock_settings.is_gmail_configured.return_value = False

        auth_service = GmailAuthService()

        with pytest.raises(RuntimeError, match="Gmail API credentials not configured"):
            auth_service.get_service()
