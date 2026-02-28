"""Tests for Google Drive API client.

Story 10.3: Google Drive Folder Monitoring
"""

import os
import pytest
from unittest.mock import MagicMock, patch

from app.services.drive_client import DriveClient, SUPPORTED_MIME_TYPES


# Patch targets: the actual module paths for lazy imports inside DriveClient.__init__
_CREDS_PATH = 'google.oauth2.service_account.Credentials'
_BUILD_PATH = 'googleapiclient.discovery.build'


class TestSupportedMimeTypes:
    """Tests for MIME type constants."""

    def test_pdf_mapping(self):
        """Verify PDF MIME type maps to 'pdf'."""
        assert SUPPORTED_MIME_TYPES['application/pdf'] == 'pdf'

    def test_docx_mapping(self):
        """Verify DOCX MIME type maps to 'docx'."""
        mime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        assert SUPPORTED_MIME_TYPES[mime] == 'docx'

    def test_only_two_types_supported(self):
        """Only PDF and DOCX are supported."""
        assert len(SUPPORTED_MIME_TYPES) == 2


class TestDriveClientInit:
    """Tests for DriveClient initialization."""

    def test_raises_without_credentials(self):
        """DriveClient raises ValueError when service account key not set."""
        with patch.dict(os.environ, {}, clear=True):
            os.environ.pop('GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY', None)
            with pytest.raises(ValueError, match="GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY"):
                DriveClient()

    @patch(_BUILD_PATH)
    @patch(_CREDS_PATH)
    def test_init_with_valid_credentials(self, mock_creds_cls, mock_build):
        """DriveClient initializes successfully with service account key."""
        mock_creds_cls.from_service_account_file.return_value = MagicMock()
        mock_build.return_value = MagicMock()

        with patch.dict(os.environ, {'GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY': '/fake/key.json'}):
            client = DriveClient()
            assert client.service is not None

        mock_creds_cls.from_service_account_file.assert_called_once()
        mock_build.assert_called_once_with(
            'drive', 'v3',
            credentials=mock_creds_cls.from_service_account_file.return_value,
        )


class TestDriveClientListFiles:
    """Tests for DriveClient.list_new_files."""

    def _make_client(self):
        """Helper to create a DriveClient with mocked credentials."""
        with patch(_BUILD_PATH) as mock_build, \
             patch(_CREDS_PATH) as mock_creds_cls, \
             patch.dict(os.environ, {'GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY': '/fake/key.json'}):
            mock_creds_cls.from_service_account_file.return_value = MagicMock()
            mock_service = MagicMock()
            mock_build.return_value = mock_service
            client = DriveClient()
        return client, mock_service

    def test_list_files_basic_query(self):
        """list_new_files builds correct query for folder."""
        client, mock_service = self._make_client()
        mock_service.files().list().execute.return_value = {'files': []}

        client.list_new_files('folder-123')

        # Verify the list call was made
        mock_service.files().list.assert_called()

    def test_list_files_returns_files(self):
        """list_new_files returns file list from API response."""
        client, mock_service = self._make_client()
        expected_files = [
            {'id': 'f1', 'name': 'test.pdf', 'mimeType': 'application/pdf'},
        ]
        mock_service.files().list().execute.return_value = {'files': expected_files}

        result = client.list_new_files('folder-123')
        assert result == expected_files

    def test_list_files_empty_response(self):
        """list_new_files returns empty list when no files found."""
        client, mock_service = self._make_client()
        mock_service.files().list().execute.return_value = {}

        result = client.list_new_files('folder-123')
        assert result == []


class TestDriveClientVerifyAccess:
    """Tests for DriveClient.verify_folder_access."""

    def _make_client(self):
        """Helper to create a DriveClient with mocked credentials."""
        with patch(_BUILD_PATH) as mock_build, \
             patch(_CREDS_PATH) as mock_creds_cls, \
             patch.dict(os.environ, {'GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY': '/fake/key.json'}):
            mock_creds_cls.from_service_account_file.return_value = MagicMock()
            mock_service = MagicMock()
            mock_build.return_value = mock_service
            client = DriveClient()
        return client, mock_service

    def test_verify_access_success(self):
        """verify_folder_access returns True when folder is accessible."""
        client, mock_service = self._make_client()
        mock_service.files().get().execute.return_value = {'id': 'folder-123', 'name': 'Test'}

        assert client.verify_folder_access('folder-123') is True

    def test_verify_access_failure(self):
        """verify_folder_access returns False when folder is inaccessible."""
        client, mock_service = self._make_client()
        mock_service.files().get().execute.side_effect = Exception("Not found")

        assert client.verify_folder_access('bad-folder') is False
