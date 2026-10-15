"""Google Drive folder of a project, shared with the service account (Story 12.9).

- GET    /api/projects/{project_id}/drive-folder          → service account e-mail + chosen folder
- GET    /api/projects/{project_id}/drive-folder/options  → folders the owning organization shared
- PUT    /api/projects/{project_id}/drive-folder          → choose one of those folders {folder_id}
- DELETE /api/projects/{project_id}/drive-folder          → stop monitoring

Owner/admin of the project's owning organization only (``admin`` on the project); others get 403.
"""

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.middleware.auth import get_current_user
from app.database.session import get_db
from app.services import drive_folders
from app.services.access import ADMIN, require_project_access

router = APIRouter()


class FolderChoice(BaseModel):
    folder_id: str = Field(..., min_length=1, max_length=255)


@router.get("/projects/{project_id}/drive-folder")
def get_drive_folder(project_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    project = require_project_access(db, user, project_id, ADMIN)
    return drive_folders.folder_state(project)


@router.get("/projects/{project_id}/drive-folder/options")
def list_drive_folder_options(project_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    project = require_project_access(db, user, project_id, ADMIN)
    return drive_folders.organization_folders(db, project.owner_organization_id)


@router.put("/projects/{project_id}/drive-folder")
def set_drive_folder(
    project_id: str, body: FolderChoice, db: Session = Depends(get_db), user=Depends(get_current_user)
):
    project = require_project_access(db, user, project_id, ADMIN)
    return drive_folders.folder_state(drive_folders.set_project_folder(db, project, body.folder_id.strip()))


@router.delete("/projects/{project_id}/drive-folder", status_code=status.HTTP_204_NO_CONTENT)
def clear_drive_folder(project_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    project = require_project_access(db, user, project_id, ADMIN)
    drive_folders.clear_project_folder(db, project)
