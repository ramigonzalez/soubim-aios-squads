"""Tests for organizations and memberships (Story 12.1)."""

import asyncio
import importlib.util
import pathlib
import sys
import types
import uuid
from types import SimpleNamespace

import pytest
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.routes.organizations import my_organizations
from app.api.routes.projects import ProjectCreate, create_project
from app.database.models import Organization, OrganizationMember, Project, User
from app.services.organizations import (
    DEFAULT_ORGANIZATION_SLUG,
    ensure_default_organization,
    get_memberships,
    membership_role_for,
    primary_organization,
)

MIGRATION = pathlib.Path(__file__).parents[2] / "alembic/versions/006_story_12_1_organizations.py"


def _user(db: Session, email: str, role: str, deleted: bool = False) -> User:
    from datetime import datetime

    user = User(email=email, password_hash="x", name=email.split("@")[0], role=role,
                deleted_at=datetime(2026, 1, 1) if deleted else None)
    db.add(user)
    db.flush()
    return user


@pytest.fixture
def people(db_session: Session):
    director = _user(db_session, "dir@soubim.com", "director")
    architect = _user(db_session, "arch@soubim.com", "architect")
    gone = _user(db_session, "gone@soubim.com", "architect", deleted=True)
    project = Project(name="D/SEASON")
    db_session.add(project)
    db_session.commit()
    return SimpleNamespace(director=director, architect=architect, gone=gone, project=project)


class TestMembershipRole:
    def test_directors_administer_others_are_members(self):
        assert membership_role_for("director") == "admin"
        assert membership_role_for("architect") == "member"
        assert membership_role_for("client") == "member"


class TestEnsureDefaultOrganization:
    def test_creates_org_memberships_and_project_owner(self, db_session: Session, people):
        org = ensure_default_organization(db_session)
        db_session.commit()

        assert org.slug == DEFAULT_ORGANIZATION_SLUG and org.name == "souBIM"
        roles = {m.user_id: m.role for m in db_session.query(OrganizationMember).all()}
        assert roles == {people.director.id: "admin", people.architect.id: "member"}  # deleted user skipped
        db_session.refresh(people.project)
        assert people.project.owner_organization_id == org.id

    def test_is_idempotent(self, db_session: Session, people):
        ensure_default_organization(db_session)
        ensure_default_organization(db_session)
        db_session.commit()

        assert db_session.query(Organization).count() == 1
        assert db_session.query(OrganizationMember).count() == 2

    def test_keeps_existing_memberships_and_owners(self, db_session: Session, people):
        dimas = Organization(name="DIMAS", slug="dimas")
        db_session.add(dimas)
        db_session.flush()
        db_session.add(OrganizationMember(user_id=people.architect.id, organization_id=dimas.id, role="owner"))
        people.project.owner_organization_id = dimas.id
        db_session.commit()

        ensure_default_organization(db_session)
        db_session.commit()

        assert [m.organization.slug for m in get_memberships(db_session, people.architect)] == ["dimas"]
        db_session.refresh(people.project)
        assert people.project.owner_organization_id == dimas.id


class TestMemberships:
    def test_user_cannot_join_the_same_organization_twice(self, db_session: Session, people):
        org = ensure_default_organization(db_session)
        db_session.commit()
        db_session.add(OrganizationMember(user_id=people.director.id, organization_id=org.id, role="member"))
        with pytest.raises(IntegrityError):
            db_session.commit()
        db_session.rollback()

    def test_user_can_belong_to_several_organizations(self, db_session: Session, people):
        soubim = ensure_default_organization(db_session)
        dimas = Organization(name="DIMAS", slug="dimas")
        db_session.add(dimas)
        db_session.flush()
        db_session.add(OrganizationMember(user_id=people.director.id, organization_id=dimas.id, role="member"))
        db_session.commit()

        assert {m.organization.slug for m in get_memberships(db_session, people.director)} == {"soubim", "dimas"}
        assert primary_organization(db_session, people.director).id == soubim.id


class TestMyOrganizationsEndpoint:
    def test_lists_the_users_organizations_with_role(self, db_session: Session, people):
        org = ensure_default_organization(db_session)
        db_session.commit()

        data = asyncio.run(my_organizations(db=db_session, user=people.director))
        assert data == [{"id": str(org.id), "name": "souBIM", "slug": "soubim", "role": "admin"}]

    def test_user_without_organization_gets_empty_list(self, db_session: Session, people):
        assert asyncio.run(my_organizations(db=db_session, user=people.director)) == []


class TestProjectCreation:
    def test_new_project_is_owned_by_the_creators_organization(self, db_session: Session, people):
        org = ensure_default_organization(db_session)
        db_session.commit()

        request = SimpleNamespace(state=SimpleNamespace(user=people.director))
        created = asyncio.run(create_project(ProjectCreate(name="Torre B"), request, db=db_session))

        project = db_session.query(Project).filter(Project.id == uuid.UUID(created["id"])).one()
        assert project.owner_organization_id == org.id


@pytest.mark.postgresql
class TestMigrationBackfill:
    """Runs the raw-SQL backfill of migration 006 on this run's throwaway PostgreSQL database."""

    @staticmethod
    def _migration(monkeypatch):
        # The backend's local alembic/ folder shadows the alembic package on import;
        # _backfill only needs SQLAlchemy, so give the module a stand-in `alembic.op`.
        monkeypatch.setitem(sys.modules, "alembic", types.SimpleNamespace(op=None))
        spec = importlib.util.spec_from_file_location("migration_006", MIGRATION)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module

    def test_backfill_matches_the_service_rules(self, pg_session: Session, monkeypatch):
        director = _user(pg_session, "dir@soubim.com", "director")
        architect = _user(pg_session, "arch@soubim.com", "architect")
        _user(pg_session, "gone@soubim.com", "client", deleted=True)
        pg_session.add(Project(name="D/SEASON"))
        pg_session.commit()

        migration = self._migration(monkeypatch)
        with pg_session.bind.begin() as conn:
            migration._backfill(conn)
            migration._backfill(conn)  # idempotent

        orgs = pg_session.execute(text("SELECT id, name, slug FROM organizations")).all()
        assert [(o.name, o.slug) for o in orgs] == [("souBIM", "soubim")]
        roles = dict(pg_session.execute(text("SELECT user_id, role FROM organization_members")).all())
        assert roles == {director.id: "admin", architect.id: "member"}
        owners = pg_session.execute(text("SELECT DISTINCT owner_organization_id FROM projects")).scalars().all()
        assert owners == [orgs[0].id]
