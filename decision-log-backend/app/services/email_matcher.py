"""Email-to-project matching service.

Determines which project a polled Gmail email belongs to using label
matching and subject-line fallback strategies.

Story 7.4: Backend Gmail API Poller
"""

import logging
import re
from typing import Optional

from sqlalchemy.orm import Session

from app.database.models import Project

logger = logging.getLogger(__name__)


class EmailMatcherService:
    """
    Determines which project a Gmail email belongs to.

    Matching priority:
    1. Gmail label matches project slug (e.g., label "project/skyline-tower")
    2. Gmail label matches project name (case-insensitive)
    3. Email subject contains project name
    4. No match -- email skipped
    """

    def match_project(
        self,
        db: Session,
        gmail_labels: list[str],
        email_subject: str,
        email_from: str,
    ) -> Optional[str]:
        """
        Find the project UUID that this email belongs to.

        Args:
            db: Database session
            gmail_labels: List of Gmail label names applied to the message
            email_subject: Email subject line
            email_from: Sender email address

        Returns:
            Project UUID string if matched, None if no match found
        """
        # Fetch all active projects for matching
        projects = db.query(Project).filter(Project.archived_at.is_(None)).all()

        if not projects:
            logger.warning("EmailMatcher: No active projects found for matching")
            return None

        # Strategy 1: Label matches project slug (e.g., "project/skyline-tower")
        for label in gmail_labels:
            matched_id = self._match_label_to_project(label, projects)
            if matched_id:
                logger.info(
                    f"EmailMatcher: Matched via label '{label}' to project {matched_id}"
                )
                return matched_id

        # Strategy 2: Subject line contains project name
        subject_lower = email_subject.lower()
        for project in projects:
            if project.name and project.name.lower() in subject_lower:
                logger.info(
                    f"EmailMatcher: Matched via subject to project "
                    f"'{project.name}' ({project.id})"
                )
                return str(project.id)

        # No match found
        logger.warning(
            f"EmailMatcher: No project match for email '{email_subject}' "
            f"from {email_from}. Labels: {gmail_labels}. Skipping."
        )
        return None

    def _match_label_to_project(
        self, label: str, projects: list
    ) -> Optional[str]:
        """
        Check if a Gmail label matches any project.

        Handles patterns:
        - "project/skyline-tower" -> slug match
        - "Skyline Tower" -> name match
        - "soubim/skyline-tower" -> prefixed slug match
        """
        label_lower = label.lower()

        # Strip common prefixes
        for prefix in ["project/", "soubim/", "proj/"]:
            if label_lower.startswith(prefix):
                label_lower = label_lower[len(prefix):]
                break

        # Normalize label: replace hyphens/underscores with spaces
        label_normalized = re.sub(r"[-_]", " ", label_lower).strip()

        for project in projects:
            if not project.name:
                continue

            project_name_lower = project.name.lower()
            project_slug = re.sub(r"[-_\s]+", " ", project_name_lower).strip()

            if label_normalized == project_slug or label_lower == project_name_lower:
                return str(project.id)

        return None


# Singleton instance
email_matcher_service = EmailMatcherService()
