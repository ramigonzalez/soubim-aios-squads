"""Drive folders an organization shared with the platform's service account (Story 12.9).

Clients share a Drive folder with the service account e-mail, then pick it for a project. The service
account sees **every** client's shared folders, so isolation rests here:

- a project's choices are only the folders whose ``sharingUser`` (the Google account that actually
  shared the folder, set by Google) is the e-mail of a member of the project's owning organization;
- choosing a folder re-checks that rule on the server, so a folder id from another client is refused.
"""

import logging
from datetime import datetime
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import settings
from app.database.models import OrganizationMember, Project, User
from app.services.drive_client import DriveClient, service_account_email
from app.services.organizations import EXTERNAL

logger = logging.getLogger(__name__)


def drive_configured() -> bool:
    """True when Drive monitoring is on (GOOGLE_DRIVE_ENABLED) and the server has a service account key."""
    return bool(settings.google_drive_enabled) and service_account_email() is not None


def _member_emails(db: Session, organization_id) -> set:
    rows = (
        db.query(func.lower(User.email))
        .join(OrganizationMember, OrganizationMember.user_id == User.id)
        .filter(
            OrganizationMember.organization_id == organization_id,
            OrganizationMember.role != EXTERNAL,  # Story 12.15: an external person's folders are not the organization's
            User.deleted_at.is_(None),
        )
        .all()
    )
    return {email for (email,) in rows if email}


def _not_configured() -> HTTPException:
    return HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="drive_not_configured")


def organization_folders(db: Session, organization_id, client: Optional[DriveClient] = None) -> List[dict]:
    """Folders shared with the service account by members of the organization, newest share first."""
    if not drive_configured():
        raise _not_configured()
    emails = _member_emails(db, organization_id)
    try:
        folders = (client or DriveClient()).list_shared_folders()
    except Exception:
        logger.exception("Listing Drive folders shared with the service account failed")
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="drive_unavailable")
    result = []
    for folder in folders:
        sharer = (folder.get("sharingUser") or {}).get("emailAddress", "").lower()
        if sharer and sharer in emails:
            result.append({
                "id": folder["id"],
                "name": folder.get("name") or folder["id"],
                "shared_by": sharer,
                "shared_at": folder.get("sharedWithMeTime"),
                "url": folder.get("webViewLink"),
            })
    return result


def _iso(value: Optional[datetime]) -> Optional[str]:
    return value.isoformat() + "Z" if value is not None else None


def folder_state(project: Project) -> dict:
    """What the project settings show: the service account e-mail and the chosen folder."""
    return {
        "configured": drive_configured(),
        "service_account_email": service_account_email(),
        "folder_id": project.drive_folder_id,
        "folder_name": project.drive_folder_name,
        "last_checked_at": _iso(project.last_drive_poll),
        "error": project.drive_poll_error,
    }


def set_project_folder(db: Session, project: Project, folder_id: str, client: Optional[DriveClient] = None) -> Project:
    """Point the project at a folder its owning organization shared; 403 for any other folder."""
    match = next(
        (f for f in organization_folders(db, project.owner_organization_id, client) if f["id"] == folder_id),
        None,
    )
    if match is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="folder_not_shared_by_organization")
    # A Drive file becomes one source (sources.drive_file_id is unique), so a folder feeds one project only.
    in_use = (
        db.query(Project.id)
        .filter(Project.drive_folder_id == folder_id, Project.id != project.id)
        .first()
    )
    if in_use is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="folder_in_use")
    if project.drive_folder_id != folder_id:
        project.last_drive_poll = None  # a new folder is read from the start
    project.drive_folder_id = folder_id
    project.drive_folder_name = match["name"][:255]
    project.drive_poll_error = None
    db.commit()
    db.refresh(project)
    return project


def clear_project_folder(db: Session, project: Project) -> Project:
    """Stop monitoring. Sources already ingested from the folder stay."""
    project.drive_folder_id = None
    project.drive_folder_name = None
    project.drive_poll_error = None
    project.last_drive_poll = None
    db.commit()
    db.refresh(project)
    return project
