"""Organization isolation suite (Story 12.2).

Two organizations, each with a project, a meeting source, items, a participant, a stage and a
share link. A user of organization A must get 403/404 or empty lists for every organization-B
resource on every list/detail/mutation endpoint. Route functions are called directly.
"""

import asyncio
from datetime import date, datetime, timedelta
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.api.models.ingestion import IngestionBatchAction, IngestionUpdate
from app.api.models.project import ParticipantCreate, ParticipantUpdate, StageCreate, StageUpdate
from app.api.models.project_item import ProjectItemCreate, ProjectItemUpdate
from app.api.routes import (
    admin,
    decisions,
    digest,
    documents,
    ingestion,
    meetings,
    participants,
    project_items,
    projects,
    shared_links,
    source_curation,
    stages,
    webhooks,
)
from app.database.models import (
    Organization,
    Project,
    ProjectItem,
    ProjectParticipant,
    ProjectStage,
    SharedLink,
    Source,
    User,
)
from app.services import access, recordings
from app.services.auth_service import get_user_projects
from tests.org_helpers import assign_to_project, make_org, make_org_member


def run(coro):
    return asyncio.run(coro)


def req(user):
    return SimpleNamespace(state=SimpleNamespace(user=user))


def status_of(coro) -> int:
    with pytest.raises(HTTPException) as exc:
        run(coro)
    return exc.value.status_code


@pytest.fixture(autouse=True)
def recordings_dir(tmp_path, monkeypatch):
    monkeypatch.setattr(recordings, "RECORDINGS_DIR", tmp_path)
    return tmp_path


def _user(db: Session, email: str, role: str = "architect") -> User:
    user = User(email=email, password_hash="x", name=email.split("@")[0], role=role)
    db.add(user)
    db.flush()
    return user


def _tenant(db: Session, org: Organization, tag: str) -> SimpleNamespace:
    """A project with a pending + processed meeting, items, participant, stage and share link."""
    project = Project(name=f"Project {tag}", owner_organization_id=org.id)
    db.add(project)
    db.flush()
    pending = Source(project_id=project.id, source_type="meeting", title=f"Pending {tag}",
                     occurred_at=datetime(2026, 9, 1), ingestion_status="pending", raw_content="0:01 - X\n  Oi")
    processed = Source(project_id=project.id, source_type="meeting", title=f"Processed {tag}",
                       occurred_at=datetime(2026, 9, 2), ingestion_status="processed", included=True,
                       raw_content="0:01 - Y\n  Ola", ai_summary=f"Summary {tag}")
    failed = Source(project_id=project.id, source_type="meeting", title=f"Failed {tag}",
                    occurred_at=datetime(2026, 9, 3), ingestion_status="failed", raw_content="x")
    db.add_all([pending, processed, failed])
    db.flush()
    item = ProjectItem(project_id=project.id, source_id=processed.id, item_type="decision",
                       statement=f"Decision {tag}", decision_statement=f"Decision {tag}", who="Ana",
                       timestamp="00:01:00", discipline="architecture", affected_disciplines=["architecture"],
                       why="because", consensus={}, is_milestone=True)
    participant = ProjectParticipant(project_id=project.id, name=f"Person {tag}", discipline="architecture")
    stage = ProjectStage(project_id=project.id, stage_name=f"Stage {tag}", stage_from=datetime(2026, 1, 1),
                         stage_to=datetime(2026, 6, 1), sort_order=0)
    link = SharedLink(project_id=project.id, share_token=f"token-{tag}",
                      expires_at=datetime.utcnow() + timedelta(days=30))
    db.add_all([item, participant, stage, link])
    db.flush()
    return SimpleNamespace(org=org, project=project, pending=pending, processed=processed, failed=failed,
                           item=item, participant=participant, stage=stage, link=link)


@pytest.fixture
def world(db_session: Session) -> SimpleNamespace:
    soubim = make_org(db_session, "souBIM", "soubim")
    dimas = make_org(db_session, "DIMAS", "dimas")
    a = _tenant(db_session, soubim, "A")
    b = _tenant(db_session, dimas, "B")
    a_admin = _user(db_session, "admin@soubim.com", role="director")
    a_member = _user(db_session, "member@soubim.com")
    b_admin = _user(db_session, "admin@dimas.com", role="director")
    nobody = _user(db_session, "nobody@x.com", role="director")  # legacy director, no organization
    make_org_member(db_session, a_admin, "admin", org=soubim)
    make_org_member(db_session, a_member, "member", org=soubim)
    make_org_member(db_session, b_admin, "owner", org=dimas)
    assign_to_project(db_session, a_member, a.project)
    db_session.commit()
    return SimpleNamespace(a=a, b=b, a_admin=a_admin, a_member=a_member, b_admin=b_admin, nobody=nobody)


def _list_items(db, user, project_id):
    return project_items.list_project_items(
        project_id=str(project_id), request=req(user), db=db, item_type=None, source_type=None, discipline=None,
        is_milestone=None, date_from=None, date_to=None, search=None, sort_by="created_at", sort_order="desc",
        limit=50, offset=0)


def _list_milestones(db, user, project_id):
    return project_items.list_milestones(
        project_id=str(project_id), request=req(user), db=db, item_type=None, source_type=None, discipline=None,
        date_from=None, date_to=None, search=None, sort_by="created_at", sort_order="desc", limit=50, offset=0)


def _list_sources(db, user, status="pending"):
    return run(ingestion.list_sources(req(user), project_id=None, source_type=None, ingestion_status=status,
                                      date_from=None, date_to=None, limit=200, offset=0, db=db))


def _history(db, user):
    return run(ingestion.list_history(req(user), project_id=None, source_type=None, date_from=None, date_to=None,
                                      limit=200, offset=0, db=db))


def _list_projects(db, user):
    return run(projects.list_projects(req(user), db=db, limit=100, offset=0, archived=True))


def _item_body():
    return ProjectItemCreate(statement="New", item_type="decision", who="Ana", affected_disciplines=["architecture"])


# ─── Organization A user vs organization B resources ─────────────────────────


class TestProjectsIsolation:
    def test_list_only_own_organization(self, db_session, world):
        ids = {p["id"] for p in _list_projects(db_session, world.a_admin)["projects"]}
        assert ids == {str(world.a.project.id)}

    def test_detail_update_archive_forbidden(self, db_session, world):
        pid = world.b.project.id
        assert status_of(projects.get_project_detail(pid, req(world.a_admin), db=db_session)) == 403
        assert status_of(projects.update_project(pid, projects.ProjectUpdate(name="x"), req(world.a_admin),
                                                 db=db_session)) == 403
        assert status_of(projects.archive_project(pid, req(world.a_admin), db=db_session)) == 403
        db_session.refresh(world.b.project)
        assert world.b.project.name == "Project B" and world.b.project.archived_at is None

    def test_new_project_owned_by_the_admin_organization(self, db_session, world):
        created = run(projects.create_project(projects.ProjectCreate(name="Torre"), req(world.b_admin), db=db_session))
        project = db_session.get(Project, __import__("uuid").UUID(created["id"]))
        assert project.owner_organization_id == world.b.org.id
        assert created["id"] not in {p["id"] for p in _list_projects(db_session, world.a_admin)["projects"]}

    def test_auth_project_list_only_own_organization(self, db_session, world):
        assert get_user_projects(db_session, str(world.a_admin.id)) == [world.a.project.id]


class TestItemsIsolation:
    def test_list_detail_milestones_forbidden(self, db_session, world):
        b = world.b
        assert status_of(_list_items(db_session, world.a_admin, b.project.id)) == 403
        assert status_of(_list_milestones(db_session, world.a_admin, b.project.id)) == 403
        assert status_of(project_items.get_project_item(str(b.project.id), str(b.item.id), req(world.a_admin),
                                                        db=db_session)) == 403

    def test_item_of_b_not_reachable_through_project_a(self, db_session, world):
        assert status_of(project_items.get_project_item(str(world.a.project.id), str(world.b.item.id),
                                                        req(world.a_admin), db=db_session)) == 404

    def test_create_and_update_forbidden(self, db_session, world):
        b = world.b
        assert status_of(project_items.create_project_item(str(b.project.id), _item_body(), req(world.a_admin),
                                                           db=db_session)) == 403
        assert status_of(project_items.update_project_item(str(b.project.id), str(b.item.id),
                                                           ProjectItemUpdate(statement="hacked"), req(world.a_admin),
                                                           db=db_session)) == 403
        db_session.refresh(b.item)
        assert b.item.statement == "Decision B"
        assert db_session.query(ProjectItem).filter(ProjectItem.project_id == b.project.id).count() == 1


class TestDecisionsV1Isolation:
    def test_list_get_update_blocked(self, db_session, world):
        b = world.b
        assert status_of(decisions.list_decisions(b.project.id, db=db_session, user=world.a_admin)) == 403
        assert status_of(decisions.get_decision(b.item.id, db=db_session, user=world.a_admin)) == 404
        assert status_of(decisions.update_decision(b.item.id, db=db_session, user=world.a_admin)) == 404

    def test_own_decision_still_readable(self, db_session, world):
        data = run(decisions.get_decision(world.a.item.id, db=db_session, user=world.a_admin))
        assert data["id"] == str(world.a.item.id)


class TestDigestIsolation:
    def test_forbidden(self, db_session, world):
        assert status_of(digest.get_digest(world.b.project.id, "2026-01-01", "2026-12-31", db=db_session,
                                           user=world.a_admin)) == 403


class TestParticipantsIsolation:
    def test_all_endpoints_forbidden(self, db_session, world):
        b, r = world.b, req(world.a_admin)
        pid = str(b.project.id)
        assert status_of(participants.list_participants(pid, r, db=db_session)) == 403
        assert status_of(participants.add_participant(pid, ParticipantCreate(name="X", discipline="architecture"),
                                                      r, db=db_session)) == 403
        assert status_of(participants.update_participant(pid, str(b.participant.id), ParticipantUpdate(name="Y"),
                                                         r, db=db_session)) == 403
        assert status_of(participants.remove_participant(pid, str(b.participant.id), r, db=db_session)) == 403
        assert db_session.query(ProjectParticipant).filter(ProjectParticipant.project_id == b.project.id).count() == 1


class TestStagesIsolation:
    def test_all_endpoints_forbidden(self, db_session, world):
        b, r = world.b, req(world.a_admin)
        pid = str(b.project.id)
        assert status_of(stages.list_stages(pid, r, db=db_session)) == 403
        body = [StageCreate(stage_name="S", stage_from=date(2026, 1, 1), stage_to=date(2026, 2, 1))]
        assert status_of(stages.set_stages(pid, body, r, db=db_session)) == 403
        assert status_of(stages.update_stage(pid, str(b.stage.id), StageUpdate(stage_name="Z"), r,
                                             db=db_session)) == 403
        db_session.refresh(b.stage)
        assert b.stage.stage_name == "Stage B"


class TestIngestionIsolation:
    def test_lists_and_count_only_own_sources(self, db_session, world):
        a, b = world.a, world.b
        pending = _list_sources(db_session, world.a_admin)
        assert {s["id"] for s in pending["sources"]} == {str(a.pending.id)}
        assert pending["total"] == 1 and pending["pending_count"] == 1
        history_ids = {s["id"] for s in _history(db_session, world.a_admin)["sources"]}
        assert history_ids == {str(a.processed.id), str(a.failed.id)}
        assert run(ingestion.pending_count(req(world.a_admin), db=db_session)) == {"pending": 1}
        assert str(b.pending.id) not in {s["id"] for s in _list_sources(db_session, world.a_admin, None)["sources"]}

    def test_mutations_on_other_organization_are_not_found(self, db_session, world):
        b, r = world.b, req(world.a_admin)
        assert status_of(ingestion.update_source_status(str(b.pending.id), IngestionUpdate(ingestion_status="approved"),
                                                        r, db=db_session)) == 404
        assert status_of(ingestion.retry_source(str(b.failed.id), r, db=db_session)) == 404
        assert status_of(ingestion.delete_source(str(b.processed.id), r, db=db_session)) == 404
        result = run(ingestion.batch_update_sources(
            IngestionBatchAction(source_ids=[str(b.pending.id)], action="approve"), r, db=db_session))
        assert result["updated"] == 0
        db_session.expire_all()
        assert db_session.get(Source, b.pending.id).ingestion_status == "pending"
        assert db_session.get(Source, b.failed.id).ingestion_status == "failed"
        assert db_session.get(Source, b.processed.id) is not None

    def test_curation_endpoints(self, db_session, world):
        b = world.b
        assert status_of(source_curation.get_curation_status(str(b.processed.id), req(world.a_admin),
                                                             db=db_session)) == 404
        assert status_of(source_curation.upload_source_to_storage(str(b.processed.id), req(world.a_admin),
                                                                  db=db_session)) == 404


class TestMeetingViewerIsolation:
    def test_no_meeting_and_no_recording_link(self, db_session, world, recordings_dir):
        b = world.b
        (recordings_dir / f"{b.processed.id}.mp4").write_bytes(b"video")
        assert status_of(meetings.get_meeting(b.processed.id, db=db_session, user=world.a_admin)) == 404

    def test_own_meeting_gets_signed_link(self, db_session, world, recordings_dir):
        a = world.a
        (recordings_dir / f"{a.processed.id}.mp4").write_bytes(b"video")
        data = run(meetings.get_meeting(a.processed.id, db=db_session, user=world.a_member))
        assert data["recording"]["url"].startswith(f"/api/recordings/{a.processed.id}?expires=")


class TestUploadsIsolation:
    def test_document_upload_forbidden(self, db_session, world):
        fake_file = SimpleNamespace(filename="spec.pdf")
        assert status_of(documents.upload_document(str(world.b.project.id), req(world.a_admin), file=fake_file,
                                                   title=None, db=db_session)) == 403

    def test_webhook_forbidden_and_creates_nothing(self, db_session, world):
        b = world.b
        before = db_session.query(Source).filter(Source.project_id == b.project.id).count()
        payload = {"project_id": str(b.project.id), "webhook_id": "wh-1", "transcript": "x"}
        assert status_of(webhooks.receive_transcript(payload, req(world.a_admin), background_tasks=None,
                                                     db=db_session)) == 403
        assert db_session.query(Source).filter(Source.project_id == b.project.id).count() == before


class TestShareLinksIsolation:
    def test_all_endpoints_forbidden(self, db_session, world):
        b, r = world.b, req(world.a_admin)
        pid = str(b.project.id)
        assert status_of(shared_links.create_share_link(pid, shared_links.CreateShareLinkRequest(), r,
                                                        db=db_session)) == 403
        assert status_of(shared_links.list_share_links(pid, r, db=db_session)) == 403
        assert status_of(shared_links.revoke_share_link(pid, b.link.share_token, r, db=db_session)) == 403
        db_session.refresh(b.link)
        assert b.link.revoked_at is None


class TestPlatformAdmin:
    def test_only_platform_organization_admins(self, db_session, world):
        assert access.is_platform_admin(db_session, world.a_admin)
        assert not access.is_platform_admin(db_session, world.a_member)
        assert not access.is_platform_admin(db_session, world.b_admin)
        with pytest.raises(HTTPException) as exc:
            admin.require_platform_admin_user(world.b_admin, db=db_session)
        assert exc.value.status_code == 403
        assert status_of(source_curation.trigger_curation_sync(req(world.b_admin), background_tasks=None,
                                                               db=db_session)) == 403


class TestNoOrganization:
    """users.role is not used for authorization: a 'director' without organization sees nothing."""

    def test_sees_nothing(self, db_session, world):
        u = world.nobody
        assert _list_projects(db_session, u)["projects"] == []
        assert status_of(projects.get_project_detail(world.a.project.id, req(u), db=db_session)) == 403
        assert _list_sources(db_session, u)["sources"] == []
        assert _history(db_session, u)["sources"] == []
        assert run(ingestion.pending_count(req(u), db=db_session)) == {"pending": 0}
        assert status_of(projects.create_project(projects.ProjectCreate(name="X"), req(u), db=db_session)) == 403
        assert get_user_projects(db_session, str(u.id)) == []


# ─── Roles inside one organization ───────────────────────────────────────────


class TestMemberRole:
    """Organization member assigned to the project: read + contribute, no admin actions."""

    def test_reads_and_contributes(self, db_session, world):
        a, r = world.a, req(world.a_member)
        pid = str(a.project.id)
        assert run(_list_items(db_session, world.a_member, pid))["total"] == 1
        created = run(project_items.create_project_item(pid, _item_body(), r, db=db_session))
        assert created["source_type"] == "manual_input"
        updated = run(project_items.update_project_item(pid, str(a.item.id),
                                                        ProjectItemUpdate(is_done=True, statement="Edited"), r,
                                                        db=db_session))
        assert updated["is_done"] is True and updated["statement"] == "Edited"
        run(participants.add_participant(pid, ParticipantCreate(name="New", discipline="mep"), r, db=db_session))
        assert {s["id"] for s in _list_sources(db_session, world.a_member)["sources"]} == {str(a.pending.id)}

    def test_admin_actions_forbidden(self, db_session, world):
        a, r = world.a, req(world.a_member)
        pid = str(a.project.id)
        assert status_of(project_items.update_project_item(pid, str(a.item.id), ProjectItemUpdate(is_milestone=False),
                                                           r, db=db_session)) == 403
        assert status_of(ingestion.update_source_status(str(a.pending.id), IngestionUpdate(ingestion_status="approved"),
                                                        r, db=db_session)) == 403
        assert status_of(ingestion.retry_source(str(a.failed.id), r, db=db_session)) == 403
        assert status_of(ingestion.delete_source(str(a.processed.id), r, db=db_session)) == 403
        result = run(ingestion.batch_update_sources(
            IngestionBatchAction(source_ids=[str(a.pending.id)], action="reject"), r, db=db_session))
        assert result["updated"] == 0
        assert status_of(projects.update_project(a.project.id, projects.ProjectUpdate(name="x"), r,
                                                 db=db_session)) == 403
        assert status_of(projects.archive_project(a.project.id, r, db=db_session)) == 403
        assert status_of(projects.create_project(projects.ProjectCreate(name="X"), r, db=db_session)) == 403
        assert status_of(shared_links.create_share_link(pid, shared_links.CreateShareLinkRequest(), r,
                                                        db=db_session)) == 403
        db_session.expire_all()
        assert db_session.get(Source, a.pending.id).ingestion_status == "pending"
        assert db_session.get(ProjectItem, a.item.id).is_milestone is True

    def test_unassigned_project_of_same_organization_is_invisible(self, db_session, world):
        other = Project(name="Other A", owner_organization_id=world.a.org.id)
        db_session.add(other)
        db_session.commit()
        ids = {p["id"] for p in _list_projects(db_session, world.a_member)["projects"]}
        assert ids == {str(world.a.project.id)}
        assert status_of(_list_items(db_session, world.a_member, other.id)) == 403
        # ...while the organization admin sees every project of the organization
        admin_ids = {p["id"] for p in _list_projects(db_session, world.a_admin)["projects"]}
        assert admin_ids == {str(world.a.project.id), str(other.id)}


class TestAdminRole:
    def test_admin_actions_allowed(self, db_session, world):
        a, r = world.a, req(world.a_admin)
        pid = str(a.project.id)
        updated = run(project_items.update_project_item(pid, str(a.item.id), ProjectItemUpdate(is_milestone=False),
                                                        r, db=db_session))
        assert updated["is_milestone"] is False
        approved = run(ingestion.update_source_status(str(a.pending.id), IngestionUpdate(ingestion_status="approved"),
                                                      r, db=db_session))
        assert approved["ingestion_status"] == "approved"
        link = run(shared_links.create_share_link(pid, shared_links.CreateShareLinkRequest(), r, db=db_session))
        assert link["share_token"]
        run(projects.update_project(a.project.id, projects.ProjectUpdate(name="Renamed"), r, db=db_session))
        db_session.refresh(a.project)
        assert a.project.name == "Renamed"

    def test_access_levels(self, db_session, world):
        a, b = world.a.project, world.b.project
        assert access.project_access_level(db_session, world.a_admin, a) == access.ADMIN
        assert access.project_access_level(db_session, world.a_member, a) == access.WRITE
        assert access.project_access_level(db_session, world.a_admin, b) == access.NONE
        assert access.project_access_level(db_session, world.b_admin, b) == access.ADMIN  # owner
        assert access.project_access_level(db_session, world.nobody, a) == access.NONE
