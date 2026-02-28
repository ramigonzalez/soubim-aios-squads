"""Tests for Google Drive folder monitoring service.

Story 10.3: Google Drive Folder Monitoring
"""

import pytest
from unittest.mock import MagicMock, patch
from datetime import datetime, timezone

from app.services.drive_monitor import DriveMonitor


class TestDriveMonitor:
    """Tests for DriveMonitor service."""

    def _make_mock_project(self, drive_folder_id='folder-123', last_poll=None):
        """Create a mock Project with Drive monitoring fields."""
        project = MagicMock()
        project.id = 'proj-1'
        project.name = 'Test Project'
        project.drive_folder_id = drive_folder_id
        project.last_drive_poll = last_poll
        return project

    def _make_mock_file(
        self,
        file_id='file-1',
        name='test.pdf',
        mime='application/pdf',
        size='1024',
    ):
        """Create a mock Drive file metadata dict."""
        return {
            'id': file_id,
            'name': name,
            'mimeType': mime,
            'size': size,
            'modifiedTime': '2026-02-28T10:00:00Z',
            'webViewLink': f'https://drive.google.com/file/d/{file_id}',
        }

    @patch('app.services.drive_monitor.DriveClient')
    @patch('app.services.drive_monitor.DocumentProcessor')
    def test_poll_skips_duplicate_files(self, mock_processor_cls, mock_drive_cls):
        """Monitor skips files that already have a Source record (by drive_file_id)."""
        mock_db = MagicMock()
        mock_drive = MagicMock()
        mock_drive_cls.return_value = mock_drive
        mock_processor_cls.return_value = MagicMock()

        # File already exists in database
        mock_db.query().filter().first.return_value = MagicMock()  # existing source

        project = self._make_mock_project()
        mock_drive.list_new_files.return_value = [self._make_mock_file()]

        monitor = DriveMonitor(mock_db)
        monitor._poll_project(project)

        # Should not attempt download since file already exists
        mock_drive.download_file.assert_not_called()

    @patch('app.services.drive_monitor.DriveClient')
    @patch('app.services.drive_monitor.DocumentProcessor')
    def test_poll_creates_source_for_new_file(self, mock_processor_cls, mock_drive_cls):
        """Monitor creates Source record for new files."""
        mock_db = MagicMock()
        mock_drive = MagicMock()
        mock_drive_cls.return_value = mock_drive
        mock_processor = MagicMock()
        mock_processor_cls.return_value = mock_processor

        # No existing source — file is new
        mock_db.query().filter().first.return_value = None
        mock_drive.list_new_files.return_value = [self._make_mock_file()]
        mock_drive.download_file.return_value = b'fake pdf content'
        mock_processor.extract_text.return_value = 'Extracted text'

        project = self._make_mock_project()

        with patch('app.services.drive_monitor.os.makedirs'):
            with patch('builtins.open', MagicMock()):
                monitor = DriveMonitor(mock_db)
                monitor._poll_project(project)

        # Source added to session
        mock_db.add.assert_called_once()
        source = mock_db.add.call_args[0][0]
        assert source.source_type == 'document'
        assert source.ingestion_status == 'pending'
        assert source.drive_file_id == 'file-1'

    @patch('app.services.drive_monitor.DriveClient')
    @patch('app.services.drive_monitor.DocumentProcessor')
    def test_poll_updates_last_poll_timestamp(self, mock_processor_cls, mock_drive_cls):
        """Monitor updates project's last_drive_poll after polling."""
        mock_db = MagicMock()
        mock_drive = MagicMock()
        mock_drive_cls.return_value = mock_drive
        mock_processor_cls.return_value = MagicMock()

        mock_drive.list_new_files.return_value = []
        project = self._make_mock_project()

        monitor = DriveMonitor(mock_db)
        monitor._poll_project(project)

        assert project.last_drive_poll is not None
        mock_db.commit.assert_called()

    @patch('app.services.drive_monitor.DriveClient')
    @patch('app.services.drive_monitor.DocumentProcessor')
    def test_poll_all_projects_queries_configured_projects(
        self, mock_processor_cls, mock_drive_cls
    ):
        """poll_all_projects only queries projects with drive_folder_id set."""
        mock_db = MagicMock()
        mock_drive_cls.return_value = MagicMock()
        mock_processor_cls.return_value = MagicMock()

        # Return empty project list
        mock_db.query().filter().all.return_value = []

        monitor = DriveMonitor(mock_db)
        monitor.poll_all_projects()

        # Verify query was made
        mock_db.query.assert_called()

    @patch('app.services.drive_monitor.DriveClient')
    @patch('app.services.drive_monitor.DocumentProcessor')
    def test_poll_handles_download_failure_gracefully(
        self, mock_processor_cls, mock_drive_cls
    ):
        """Monitor skips files when download fails."""
        mock_db = MagicMock()
        mock_drive = MagicMock()
        mock_drive_cls.return_value = mock_drive
        mock_processor_cls.return_value = MagicMock()

        # No existing source — file is new
        mock_db.query().filter().first.return_value = None
        mock_drive.list_new_files.return_value = [self._make_mock_file()]
        mock_drive.download_file.side_effect = Exception("Download failed")

        project = self._make_mock_project()
        monitor = DriveMonitor(mock_db)

        # Should not raise — error is caught and logged
        monitor._poll_project(project)

        # Source not added since download failed
        mock_db.add.assert_not_called()

    @patch('app.services.drive_monitor.DriveClient')
    @patch('app.services.drive_monitor.DocumentProcessor')
    def test_poll_handles_text_extraction_failure(
        self, mock_processor_cls, mock_drive_cls
    ):
        """Monitor creates Source with empty content when extraction fails."""
        mock_db = MagicMock()
        mock_drive = MagicMock()
        mock_drive_cls.return_value = mock_drive
        mock_processor = MagicMock()
        mock_processor_cls.return_value = mock_processor

        # No existing source
        mock_db.query().filter().first.return_value = None
        mock_drive.list_new_files.return_value = [self._make_mock_file()]
        mock_drive.download_file.return_value = b'corrupted content'
        mock_processor.extract_text.side_effect = Exception("Extraction failed")

        project = self._make_mock_project()

        with patch('app.services.drive_monitor.os.makedirs'):
            with patch('builtins.open', MagicMock()):
                monitor = DriveMonitor(mock_db)
                monitor._poll_project(project)

        # Source still created with empty raw_content
        mock_db.add.assert_called_once()
        source = mock_db.add.call_args[0][0]
        assert source.raw_content == ""

    @patch('app.services.drive_monitor.DriveClient')
    @patch('app.services.drive_monitor.DocumentProcessor')
    def test_poll_project_error_does_not_stop_others(
        self, mock_processor_cls, mock_drive_cls
    ):
        """poll_all_projects continues to next project when one fails."""
        mock_db = MagicMock()
        mock_drive = MagicMock()
        mock_drive_cls.return_value = mock_drive
        mock_processor_cls.return_value = MagicMock()

        # Two projects — first will fail
        project1 = self._make_mock_project(drive_folder_id='folder-bad')
        project2 = self._make_mock_project(drive_folder_id='folder-good')
        mock_db.query().filter().all.return_value = [project1, project2]

        # First project fails, second succeeds
        mock_drive.list_new_files.side_effect = [
            Exception("Folder not found"),
            [],
        ]

        monitor = DriveMonitor(mock_db)
        # Should not raise — continues past project1 failure
        monitor.poll_all_projects()

        # list_new_files called for both projects
        assert mock_drive.list_new_files.call_count == 2

    @patch('app.services.drive_monitor.DriveClient')
    @patch('app.services.drive_monitor.DocumentProcessor')
    def test_poll_passes_since_timestamp(self, mock_processor_cls, mock_drive_cls):
        """Monitor passes last_drive_poll as since parameter."""
        mock_db = MagicMock()
        mock_drive = MagicMock()
        mock_drive_cls.return_value = mock_drive
        mock_processor_cls.return_value = MagicMock()

        last_poll = datetime(2026, 2, 27, 12, 0, 0)
        project = self._make_mock_project(last_poll=last_poll)
        mock_drive.list_new_files.return_value = []

        monitor = DriveMonitor(mock_db)
        monitor._poll_project(project)

        # Verify since was passed
        call_kwargs = mock_drive.list_new_files.call_args
        assert call_kwargs[1]['since'] is not None
        assert '2026-02-27' in call_kwargs[1]['since']

    @patch('app.services.drive_monitor.DriveClient')
    @patch('app.services.drive_monitor.DocumentProcessor')
    def test_poll_first_time_no_since(self, mock_processor_cls, mock_drive_cls):
        """First poll (no last_drive_poll) passes since=None."""
        mock_db = MagicMock()
        mock_drive = MagicMock()
        mock_drive_cls.return_value = mock_drive
        mock_processor_cls.return_value = MagicMock()

        project = self._make_mock_project(last_poll=None)
        mock_drive.list_new_files.return_value = []

        monitor = DriveMonitor(mock_db)
        monitor._poll_project(project)

        call_kwargs = mock_drive.list_new_files.call_args
        assert call_kwargs[1]['since'] is None
