"""Project sharing between organizations (Story 12.3).

``project_organizations`` lists the organizations with access to a project: the owning
organization (``owner`` row, mirrors ``projects.owner_organization_id``) and organizations
invited as ``contributor`` or ``viewer``. Levels are applied in ``app/services/access.py``.
"""

from typing import Optional

from sqlalchemy.orm import Session

from app.database.models import Organization, Project, ProjectOrganization

OWNER = "owner"
SHARE_ACCESS = ("contributor", "viewer")


def add_owner_row(db: Session, project: Project, invited_by=None) -> ProjectOrganization:
    """Record the owning organization of a newly created project. Does not commit."""
    row = ProjectOrganization(
        project_id=project.id, organization_id=project.owner_organization_id, access=OWNER, invited_by=invited_by
    )
    db.add(row)
    db.flush()
    return row


def find_organization(db: Session, slug: Optional[str] = None, organization_id=None) -> Optional[Organization]:
    """Exact lookup of an invitation target by slug or id (no search: does not expose a directory)."""
    if organization_id is not None:
        return db.query(Organization).filter(Organization.id == str(organization_id)).first()
    if slug:
        return db.query(Organization).filter(Organization.slug == slug.strip().lower()).first()
    return None


def get_share(db: Session, project_id, organization_id) -> Optional[ProjectOrganization]:
    return (
        db.query(ProjectOrganization)
        .filter(
            ProjectOrganization.project_id == str(project_id),
            ProjectOrganization.organization_id == str(organization_id),
        )
        .first()
    )
