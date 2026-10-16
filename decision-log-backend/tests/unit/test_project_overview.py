"""Promem revamp Phase 2: project visits (G1), project list aggregates (G6), sidebar counts."""

import uuid
from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.database.models import Project, ProjectItem, ProjectStage, ProjectVisit, Source, User
from app.services.project_service import get_project, get_projects
from app.services.project_visits import (
    LAST_7_DAYS,
    LAST_VISIT,
    new_items_cutoff,
    record_visit,
    visit_since,
)
from app.utils.security import create_access_token, hash_password
from tests.org_helpers import default_org_id, make_org_member

NOW = datetime(2026, 3, 3, 12, 0)


def _user(db: Session, email: str, role: str = "admin") -> User:
    user = User(email=email, password_hash=hash_password("password"), name=email.split("@")[0].title(), role="director")
    db.add(user)
    make_org_member(db, user, role)
    db.commit()
    return user


def _project(db: Session, name: str = "Residential Tower Alpha") -> Project:
    project = Project(owner_organization_id=default_org_id(db), name=name, description="Torre residencial")
    db.add(project)
    db.commit()
    return project


def _source(db: Session, project: Project, title: str, status: str = "processed", kind: str = "meeting") -> Source:
    source = Source(
        project_id=project.id,
        owner_organization_id=project.owner_organization_id,
        source_type=kind,
        title=title,
        occurred_at=NOW - timedelta(days=1),
        ingestion_status=status,
    )
    db.add(source)
    db.commit()
    return source


def _item(db: Session, project: Project, source: Source | None, created_at: datetime, **fields) -> ProjectItem:
    defaults = dict(
        project_id=project.id,
        source_id=source.id if source else None,
        owner_organization_id=project.owner_organization_id,
        statement=fields.pop("statement", "Concreto C50 nos pilares principais"),
        who="Carlos",
        item_type="decision",
        source_type=source.source_type if source else "manual_input",
        affected_disciplines=["structural"],
        discipline="structural",
        why="Carga dos pilares",
        consensus={"structural": {"status": "AGREE"}},
        created_at=created_at,
    )
    defaults.update(fields)
    item = ProjectItem(**defaults)
    db.add(item)
    db.commit()
    return item


class TestVisitSessions:
    def test_first_visit_has_no_previous(self, db_session: Session):
        user, project = _user(db_session, "gabriela@x.com"), _project(db_session)
        visit = record_visit(db_session, user.id, project.id, NOW)
        assert visit.last_seen_at == NOW
        assert visit.previous_seen_at is None
        assert visit_since(visit, NOW) is None

    def test_visits_in_the_same_session_keep_the_previous_visit(self, db_session: Session):
        user, project = _user(db_session, "gabriela@x.com"), _project(db_session)
        record_visit(db_session, user.id, project.id, NOW - timedelta(days=4))
        visit = record_visit(db_session, user.id, project.id, NOW)
        assert visit.previous_seen_at == NOW - timedelta(days=4)
        # reopening 10 minutes later is the same session: "since" does not move
        visit = record_visit(db_session, user.id, project.id, NOW + timedelta(minutes=10))
        assert visit.previous_seen_at == NOW - timedelta(days=4)
        assert visit_since(visit, NOW + timedelta(minutes=12)) == NOW - timedelta(days=4)

    def test_a_later_session_measures_from_the_last_visit(self, db_session: Session):
        user, project = _user(db_session, "gabriela@x.com"), _project(db_session)
        visit = record_visit(db_session, user.id, project.id, NOW)
        # seen from another page two hours later, the last visit is what defines "new"
        assert visit_since(visit, NOW + timedelta(hours=2)) == NOW

    def test_cutoff_falls_back_to_seven_days(self):
        assert new_items_cutoff(None, NOW) == (NOW - timedelta(days=7), LAST_7_DAYS)
        visit = ProjectVisit(last_seen_at=NOW - timedelta(days=2), previous_seen_at=None)
        assert new_items_cutoff(visit, NOW) == (NOW - timedelta(days=2), LAST_VISIT)


class TestProjectListAggregates:
    def test_new_items_since_last_visit(self, db_session: Session, monkeypatch):
        user, project = _user(db_session, "gabriela@x.com"), _project(db_session)
        source = _source(db_session, project, "Revisão do projeto estrutural")
        _item(db_session, project, source, NOW - timedelta(days=5))
        _item(db_session, project, source, NOW - timedelta(hours=3), statement="Laje protendida")
        db_session.add(ProjectVisit(user_id=user.id, project_id=project.id, last_seen_at=NOW - timedelta(days=1)))
        db_session.commit()
        monkeypatch.setattr("app.services.project_service.datetime", _FrozenDatetime)

        [entry], _ = get_projects(db_session, str(user.id))
        assert entry["new_items"]["count"] == 1
        assert entry["new_items"]["basis"] == LAST_VISIT
        assert entry["last_visit_at"] == (NOW - timedelta(days=1)).isoformat()
        assert entry["last_activity"]["label"] == "Revisão do projeto estrutural"
        assert entry["last_activity"]["source_type"] == "meeting"

    def test_without_a_visit_new_means_the_last_seven_days(self, db_session: Session, monkeypatch):
        user, project = _user(db_session, "gabriela@x.com"), _project(db_session)
        _item(db_session, project, None, NOW - timedelta(days=10))
        _item(db_session, project, None, NOW - timedelta(days=2), title="Trocar caixilhos")
        monkeypatch.setattr("app.services.project_service.datetime", _FrozenDatetime)

        [entry], _ = get_projects(db_session, str(user.id))
        assert entry["new_items"] == {"count": 1, "since": (NOW - timedelta(days=7)).isoformat(), "basis": LAST_7_DAYS}
        assert entry["last_visit_at"] is None
        assert entry["last_activity"]["label"] == "Trocar caixilhos"

    def test_late_actions_count_only_open_overdue_actions(self, db_session: Session, monkeypatch):
        user, project = _user(db_session, "gabriela@x.com"), _project(db_session)
        day = NOW - timedelta(days=20)
        _item(db_session, project, None, day, item_type="action_item", due_date=NOW - timedelta(days=3))  # late
        _item(db_session, project, None, day, item_type="action_item", due_date=NOW - timedelta(days=3), is_done=True)
        _item(db_session, project, None, day, item_type="action_item", due_date=NOW + timedelta(days=3))
        _item(db_session, project, None, day, item_type="action_item", due_date=None)
        _item(db_session, project, None, day, item_type="topic")
        monkeypatch.setattr("app.services.project_service.datetime", _FrozenDatetime)

        [entry], _ = get_projects(db_session, str(user.id))
        assert entry["late_actions"] == 1

    def test_pending_ingestion_only_for_reviewers(self, db_session: Session):
        admin, project = _user(db_session, "gabriela@x.com"), _project(db_session)
        member = _user(db_session, "lucia@x.com", role="member")
        from tests.org_helpers import assign_to_project

        assign_to_project(db_session, member, project)
        db_session.commit()
        _source(db_session, project, "Reunião semanal", status="pending")
        _source(db_session, project, "E-mail do cliente", status="pending", kind="email")
        _source(db_session, project, "Aprovada", status="processed")

        [as_admin], _ = get_projects(db_session, str(admin.id))
        [as_member], _ = get_projects(db_session, str(member.id))
        assert as_admin["pending_ingestion"] == 2
        assert as_member["pending_ingestion"] == 0

    def test_stages_in_schedule_order(self, db_session: Session):
        user, project = _user(db_session, "gabriela@x.com"), _project(db_session)
        for order, (name, start, end) in enumerate(
            [("Estudo Preliminar", "2026-01-15", "2026-02-15"), ("Anteprojeto", "2026-02-16", "2026-03-31")]
        ):
            db_session.add(
                ProjectStage(
                    id=uuid.uuid4(),
                    project_id=project.id,
                    stage_name=name,
                    stage_from=datetime.fromisoformat(start),
                    stage_to=datetime.fromisoformat(end),
                    sort_order=order,
                )
            )
        db_session.commit()

        [entry], _ = get_projects(db_session, str(user.id))
        assert [s["name"] for s in entry["stages"]] == ["Estudo Preliminar", "Anteprojeto"]
        assert entry["stages"][0]["start"].startswith("2026-01-15")
        assert entry["stages"][1]["end"].startswith("2026-03-31")


class TestProjectSectionCounts:
    def test_counts_items_milestones_and_approved_meetings(self, db_session: Session):
        user, project = _user(db_session, "gabriela@x.com"), _project(db_session)
        meeting = _source(db_session, project, "Revisão do projeto estrutural")
        _source(db_session, project, "Ainda pendente", status="pending")
        _source(db_session, project, "E-mail", kind="email")
        _item(db_session, project, meeting, NOW, is_milestone=True)
        _item(db_session, project, meeting, NOW)
        _item(db_session, project, None, NOW)

        detail = get_project(db_session, str(project.id), str(user.id))
        assert detail["counts"] == {"items": 3, "milestones": 1, "meetings": 1}
        assert detail["stages"] == []


class _FrozenDatetime(datetime):
    @classmethod
    def utcnow(cls):
        return NOW


@pytest.fixture
def client(pg_session):
    from app.main import app

    return TestClient(app)  # no context manager: no startup (DB init, scheduler)


def _auth(user: User) -> dict:
    return {"Authorization": "Bearer " + create_access_token(str(user.id), user.email, user.role)}


class TestVisitEndpoint:
    def test_records_the_visit_and_returns_the_previous_one(self, client, pg_session: Session):
        user, project = _user(pg_session, "gabriela@x.com"), _project(pg_session)
        first = client.post(f"/api/projects/{project.id}/visit", headers=_auth(user))
        assert first.status_code == 200
        assert first.json()["last_visit_at"] is None
        pg_session.expire_all()
        visit = pg_session.query(ProjectVisit).filter_by(user_id=user.id, project_id=project.id).one()
        visit.last_seen_at = visit.last_seen_at - timedelta(days=3)
        pg_session.commit()

        second = client.post(f"/api/projects/{project.id}/visit", headers=_auth(user))
        assert second.json()["last_visit_at"] is not None

    def test_requires_access_to_the_project(self, client, pg_session: Session):
        outsider = User(email="out@x.com", password_hash=hash_password("password"), name="Out", role="client")
        pg_session.add(outsider)
        pg_session.commit()
        project = _project(pg_session)
        assert client.post(f"/api/projects/{project.id}/visit", headers=_auth(outsider)).status_code == 403


def test_list_includes_archive_date_and_type(db_session: Session):
    user = _user(db_session, "gabriela@x.com")
    project = _project(db_session)
    project.project_type = "residential"
    project.archived_at = NOW
    db_session.commit()
    [entry], _ = get_projects(db_session, str(user.id), archived=True)
    assert entry["archived_at"] == NOW.isoformat()
    assert entry["project_type"] == "residential"
