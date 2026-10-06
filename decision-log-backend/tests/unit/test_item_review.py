"""Item review by role (Story 12.6): approve / reject / edit / restore, bulk, visibility of unreviewed items.

Builds on the 12.2-12.4 isolation world (souBIM owns project A, shared with DIMAS as viewer / contributor,
souBIM's meeting shared) and on extraction versions (13.7): reviews live on a run's items.
"""

import json
import uuid
from datetime import datetime

import pytest
from fastapi import HTTPException
from sqlalchemy import text

from app.api.routes import decisions, extraction_runs as runs_routes, ingestion, item_reviews, project_items, projects, shared_links
from app.database.models import ExtractionRun, Project, ProjectItem
from app.services.extraction_runs import activate_run
from app.services.item_import import import_items
from tests.unit.test_extraction_runs import output
from tests.unit.test_meeting_visibility import _decisions, _project_card, _search, _set_visibility, vis  # noqa: F401
from tests.unit.test_org_isolation import (  # noqa: F401 — fixtures
    _history,
    _list_items,
    _list_milestones,
    req,
    run,
    shared,
    status_of,
    world,
)


def _review(db, user, project_id, item_id, status):
    return run(item_reviews.review_item(str(project_id), str(item_id), item_reviews.ReviewBody(status=status),
                                        req(user), db=db))


def _edit(db, user, project_id, item_id, **fields):
    return run(item_reviews.edit_item(str(project_id), str(item_id), item_reviews.ItemEditBody(**fields),
                                      req(user), db=db))


def _restore(db, user, project_id, item_id):
    return run(item_reviews.restore_item(str(project_id), str(item_id), req(user), db=db))


def _bulk(db, user, project_id, **kwargs):
    return run(item_reviews.bulk_review(str(project_id), item_reviews.BulkReviewBody(**kwargs), req(user), db=db))


def _list(db, user, project_id, **kwargs):
    params = dict(item_type=None, source_type=None, discipline=None, is_milestone=None, date_from=None, date_to=None,
                  search=None, sort_by="created_at", sort_order="desc", limit=50, offset=0, review_status=None,
                  include_rejected=False)
    params.update(kwargs)
    return run(project_items.list_project_items(project_id=str(project_id), request=req(user), db=db, **params))


def _ids(data):
    return {i["id"] for i in data["items"]}


@pytest.fixture
def rv(db_session, vis):  # noqa: F811
    """World where souBIM's meeting is shared with DIMAS and its milestone decision is pending."""
    a = vis.a
    _set_visibility(db_session, vis.w.a_admin, a.processed.id, "shared")
    a.item.review_status = "pending"
    # the item belongs to version 1 of its meeting (like any extracted item, Story 13.7)
    first = ExtractionRun(source_id=a.processed.id, version=1, is_active=True)
    db_session.add(first)
    db_session.flush()
    a.item.extraction_run_id = first.id
    db_session.commit()
    vis.item_id = str(a.item.id)
    vis.pid = str(a.project.id)
    return vis


class TestStatusOnCreation:
    def test_extracted_items_start_pending_manual_and_existing_items_approved(self, db_session, rv):
        items, _ = import_items(db_session, rv.a.processed, output("X")["items"], replace=True)
        db_session.commit()
        assert [i.review_status for i in items] == ["pending"]
        assert db_session.get(ProjectItem, uuid.UUID(rv.manual_id)).review_status == "approved"

    def test_backfill_default_is_approved(self, db_session, rv):
        """Rows inserted without a review_status (what the migration backfill does) are approved."""
        item = rv.a.item
        db_session.execute(text(
            "INSERT INTO project_items (id, project_id, item_type, source_type, is_milestone, is_done, "
            "affected_disciplines, statement, who, discipline, why, consensus, created_at, updated_at) "
            "VALUES (:id, :p, 'decision', 'meeting', false, false, '[]', 'Old row', 'Ana', 'general', 'x', '{}', "
            "now(), now())"), {"id": str(uuid.uuid4()), "p": str(item.project_id)})
        db_session.commit()
        assert db_session.query(ProjectItem).filter(ProjectItem.statement == "Old row").one().review_status == "approved"


class TestWhoCanReview:
    def test_only_owner_organization_admins(self, db_session, rv):
        w = rv.w
        assert _review(db_session, w.a_admin, rv.pid, rv.item_id, "approved")["review_status"] == "approved"
        # souBIM member (write), DIMAS admin (viewer / contributor share), DIMAS member, third organization
        for user in (w.a_member, w.b_admin, rv.b_member, rv.third_admin, w.nobody):
            for call in (
                lambda: item_reviews.review_item(rv.pid, rv.item_id, item_reviews.ReviewBody(status="rejected"),
                                                 req(user), db=db_session),
                lambda: item_reviews.edit_item(rv.pid, rv.item_id, item_reviews.ItemEditBody(title="x"), req(user),
                                               db=db_session),
                lambda: item_reviews.restore_item(rv.pid, rv.item_id, req(user), db=db_session),
                lambda: item_reviews.bulk_review(rv.pid, item_reviews.BulkReviewBody(status="approved",
                                                                                     item_ids=[rv.item_id]),
                                                 req(user), db=db_session),
            ):
                assert status_of(call()) == 403
        db_session.expire_all()
        item = db_session.get(ProjectItem, uuid.UUID(rv.item_id))
        assert item.review_status == "approved" and item.original is None

    def test_records_reviewer_and_time(self, db_session, rv):
        data = _review(db_session, rv.w.a_admin, rv.pid, rv.item_id, "rejected")
        assert data["review_status"] == "rejected" and data["reviewed_by"] == str(rv.w.a_admin.id)
        assert data["reviewed_by_name"] and data["reviewed_at"]
        back = _review(db_session, rv.w.a_admin, rv.pid, rv.item_id, "pending")
        assert back["reviewed_by"] is None and back["reviewed_at"] is None

    def test_item_of_another_project_is_not_found(self, db_session, rv):
        assert status_of(item_reviews.review_item(str(rv.w.b.project.id), rv.item_id,
                                                  item_reviews.ReviewBody(status="approved"), req(rv.w.b_admin),
                                                  db=db_session)) == 404


class TestPendingHiddenFromSharedOrganization:
    """A pending item of a shared meeting is seen by the owning organization only, on every listing."""

    def test_every_listing(self, db_session, rv):
        w, a, pid = rv.w, rv.a, rv.pid
        for user in (w.b_admin, rv.b_member):
            r = req(user)
            assert rv.item_id not in _ids(_list(db_session, user, pid))
            assert rv.item_id not in _ids(_list(db_session, user, pid, include_rejected=True))
            assert rv.item_id not in _ids(_list(db_session, user, pid, review_status="pending"))
            assert _list(db_session, user, pid, search="Decision A")["items"] == []
            facets = _list(db_session, user, pid)["facets"]
            assert facets["item_types"] == {}  # the manual item is internal, the extracted one pending
            assert run(_list_milestones(db_session, user, pid))["total"] == 0
            v1 = _decisions(db_session, user, a.project.id)
            assert v1["decisions"] == [] and v1["total"] == 0 and v1["facets"]["disciplines"] == {}
            assert _project_card(db_session, user, a.project.id)["decision_count"] == 0
            assert run(projects.get_project_detail(a.project.id, r, db=db_session))["stats"]["total_decisions"] == 0
            assert status_of(project_items.get_project_item(pid, rv.item_id, r, db=db_session)) == 404
            assert status_of(decisions.get_decision(uuid.UUID(rv.item_id), db=db_session, user=user)) == 404
            data = run(runs_routes.list_extraction_runs(a.processed.id, db=db_session, user=user))
            assert sum(run_["item_count"] for run_ in data["runs"]) == 0
            history = {s["id"]: s for s in _history(db_session, user)["sources"]}
            assert history[str(a.processed.id)]["extracted_item_count"] == 0
        # public share link
        assert run(shared_links.view_shared_timeline(a.link.share_token, db=db_session))["milestones"] == []

    def test_owner_organization_sees_pending(self, db_session, rv):
        w, a, pid = rv.w, rv.a, rv.pid
        for user in (w.a_admin, w.a_member):
            data = _list(db_session, user, pid)
            item = next(i for i in data["items"] if i["id"] == rv.item_id)
            assert item["review_status"] == "pending"
            assert run(_list_milestones(db_session, user, pid))["total"] == 1
            assert _decisions(db_session, user, a.project.id)["total"] == 2  # + the manual decision
            assert _project_card(db_session, user, a.project.id)["decision_count"] == 2
            assert run(project_items.get_project_item(pid, rv.item_id, req(user), db=db_session))["id"] == rv.item_id
        history = {s["id"]: s for s in _history(db_session, w.a_admin)["sources"]}
        assert history[str(a.processed.id)]["extracted_item_count"] == 1

    def test_approving_shows_it_and_pending_again_hides_it(self, db_session, rv):
        w, a, pid = rv.w, rv.a, rv.pid
        _review(db_session, w.a_admin, pid, rv.item_id, "approved")
        for user in (w.b_admin, rv.b_member):
            assert rv.item_id in _ids(_list(db_session, user, pid))
            assert run(_list_milestones(db_session, user, pid))["total"] == 1
            assert _decisions(db_session, user, a.project.id)["total"] == 1
            assert _project_card(db_session, user, a.project.id)["decision_count"] == 1
        milestones = run(shared_links.view_shared_timeline(a.link.share_token, db=db_session))["milestones"]
        assert [m["id"] for m in milestones] == [rv.item_id]
        _review(db_session, w.a_admin, pid, rv.item_id, "pending")
        assert rv.item_id not in _ids(_list(db_session, w.b_admin, pid))


class TestRejected:
    def test_hidden_by_default_even_for_the_owner_shown_on_request(self, db_session, rv):
        w, pid = rv.w, rv.pid
        _review(db_session, w.a_admin, pid, rv.item_id, "rejected")
        assert rv.item_id not in _ids(_list(db_session, w.a_admin, pid))
        assert _decisions(db_session, w.a_admin, rv.a.project.id)["total"] == 1  # the manual decision
        assert run(_list_milestones(db_session, w.a_admin, pid))["total"] == 0
        assert rv.item_id in _ids(_list(db_session, w.a_admin, pid, include_rejected=True))
        assert _ids(_list(db_session, w.a_admin, pid, review_status="rejected")) == {rv.item_id}
        assert _list(db_session, w.a_admin, pid, include_rejected=True)["facets"]["item_types"]["decision"] == 2

    def test_never_shown_to_the_shared_organization(self, db_session, rv):
        _review(db_session, rv.w.a_admin, rv.pid, rv.item_id, "rejected")
        for user in (rv.w.b_admin, rv.b_member):
            assert rv.item_id not in _ids(_list(db_session, user, rv.pid, include_rejected=True))
            assert rv.item_id not in _ids(_list(db_session, user, rv.pid, review_status="rejected"))
            assert status_of(project_items.get_project_item(rv.pid, rv.item_id, req(user), db=db_session)) == 404

    def test_invalid_status_filter(self, db_session, rv):
        with pytest.raises(HTTPException) as exc:
            _list(db_session, rv.w.a_admin, rv.pid, review_status="bogus")
        assert exc.value.status_code == 422


class TestEditAndRestore:
    def test_edit_keeps_the_ai_original_and_approves(self, db_session, rv):
        item = db_session.get(ProjectItem, uuid.UUID(rv.item_id))
        item.title, item.owner, item.why = "AI title", "Ana", "AI why"
        db_session.commit()
        data = _edit(db_session, rv.w.a_admin, rv.pid, rv.item_id, title="Better", statement="Better statement",
                     why="Better why", owner="Bia", due_date=datetime(2026, 12, 1))
        assert (data["title"], data["statement"], data["why"], data["owner"]) == (
            "Better", "Better statement", "Better why", "Bia")
        assert data["due_date"].startswith("2026-12-01") and data["is_edited"] is True
        assert data["review_status"] == "approved" and data["reviewed_by"] == str(rv.w.a_admin.id)
        assert data["original"] == {"title": "AI title", "statement": "Decision A", "why": "AI why", "owner": "Ana",
                                    "due_date": None}
        db_session.expire_all()
        assert db_session.get(ProjectItem, uuid.UUID(rv.item_id)).decision_statement == "Better statement"

    def test_a_second_edit_does_not_overwrite_the_original(self, db_session, rv):
        _edit(db_session, rv.w.a_admin, rv.pid, rv.item_id, statement="One")
        data = _edit(db_session, rv.w.a_admin, rv.pid, rv.item_id, statement="Two")
        assert data["statement"] == "Two" and data["original"]["statement"] == "Decision A"

    def test_empty_edit_is_rejected(self, db_session, rv):
        assert status_of(item_reviews.edit_item(rv.pid, rv.item_id, item_reviews.ItemEditBody(), req(rv.w.a_admin),
                                                db=db_session)) == 422

    def test_restore_puts_the_original_back(self, db_session, rv):
        assert status_of(item_reviews.restore_item(rv.pid, rv.item_id, req(rv.w.a_admin), db=db_session)) == 409
        _edit(db_session, rv.w.a_admin, rv.pid, rv.item_id, statement="Edited", owner="Bia", due_date=datetime(2026, 1, 2))
        data = _restore(db_session, rv.w.a_admin, rv.pid, rv.item_id)
        assert data["statement"] == "Decision A" and data["owner"] is None and data["due_date"] is None
        assert data["is_edited"] is False and data["original"] is None
        assert data["review_status"] == "approved"  # restoring does not change the review status
        db_session.expire_all()
        assert db_session.get(ProjectItem, uuid.UUID(rv.item_id)).decision_statement == "Decision A"

    def test_restore_keeps_a_due_date_the_ai_had(self, db_session, rv):
        item = db_session.get(ProjectItem, uuid.UUID(rv.item_id))
        item.due_date = datetime(2026, 11, 5)
        db_session.commit()
        _edit(db_session, rv.w.a_admin, rv.pid, rv.item_id, due_date=datetime(2027, 1, 1))
        assert _restore(db_session, rv.w.a_admin, rv.pid, rv.item_id)["due_date"].startswith("2026-11-05")

    def test_original_is_only_sent_to_the_owner_organization(self, db_session, rv):
        _edit(db_session, rv.w.a_admin, rv.pid, rv.item_id, statement="Edited")
        owner_side = next(i for i in _list(db_session, rv.w.a_member, rv.pid)["items"] if i["id"] == rv.item_id)
        assert owner_side["original"]["statement"] == "Decision A"
        for user in (rv.w.b_admin, rv.b_member):
            item = next(i for i in _list(db_session, user, rv.pid)["items"] if i["id"] == rv.item_id)
            assert item["statement"] == "Edited" and item["is_edited"] is True and item["original"] is None
            detail = run(project_items.get_project_item(rv.pid, rv.item_id, req(user), db=db_session))
            assert detail["original"] is None

    def test_can_review_flag(self, db_session, rv):
        assert _list(db_session, rv.w.a_admin, rv.pid)["can_review"] is True
        for user in (rv.w.a_member, rv.w.b_admin, rv.b_member):
            assert _list(db_session, user, rv.pid)["can_review"] is False

    def test_plain_statement_patch_keeps_the_original_too(self, db_session, rv):
        body = project_items.ProjectItemUpdate(statement="Quick fix")
        run(project_items.update_project_item(rv.pid, rv.item_id, body, req(rv.w.a_admin), db=db_session))
        db_session.expire_all()
        item = db_session.get(ProjectItem, uuid.UUID(rv.item_id))
        assert item.statement == "Quick fix" and item.original["statement"] == "Decision A"
        assert item.review_status == "pending"  # a plain edit is not a review


class TestBulk:
    @pytest.fixture
    def meeting_items(self, db_session, rv):
        items, _ = import_items(db_session, rv.a.processed, output("One", "Two", "Three")["items"], replace=True)
        db_session.commit()
        return items

    def test_approve_every_pending_item_of_a_meeting(self, db_session, rv, meeting_items):
        _review(db_session, rv.w.a_admin, rv.pid, meeting_items[0].id, "rejected")
        data = _bulk(db_session, rv.w.a_admin, rv.pid, status="approved", source_id=str(rv.a.processed.id))
        assert data["updated"] == 2  # the rejected one is not pending anymore
        db_session.expire_all()
        assert sorted(i.review_status for i in meeting_items) == ["approved", "approved", "rejected"]
        assert all(i.reviewed_by == rv.w.a_admin.id for i in meeting_items[1:])

    def test_by_ids_including_rejecting(self, db_session, rv, meeting_items):
        ids = [str(i.id) for i in meeting_items[:2]]
        assert _bulk(db_session, rv.w.a_admin, rv.pid, status="rejected", item_ids=ids)["updated"] == 2
        db_session.expire_all()
        assert [i.review_status for i in meeting_items] == ["rejected", "rejected", "pending"]

    def test_only_the_active_run_and_the_project_are_touched(self, db_session, rv, meeting_items):
        old = db_session.query(ProjectItem).filter(ProjectItem.id == rv.item_id).one()  # run 1 (now inactive)
        other = str(rv.w.b.item.id)
        data = _bulk(db_session, rv.w.a_admin, rv.pid, status="approved", item_ids=[str(old.id), other])
        assert data["updated"] == 0
        db_session.expire_all()
        assert old.review_status == "pending" and db_session.get(ProjectItem, rv.w.b.item.id).review_status == "approved"

    def test_needs_exactly_one_selector(self, db_session, rv):
        for kwargs in ({}, {"item_ids": [rv.item_id], "source_id": str(rv.a.processed.id)}):
            assert status_of(item_reviews.bulk_review(rv.pid, item_reviews.BulkReviewBody(status="approved", **kwargs),
                                                      req(rv.w.a_admin), db=db_session)) == 422


class TestRunSwitching:
    """Reviews belong to a run's items: nothing is carried over, switching back restores that run's state."""

    def test_new_run_starts_pending_and_old_review_comes_back_on_rollback(self, db_session, rv):
        w, pid, source = rv.w, rv.pid, rv.a.processed
        v1_item = db_session.get(ProjectItem, uuid.UUID(rv.item_id))
        _edit(db_session, w.a_admin, pid, rv.item_id, statement="Reviewed v1")
        import_items(db_session, source, output("Fresh")["items"], replace=True)
        db_session.commit()
        v1, v2 = db_session.query(ExtractionRun).filter(ExtractionRun.source_id == source.id).order_by(
            ExtractionRun.version).all()
        # v2 is active: its item is pending (hidden from DIMAS), v1's reviewed item is not listed at all
        owner_view = {i["statement"]: i["review_status"] for i in _list(db_session, w.a_admin, pid)["items"]}
        assert owner_view["Fresh"] == "pending" and "Reviewed v1" not in owner_view
        assert "Fresh" not in {i["statement"] for i in _list(db_session, w.b_admin, pid)["items"]}
        # approve the v2 item, then roll back to v1: v1 keeps its own edit + approval, v2's approval does not leak
        fresh = db_session.query(ProjectItem).filter(ProjectItem.statement == "Fresh").one()
        _review(db_session, w.a_admin, pid, fresh.id, "approved")
        activate_run(db_session, source, v1)
        db_session.commit()
        db_session.expire_all()
        after = {i["statement"]: i for i in _list(db_session, w.b_admin, pid)["items"]}
        assert "Reviewed v1" in after and "Fresh" not in after
        assert db_session.get(ProjectItem, v1_item.id).review_status == "approved"
        activate_run(db_session, source, v2)
        db_session.commit()
        assert "Fresh" in {i["statement"] for i in _list(db_session, w.b_admin, pid)["items"]}

    def test_pending_item_of_an_inactive_run_is_not_in_the_review_queue(self, db_session, rv):
        old_id = rv.item_id
        import_items(db_session, rv.a.processed, output("Fresh")["items"], replace=True)
        db_session.commit()
        data = _bulk(db_session, rv.w.a_admin, rv.pid, status="approved", source_id=str(rv.a.processed.id))
        assert data["updated"] == 1
        db_session.expire_all()
        assert db_session.get(ProjectItem, uuid.UUID(old_id)).review_status == "pending"
