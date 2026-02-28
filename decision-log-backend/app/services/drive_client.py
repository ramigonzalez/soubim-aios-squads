"""Google Drive API client for folder monitoring.

Story 10.3: Google Drive Folder Monitoring
"""

import io
import logging
import os

logger = logging.getLogger(__name__)

SCOPES = ['https://www.googleapis.com/auth/drive.readonly']

# Supported MIME types for document processing
SUPPORTED_MIME_TYPES = {
    'application/pdf': 'pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
}


class DriveClient:
    """Google Drive API client using service account credentials."""

    def __init__(self):
        from google.oauth2.service_account import Credentials
        from googleapiclient.discovery import build

        key_path = os.getenv('GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY')
        if not key_path:
            raise ValueError("GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY not configured")
        credentials = Credentials.from_service_account_file(key_path, scopes=SCOPES)
        self.service = build('drive', 'v3', credentials=credentials)

    def list_new_files(
        self,
        folder_id: str,
        since: str | None = None,
        file_types: list[str] | None = None,
    ) -> list[dict]:
        """List files in folder modified after `since` timestamp.

        Args:
            folder_id: Google Drive folder ID to list files from.
            since: ISO 8601 timestamp — only return files modified after this time.
            file_types: List of extensions to filter (e.g., ['pdf', 'docx']).

        Returns:
            List of file metadata dicts with keys: id, name, mimeType, size,
            modifiedTime, webViewLink.
        """
        query = f"'{folder_id}' in parents and trashed = false"
        if since:
            query += f" and modifiedTime > '{since}'"

        if file_types:
            mime_queries = []
            for ft in file_types:
                for mime, ext in SUPPORTED_MIME_TYPES.items():
                    if ext == ft:
                        mime_queries.append(f"mimeType = '{mime}'")
            if mime_queries:
                query += f" and ({' or '.join(mime_queries)})"

        results = self.service.files().list(
            q=query,
            fields="files(id, name, mimeType, size, modifiedTime, webViewLink)",
            orderBy="modifiedTime desc",
            pageSize=100,
        ).execute()
        return results.get('files', [])

    def download_file(self, file_id: str) -> bytes:
        """Download file content by file ID.

        Args:
            file_id: Google Drive file ID.

        Returns:
            Raw file bytes.
        """
        from googleapiclient.http import MediaIoBaseDownload

        request = self.service.files().get_media(fileId=file_id)
        buffer = io.BytesIO()
        downloader = MediaIoBaseDownload(buffer, request)
        done = False
        while not done:
            _, done = downloader.next_chunk()
        return buffer.getvalue()

    def verify_folder_access(self, folder_id: str) -> bool:
        """Check if the service account can access the folder.

        Args:
            folder_id: Google Drive folder ID.

        Returns:
            True if accessible, False otherwise.
        """
        try:
            self.service.files().get(fileId=folder_id, fields="id,name").execute()
            return True
        except Exception:
            return False
