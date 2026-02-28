"""Google Drive folder monitoring service.

Polls configured project folders for new PDF/DOCX files and creates
Source records in the ingestion queue.

Story 10.3: Google Drive Folder Monitoring
"""

import logging
import os
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.database.models import Source, Project
from app.services.drive_client import DriveClient, SUPPORTED_MIME_TYPES
from app.services.document_processor import DocumentProcessor

logger = logging.getLogger(__name__)


class DriveMonitor:
    """Monitors Google Drive folders for new documents."""

    def __init__(self, db_session: Session):
        self.db = db_session
        self.drive = DriveClient()
        self.processor = DocumentProcessor()

    def poll_all_projects(self):
        """Poll all projects with configured Drive folders."""
        projects = self.db.query(Project).filter(
            Project.drive_folder_id.isnot(None)
        ).all()
        logger.info(f"Polling {len(projects)} project folders")

        for project in projects:
            try:
                self._poll_project(project)
            except Exception as e:
                logger.error(f"Failed to poll project {project.id}: {e}")

    def _poll_project(self, project: Project):
        """Poll a single project's Drive folder for new files."""
        last_poll = project.last_drive_poll
        since = last_poll.isoformat() + "Z" if last_poll else None

        files = self.drive.list_new_files(
            folder_id=project.drive_folder_id,
            since=since,
            file_types=['pdf', 'docx'],
        )

        for file_info in files:
            # Deduplication check
            existing = self.db.query(Source).filter(
                Source.drive_file_id == file_info['id']
            ).first()
            if existing:
                logger.debug(
                    f"Skipping duplicate file: {file_info['name']} "
                    f"(drive_file_id={file_info['id']})"
                )
                continue

            try:
                self._process_drive_file(project, file_info)
            except Exception as e:
                logger.error(f"Failed to process file {file_info['name']}: {e}")

        # Update last poll timestamp
        project.last_drive_poll = datetime.now(timezone.utc)
        self.db.commit()

    def _process_drive_file(self, project: Project, file_info: dict):
        """Download, extract text, and create Source record."""
        logger.info(f"Found new file: {file_info['name']} in project {project.name}")

        content = self.drive.download_file(file_info['id'])

        # Determine file extension from MIME type
        ext = SUPPORTED_MIME_TYPES.get(file_info.get('mimeType', ''), 'pdf')

        # Extract text
        raw_text = ""
        try:
            raw_text = self.processor.extract_text(content, ext)
        except Exception as e:
            logger.error(f"Text extraction failed for {file_info['name']}: {e}")

        # Save file locally
        file_path = f"uploads/documents/{project.id}/{file_info['id']}.{ext}"
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        with open(file_path, "wb") as f:
            f.write(content)

        # Create Source record
        source = Source(
            project_id=project.id,
            source_type="document",
            title=file_info['name'],
            occurred_at=datetime.now(timezone.utc),
            raw_content=raw_text or "",
            file_url=file_info.get('webViewLink', file_path),
            file_type=ext,
            file_size=int(file_info.get('size', 0)),
            drive_file_id=file_info['id'],
            drive_folder_id=project.drive_folder_id,
            ai_summary=None,  # Summary generation deferred to ingestion approval
            ingestion_status="pending",
        )
        self.db.add(source)
        self.db.commit()
        logger.info(f"Created source {source.id} from Drive file {file_info['id']}")
