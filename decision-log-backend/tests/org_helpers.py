"""Organization helpers for tests (Story 12.2).

Every project must be owned by an organization (projects.owner_organization_id NOT NULL)
and access is granted through organization membership.
"""

import pytest
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database.models import Organization, OrganizationMember, ProjectMember

TEST_ORG_SLUG = "test-org"


def make_org(db: Session, name: str, slug: str | None = None) -> Organization:
    org = Organization(name=name, slug=slug or name.lower().replace(" ", "-").replace("/", "-"))
    db.add(org)
    db.flush()
    return org


def default_org_id(db: Session):
    """Id of a shared default test organization (created on first use) — owner for test projects."""
    org = db.query(Organization).filter(Organization.slug == TEST_ORG_SLUG).first()
    if org is None:
        org = make_org(db, "Test Org", TEST_ORG_SLUG)
    return org.id


def make_org_member(db: Session, user, role: str = "admin", org: Organization | None = None) -> OrganizationMember:
    """Add ``user`` to ``org`` (default: the shared test organization) with ``role``."""
    db.flush()  # the user may still be pending (id assigned on flush)
    org_id = org.id if org is not None else default_org_id(db)
    membership = OrganizationMember(user_id=user.id, organization_id=org_id, role=role)
    db.add(membership)
    db.flush()
    return membership


def assign_to_project(db: Session, user, project, role: str = "member") -> ProjectMember:
    """Assign a user to a project (needed for organization ``member``s to get access)."""
    pm = ProjectMember(project_id=project.id, user_id=user.id, role=role)
    db.add(pm)
    db.flush()
    return pm


def allow_projects_without_owner(db: Session) -> None:
    """Simulate a pre-008 schema (nullable projects.owner_organization_id) for 12.1 backfill tests."""
    bind = db.get_bind()
    if bind.dialect.name != "postgresql":
        pytest.skip("needs PostgreSQL to relax the NOT NULL constraint")
    db.execute(text("ALTER TABLE projects ALTER COLUMN owner_organization_id DROP NOT NULL"))
    db.commit()
