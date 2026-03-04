"""Source curation service — upload to external storage and sync back.

Story 7.7: Source Curation Workflow
- Upload source raw_content to Google Drive for human curation
- Check for modifications and sync curated content back
- Strategy pattern: storage backend abstraction for future S3 support
"""

import logging
from abc import ABC, abstractmethod
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.database.models import Source, Project

logger = logging.getLogger(__name__)


class StorageBackend(ABC):
    """Abstract storage backend for curation workflow."""

    @abstractmethod
    def upload(self, folder_id: str, filename: str, content: str) -> dict:
        """Upload content and return metadata with file_id."""

    @abstractmethod
    def download(self, file_id: str) -> str:
        """Download content by file ID."""

    @abstractmethod
    def get_modified_time(self, file_id: str) -> datetime | None:
        """Get last modified time of a file."""


class GoogleDriveBackend(StorageBackend):
    """Google Drive storage backend."""

    def __init__(self):
        from app.services.drive_client import DriveClient
        self._client = DriveClient()

    def upload(self, folder_id: str, filename: str, content: str) -> dict:
        result = self._client.upload_file(folder_id, filename, content)
        return {
            'file_id': result['id'],
            'web_link': result.get('webViewLink'),
        }

    def download(self, file_id: str) -> str:
        raw_bytes = self._client.download_file(file_id)
        return raw_bytes.decode('utf-8', errors='replace')

    def get_modified_time(self, file_id: str) -> datetime | None:
        meta = self._client.get_file_metadata(file_id)
        mod_time = meta.get('modifiedTime')
        if mod_time:
            return datetime.fromisoformat(mod_time.replace('Z', '+00:00'))
        return None


class SourceCurationService:
    """Manages source content curation through external storage.

    Workflow: source created → upload to storage → human curates → sync back.
    """

    def __init__(self, db: Session, backend: StorageBackend | None = None):
        self.db = db
        self._backend = backend

    @property
    def backend(self) -> StorageBackend:
        if self._backend is None:
            self._backend = GoogleDriveBackend()
        return self._backend

    def upload_to_storage(self, source_id: str) -> bool:
        """Upload source raw_content to external storage for curation.

        Sets curation_status to 'uploaded' and stores the file reference.

        Returns:
            True if successful, False otherwise.
        """
        source = self.db.query(Source).filter(Source.id == source_id).first()
        if not source:
            logger.warning(f"Source {source_id} not found for upload")
            return False

        if not source.raw_content:
            logger.warning(f"Source {source_id} has no raw_content to upload")
            return False

        # Find the project's Drive folder
        project = self.db.query(Project).filter(Project.id == source.project_id).first()
        if not project or not project.drive_folder_id:
            logger.warning(f"Project for source {source_id} has no drive_folder_id configured")
            return False

        # Build filename from source metadata
        safe_title = (source.title or 'untitled').replace('/', '-')[:100]
        filename = f"[{source.source_type}] {safe_title}.txt"

        try:
            result = self.backend.upload(project.drive_folder_id, filename, source.raw_content)
            source.drive_file_id = result['file_id']
            source.file_url = result.get('web_link')
            source.curation_status = 'uploaded'
            source.last_synced_at = datetime.now(timezone.utc)
            self.db.commit()
            logger.info(f"Source {source_id} uploaded to storage: {result['file_id']}")
            return True
        except Exception as e:
            logger.error(f"Failed to upload source {source_id}: {e}")
            self.db.rollback()
            return False

    def check_for_updates(self, source_id: str) -> bool:
        """Check if a source's curated content has been modified and sync back.

        Only syncs if file hasn't been modified in last 5 minutes (race condition guard).
        Skips document sources (PDF/DOCX) — their raw_content is extracted text,
        not the original binary, so re-downloading would corrupt data.

        Returns:
            True if content was synced, False if no changes or error.
        """
        source = self.db.query(Source).filter(Source.id == source_id).first()
        if not source or not source.drive_file_id:
            return False

        if source.curation_status not in ('uploaded', 'curated'):
            return False

        # Skip binary document sources — raw_content is extracted text, not the original file
        if source.source_type == 'document' and source.file_type in ('pdf', 'docx'):
            logger.debug(f"Source {source_id}: skipping sync for binary document ({source.file_type})")
            return False

        try:
            modified_time = self.backend.get_modified_time(source.drive_file_id)
            if not modified_time:
                return False

            # Skip if file was modified less than 5 minutes ago (may be mid-edit)
            now_utc = datetime.now(timezone.utc)
            if modified_time > now_utc - timedelta(minutes=5):
                logger.debug(f"Source {source_id}: file modified too recently, skipping")
                return False

            # Check if file was modified since last sync
            if source.last_synced_at:
                last_synced_aware = source.last_synced_at.replace(tzinfo=timezone.utc) if source.last_synced_at.tzinfo is None else source.last_synced_at
                if modified_time <= last_synced_aware:
                    return False

            # Download updated content
            updated_content = self.backend.download(source.drive_file_id)
            source.raw_content = updated_content
            source.curation_status = 'curated'
            source.last_synced_at = datetime.now(timezone.utc)
            self.db.commit()
            logger.info(f"Source {source_id}: synced curated content from storage")
            return True
        except Exception as e:
            logger.error(f"Failed to check updates for source {source_id}: {e}")
            self.db.rollback()
            return False

    def poll_non_processed(self) -> dict:
        """Poll all sources with curation_status='uploaded' for updates.

        Returns:
            Dict with counts: total_checked, synced, errors.
        """
        sources = (
            self.db.query(Source)
            .filter(Source.curation_status == 'uploaded')
            .filter(Source.drive_file_id.isnot(None))
            .all()
        )

        stats = {'total_checked': len(sources), 'synced': 0, 'errors': 0}
        for source in sources:
            try:
                if self.check_for_updates(str(source.id)):
                    stats['synced'] += 1
            except Exception:
                stats['errors'] += 1

        logger.info(f"Curation poll: {stats}")
        return stats
