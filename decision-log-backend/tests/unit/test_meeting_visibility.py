"""Meeting visibility isolation suite (Story 12.4).

Builds on the 12.2/12.3 isolation world (``tests/unit/test_org_isolation.py``): souBIM owns project A,
DIMAS owns project B, project A is shared with DIMAS as viewer or contributor. souBIM's meetings are
internal by default: DIMAS must not see them, their items or recordings on any endpoint until souBIM
shares them; switching back hides them again. The owner organization always sees its meetings.
"""

import json
import uuid
from types import SimpleNamespace

import pytest
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.api.models.ingestion import IngestionBatchAction, IngestionUpdate
from app.api.models.project_item import ProjectItemUpdate
from app.api.routes import (
    decisions,
    ingestion,
    meetings,
    project_items,
    projects,
    shared_links,
    source_curation,
    webhooks,
)
from app.database.models import ProjectItem, Source
from app.services import access
from app.services.source_curation import SourceCurationService
from tests.org_helpers import assign_to_project
from tests.unit.test_org_isolation import (  # noqa: F401 — fixtures
    _history,
    _item_body,
    _list_items,
    _list_milestones,
    _list_projects,
    _list_sources,
    _share,
    recordings_dir,
    req,
    run,
    shared,
    status_of,
    world,
)


def _decisions(db, user, project_id):
    return json.loads(run(decisions.list_decisions(project_id, db=db, user=user)).body)


def _project_card(db, user, project_id):
    return next(p for p in _list_projects(db, user)["projects"] if p["id"] == str(project_id))


def _set_visibility(db, user, source_id, value):
    body = meetings.VisibilityUpdate(visibility=value)
    return run(meetings.set_meeting_visibility(source_id, body, db=db, user=user))


def _set_visibility_status(db, user, source_id, value) -> int:
    with pytest.raises(HTTPException) as exc:
        _set_visibility(db, user, source_id, value)
    return exc.value.status_code


def _no_tasks():
    return SimpleNamespace(add_task=lambda *args, **kwargs: None)


def _search(db, user, project_id, term):
    return run(project_items.list_project_items(
        project_id=str(project_id), request=req(user), db=db, item_type=None, source_type=None, discipline=None,
        is_milestone=None, date_from=None, date_to=None, search=term, sort_by="created_at", sort_order="desc",
        limit=50, offset=0))


@pytest.fixture(params=["viewer", "contributor"])
def vis(request, db_session: Session, shared) -> SimpleNamespace:  # noqa: F811
    """Project A shared with DIMAS (viewer / contributor); A's meetings internal (default); a souBIM manual
    item without source; a DIMAS member assigned to project A."""
    w = shared.world
    a = w.a
    _share(db_session, w.a_admin, a.project.id, "dimas", request.param)
    manual = run(project_items.create_project_item(str(a.project.id), _item_body(), req(w.a_admin), db=db_session))
    assign_to_project(db_session, shared.b_member, a.project)
    db_session.commit()
    return SimpleNamespace(w=w, a=a, access=request.param, manual_id=manual["id"], b_member=shared.b_member,
                           third_admin=shared.third_admin)


class TestInternalMeetings:
    def test_defaults_owner_and_internal(self, db_session, vis):
        a = vis.a
        for source in (a.pending, a.processed, a.failed, vis.w.b.processed):
            db_session.refresh(source)
            assert source.visibility == "internal"
        assert a.processed.owner_organization_id == a.org.id
        assert vis.w.b.processed.owner_organization_id == vis.w.b.org.id
        manual = db_session.get(ProjectItem, uuid.UUID(vis.manual_id))
        assert manual.source_id is None and manual.owner_organization_id == a.org.id

    @pytest.mark.parametrize("who", ["b_admin", "b_member"])
    def test_invisible_to_shared_organization_on_every_endpoint(self, db_session, vis, recordings_dir, who):  # noqa: F811
        a = vis.a
        user = vis.w.b_admin if who == "b_admin" else vis.b_member
        r, pid = req(user), str(a.project.id)
        (recordings_dir / f"{a.processed.id}.mp4").write_bytes(b"video")

        # the project is visible (12.3) …
        assert access.project_access_level(db_session, user, a.project) != access.NONE
        # … but not souBIM's internal meetings or their items: list, facets, milestones, search
        listed = run(_list_items(db_session, user, pid))
        assert listed["items"] == [] and listed["total"] == 0
        assert listed["facets"] == {"item_types": {}, "source_types": {}, "disciplines": {}}
        assert run(_list_milestones(db_session, user, pid))["total"] == 0
        assert _search(db_session, user, pid, "Decision")["total"] == 0
        # detail by id → 404 (items of internal meetings and source-less internal items)
        for item_id in (str(a.item.id), vis.manual_id):
            assert status_of(project_items.get_project_item(pid, item_id, r, db=db_session)) == 404
            assert status_of(decisions.get_decision(uuid.UUID(item_id), db=db_session, user=user)) == 404
        expected = 403 if vis.access == "viewer" else 404  # a viewer fails the write check first
        assert status_of(project_items.update_project_item(pid, str(a.item.id), ProjectItemUpdate(is_done=True), r,
                                                           db=db_session)) == expected
        assert status_of(decisions.update_decision(a.item.id, db=db_session, user=user)) == 404
        # V1 decisions
        v1 = _decisions(db_session, user, a.project.id)
        assert v1["decisions"] == [] and v1["total"] == 0 and v1["facets"]["disciplines"] == {}
        # counts on the project card and detail
        card = _project_card(db_session, user, a.project.id)
        assert card["decision_count"] == 0 and card["latest_decision"] is None
        assert run(projects.get_project_detail(a.project.id, r, db=db_session))["stats"]["total_decisions"] == 0
        # meeting viewer (+ recording link), curation, visibility switch → not found
        for source in (a.pending, a.processed, a.failed):
            assert status_of(meetings.get_meeting(source.id, db=db_session, user=user)) == 404
            assert status_of(source_curation.get_curation_status(str(source.id), r, db=db_session)) == 404
            assert _set_visibility_status(db_session, user, source.id, "shared") == 404
        # ingestion queue / history / counts
        a_ids = {str(a.pending.id), str(a.processed.id), str(a.failed.id)}
        assert not a_ids & {s["id"] for s in _list_sources(db_session, user)["sources"]}
        assert not a_ids & {s["id"] for s in _list_sources(db_session, user, None)["sources"]}
        assert not a_ids & {s["id"] for s in _history(db_session, user)["sources"]}
        own_pending = 1 if who == "b_admin" else 0  # DIMAS's own project B (the member is not assigned to it)
        assert run(ingestion.pending_count(r, db=db_session)) == {"pending": own_pending}
        assert _list_sources(db_session, user)["pending_count"] == own_pending
        # nothing changed
        db_session.expire_all()
        assert db_session.get(Source, a.processed.id).visibility == "internal"
        assert db_session.get(ProjectItem, a.item.id).is_done is False

    def test_owner_organization_always_sees_its_meetings(self, db_session, vis, recordings_dir):  # noqa: F811
        a, pid = vis.a, str(vis.a.project.id)
        (recordings_dir / f"{a.processed.id}.mp4").write_bytes(b"video")
        for user in (vis.w.a_admin, vis.w.a_member):
            listed = run(_list_items(db_session, user, pid))
            assert {i["id"] for i in listed["items"]} == {str(a.item.id), vis.manual_id}
            assert run(_list_milestones(db_session, user, pid))["total"] == 1
            meeting = run(meetings.get_meeting(a.processed.id, db=db_session, user=user))
            assert meeting["visibility"] == "internal" and meeting["recording"]["type"] == "file"
            assert _project_card(db_session, user, a.project.id)["decision_count"] == 2
        assert {s["id"] for s in _list_sources(db_session, vis.w.a_admin)["sources"]} == {str(a.pending.id)}
        assert run(ingestion.pending_count(req(vis.w.a_admin), db=db_session)) == {"pending": 1}

    def test_public_share_link_never_shows_internal_items(self, db_session, vis):
        token = vis.a.link.share_token
        assert run(shared_links.view_shared_timeline(token, db=db_session))["milestones"] == []
        _set_visibility(db_session, vis.w.a_admin, vis.a.processed.id, "shared")
        milestones = run(shared_links.view_shared_timeline(token, db=db_session))["milestones"]
        assert [m["id"] for m in milestones] == [str(vis.a.item.id)]


class TestSwitchingVisibility:
    def test_share_shows_and_unshare_hides_again(self, db_session, vis, recordings_dir):  # noqa: F811
        a, user = vis.a, vis.w.b_admin
        r, pid = req(user), str(a.project.id)
        (recordings_dir / f"{a.processed.id}.mp4").write_bytes(b"video")

        result = _set_visibility(db_session, vis.w.a_admin, a.processed.id, "shared")
        assert result == {"id": str(a.processed.id), "visibility": "shared", "can_change_visibility": True}

        listed = run(_list_items(db_session, user, pid))
        assert [i["id"] for i in listed["items"]] == [str(a.item.id)]  # the manual item stays internal
        assert listed["items"][0]["source"]["visibility"] == "shared"
        assert run(_list_milestones(db_session, user, pid))["total"] == 1
        assert run(project_items.get_project_item(pid, str(a.item.id), r, db=db_session))["id"] == str(a.item.id)
        assert run(decisions.get_decision(a.item.id, db=db_session, user=user))["id"] == str(a.item.id)
        assert [d["id"] for d in _decisions(db_session, user, a.project.id)["decisions"]] == [str(a.item.id)]
        assert _project_card(db_session, user, a.project.id)["decision_count"] == 1
        meeting = run(meetings.get_meeting(a.processed.id, db=db_session, user=user))
        assert meeting["visibility"] == "shared" and meeting["can_change_visibility"] is False
        assert meeting["recording"]["url"].startswith(f"/api/recordings/{a.processed.id}?expires=")
        assert str(a.processed.id) in {s["id"] for s in _history(db_session, user)["sources"]}
        # still-internal meetings stay hidden; a third organization still sees nothing
        assert status_of(meetings.get_meeting(a.failed.id, db=db_session, user=user)) == 404
        assert status_of(meetings.get_meeting(a.processed.id, db=db_session, user=vis.third_admin)) == 404

        _set_visibility(db_session, vis.w.a_admin, a.processed.id, "internal")
        assert run(_list_items(db_session, user, pid))["total"] == 0
        assert status_of(project_items.get_project_item(pid, str(a.item.id), r, db=db_session)) == 404
        assert status_of(meetings.get_meeting(a.processed.id, db=db_session, user=user)) == 404
        assert status_of(decisions.get_decision(a.item.id, db=db_session, user=user)) == 404
        assert _project_card(db_session, user, a.project.id)["decision_count"] == 0
        assert str(a.processed.id) not in {s["id"] for s in _history(db_session, user)["sources"]}

    def test_only_admins_of_the_owner_organization_change_it(self, db_session, vis):
        a = vis.a
        _set_visibility(db_session, vis.w.a_admin, a.processed.id, "shared")
        for user in (vis.w.b_admin, vis.b_member, vis.w.a_member):
            assert _set_visibility_status(db_session, user, a.processed.id, "internal") == 403
            assert run(meetings.get_meeting(a.processed.id, db=db_session, user=user))["can_change_visibility"] is False
        assert run(meetings.get_meeting(a.processed.id, db=db_session, user=vis.w.a_admin))["can_change_visibility"]
        db_session.expire_all()
        assert db_session.get(Source, a.processed.id).visibility == "shared"
        with pytest.raises(ValueError):
            meetings.VisibilityUpdate(visibility="public")

    def test_ingestion_actions_on_shared_meetings_stay_owner_admin_only(self, db_session, vis):
        a, r = vis.a, req(vis.w.b_admin)
        _set_visibility(db_session, vis.w.a_admin, a.pending.id, "shared")
        assert str(a.pending.id) in {s["id"] for s in _list_sources(db_session, vis.w.b_admin)["sources"]}
        assert status_of(ingestion.update_source_status(str(a.pending.id), IngestionUpdate(ingestion_status="approved"),
                                                        r, db=db_session)) == 403
        result = run(ingestion.batch_update_sources(
            IngestionBatchAction(source_ids=[str(a.pending.id)], action="reject"), r, db=db_session))
        assert result["updated"] == 0


class TestSharedOrganizationMeetings:
    """Meetings and manual items created by a contributor organization are internal to it."""

    @pytest.fixture
    def contrib(self, db_session, shared):  # noqa: F811
        w = shared.world
        _share(db_session, w.a_admin, w.a.project.id, "dimas", "contributor")
        db_session.commit()
        return w

    def _webhook(self, db, user, project_id, webhook_id):
        payload = {"project_id": str(project_id), "webhook_id": webhook_id, "transcript": "x", "meeting_title": "Obra"}
        created = run(webhooks.receive_transcript(payload, req(user), background_tasks=_no_tasks(), db=db))
        return db.get(Source, uuid.UUID(created["source_id"]))

    def test_owned_by_the_creator_organization_and_internal(self, db_session, contrib):
        w, pid = contrib, str(contrib.a.project.id)
        source = self._webhook(db_session, w.b_admin, pid, "wh-b")
        assert source.owner_organization_id == w.b.org.id and source.visibility == "internal"
        item = run(project_items.create_project_item(pid, _item_body(), req(w.b_admin), db=db_session))
        assert db_session.get(ProjectItem, uuid.UUID(item["id"])).owner_organization_id == w.b.org.id

        # DIMAS sees its own meeting and item …
        assert str(source.id) in {s["id"] for s in _list_sources(db_session, w.b_admin)["sources"]}
        assert run(meetings.get_meeting(source.id, db=db_session, user=w.b_admin))["can_change_visibility"] is True
        assert item["id"] in {i["id"] for i in run(_list_items(db_session, w.b_admin, pid))["items"]}
        # … souBIM (the project owner) does not
        assert str(source.id) not in {s["id"] for s in _list_sources(db_session, w.a_admin)["sources"]}
        assert run(ingestion.pending_count(req(w.a_admin), db=db_session)) == {"pending": 1}
        assert status_of(meetings.get_meeting(source.id, db=db_session, user=w.a_admin)) == 404
        assert item["id"] not in {i["id"] for i in run(_list_items(db_session, w.a_admin, pid))["items"]}
        assert status_of(project_items.get_project_item(pid, item["id"], req(w.a_admin), db=db_session)) == 404
        assert _set_visibility_status(db_session, w.a_admin, source.id, "shared") == 404
        assert status_of(ingestion.update_source_status(str(source.id), IngestionUpdate(ingestion_status="approved"),
                                                        req(w.a_admin), db=db_session)) == 404
        result = run(ingestion.batch_update_sources(
            IngestionBatchAction(source_ids=[str(source.id)], action="approve"), req(w.a_admin), db=db_session))
        assert result["updated"] == 0

        # DIMAS shares it → souBIM sees it (and, as project admin, can process it)
        _set_visibility(db_session, w.b_admin, source.id, "shared")
        assert run(meetings.get_meeting(source.id, db=db_session, user=w.a_admin))["can_change_visibility"] is False
        assert str(source.id) in {s["id"] for s in _list_sources(db_session, w.a_admin)["sources"]}

    def test_webhook_id_of_another_organizations_internal_meeting_is_not_revealed(self, db_session, contrib):
        w = contrib
        w.a.pending.webhook_id = "wh-soubim-internal"
        db_session.commit()
        payload = {"project_id": str(w.a.project.id), "webhook_id": "wh-soubim-internal", "transcript": "x"}
        assert status_of(webhooks.receive_transcript(payload, req(w.b_admin), background_tasks=_no_tasks(),
                                                     db=db_session)) == 409

    def test_curation_upload_never_copies_another_organizations_internal_meeting(self, db_session, contrib):
        w = contrib
        w.a.project.drive_folder_id = "soubim-folder"
        db_session.commit()
        source = self._webhook(db_session, w.b_admin, w.a.project.id, "wh-c")
        uploads = []

        def upload(folder, name, content):
            uploads.append(folder)
            return {"file_id": f"file-{len(uploads)}"}

        service = SourceCurationService(db_session, backend=SimpleNamespace(upload=upload))
        assert service.upload_to_storage(str(source.id)) is False
        assert uploads == []
        _set_visibility(db_session, w.b_admin, source.id, "shared")
        assert service.upload_to_storage(str(source.id)) is True
        assert uploads == ["soubim-folder"]
        # the owner organization's own internal meetings still go to its folder
        assert service.upload_to_storage(str(w.a.processed.id)) is True
