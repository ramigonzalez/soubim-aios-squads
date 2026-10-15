"""Google Drive API client for folder monitoring and curation uploads.

Story 10.3: Google Drive Folder Monitoring
Story 7.7: Source Curation Workflow — upload and sync capabilities
"""

import io
import json
import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)

# Story 7.7: expanded scopes — drive.file allows creating/editing files the app created
SCOPES = [
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/drive.file',
]

# Supported MIME types for document processing
SUPPORTED_MIME_TYPES = {
    'application/pdf': 'pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
}


FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder'


def service_account_info() -> Optional[dict]:
    """The service account key as a dict, or None when not configured.

    Story 12.9: ``GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY`` holds either the key JSON itself (Railway variables)
    or the path to the key file (local development, Story 10.3).
    """
    from app.config import settings

    value = (settings.google_drive_service_account_key or os.getenv('GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY') or '').strip()
    if not value:
        return None
    if value.startswith('{'):
        return json.loads(value)
    with open(value) as f:
        return json.load(f)


def service_account_email() -> Optional[str]:
    """The e-mail organizations share their folders with (Story 12.9), or None when not configured."""
    try:
        info = service_account_info()
    except (OSError, ValueError):
        logger.exception("Drive service account key could not be read")
        return None
    return info.get('client_email') if info else None


class DriveClient:
    """Google Drive API client using service account credentials."""

    def __init__(self):
        from google.oauth2.service_account import Credentials
        from googleapiclient.discovery import build

        info = service_account_info()
        if not info:
            raise ValueError("GOOGLE_DRIVE_SERVICE_ACCOUNT_KEY not configured")
        credentials = Credentials.from_service_account_info(info, scopes=SCOPES)
        self.service = build('drive', 'v3', credentials=credentials, cache_discovery=False)

    def list_shared_folders(self) -> list[dict]:
        """Folders shared with the service account, with who shared them (Story 12.9).

        Returns:
            List of dicts with keys: id, name, sharingUser ({emailAddress, displayName}),
            sharedWithMeTime, webViewLink.
        """
        folders: list[dict] = []
        page_token = None
        while True:
            results = self.service.files().list(
                q=f"sharedWithMe and mimeType = '{FOLDER_MIME_TYPE}' and trashed = false",
                fields="nextPageToken, files(id, name, sharingUser(emailAddress, displayName), "
                       "sharedWithMeTime, webViewLink)",
                orderBy="sharedWithMeTime desc",
                pageSize=200,
                pageToken=page_token,
            ).execute()
            folders.extend(results.get('files', []))
            page_token = results.get('nextPageToken')
            if not page_token:
                return folders

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

    def upload_file(self, folder_id: str, filename: str, content: str, mime_type: str = 'text/plain') -> dict:
        """Upload a file to a Drive folder.

        Story 7.7: Used by curation workflow to upload source content for human review.

        Args:
            folder_id: Google Drive folder ID to upload into.
            filename: Name for the uploaded file.
            content: Text content to upload.
            mime_type: MIME type of the content (default: text/plain).

        Returns:
            File metadata dict with id, name, webViewLink.
        """
        from googleapiclient.http import MediaInMemoryUpload

        file_metadata = {
            'name': filename,
            'parents': [folder_id],
        }
        media = MediaInMemoryUpload(content.encode('utf-8'), mimetype=mime_type)
        file = self.service.files().create(
            body=file_metadata,
            media_body=media,
            fields='id, name, webViewLink, modifiedTime',
        ).execute()
        logger.info(f"Uploaded file '{filename}' to folder {folder_id}: {file.get('id')}")
        return file

    def get_file_metadata(self, file_id: str) -> dict:
        """Get file metadata including modifiedTime.

        Story 7.7: Used to check if a file has been modified since last sync.

        Args:
            file_id: Google Drive file ID.

        Returns:
            File metadata dict with id, name, modifiedTime, size.
        """
        return self.service.files().get(
            fileId=file_id,
            fields='id, name, modifiedTime, size',
        ).execute()

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
