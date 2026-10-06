"""Story 12.7: ``reviewer`` organization role, project assignment API, per-project capabilities.

Builds on the 12.2 / 12.3 isolation world: souBIM owns project A (pending / processed / failed meetings,
a milestone item), DIMAS owns project B; ``shared`` adds a DIMAS member and a third organization.
Route functions are called directly.
"""

import uuid
from datetime import datetime

import pytest
from fastapi import HTTPException

from app.api.models.ingestion import IngestionBatchAction, IngestionUpdate
from app.api.models.project_item import ProjectItemUpdate
from app.api.routes import (
    ingestion,
    item_reviews,
    organizations as org_routes,
    project_items,
    project_organizations,
    projects,
    shared_links,
)
from app.database.models import OrganizationMember, Project, ProjectItem, ProjectMember, Source
from app.services import access, invitations
from app.services.organizations import change_member_role, remove_member
from tests.org_helpers import assign_to_project, make_org_member
from tests.unit.test_meeting_visibility import _set_visibility_status
from tests.unit.test_org_isolation import (  # noqa: F401 — fixtures
    _list_items,
    _list_projects,
    _list_sources,
    _share,
    _user,
    req,
    run,
    shared,
    status_of,
    world,
)


def _review(db, user, project_id, item_id, status="approved"):
    return item_reviews.review_item(str(project_id), str(item_id), item_reviews.ReviewBody(status=status), req(user),
                                    db=db)


def _approve_source(db, user, source_id):
    return ingestion.update_source_status(str(source_id), IngestionUpdate(ingestion_status="approved"), req(user),
                                          db=db)


def _assignments(db, user, org_id):
    return run(org_routes.get_project_assignments(org_id, db=db, user=user))


def _assign(db, user, org_id, user_id, project_id):
    return org_routes.put_project_assignment(org_id, user_id, project_id, db=db, user=user)


def _unassign(db, user, org_id, user_id, project_id):
    return org_routes.delete_project_assignment(org_id, user_id, project_id, db=db, user=user)


@pytest.fixture
def rv(db_session, shared):  # noqa: F811
    """+ an assigned souBIM reviewer, an unassigned souBIM reviewer and a DIMAS reviewer."""
    w = shared.world
    shared.reviewer = _user(db_session, "reviewer@soubim.com")
    shared.idle_reviewer = _user(db_session, "idle.reviewer@soubim.com")
    shared.b_reviewer = _user(db_session, "reviewer@dimas.com")
    make_org_member(db_session, shared.reviewer, "reviewer", org=w.a.org)
    make_org_member(db_session, shared.idle_reviewer, "reviewer", org=w.a.org)
    make_org_member(db_session, shared.b_reviewer, "reviewer", org=w.b.org)
    assign_to_project(db_session, shared.reviewer, w.a.project)
    db_session.commit()
    return shared


class TestReviewerRole:
    def test_reviewer_reviews_items_and_approves_meetings(self, db_session, rv):
        w, r = rv.world, req(rv.reviewer)
        a, pid = w.a, str(w.a.project.id)
        assert access.project_access_level(db_session, rv.reviewer, a.project) == access.REVIEW
        assert access.project_capabilities(db_session, rv.reviewer, a.project) == {
            "access_level": "review", "can_review": True, "can_manage": False}

        assert run(_review(db_session, rv.reviewer, pid, a.item.id, "rejected"))["review_status"] == "rejected"
        edited = run(item_reviews.edit_item(pid, str(a.item.id), item_reviews.ItemEditBody(title="Fixed"), r,
                                            db=db_session))
        assert edited["review_status"] == "approved" and edited["reviewed_by"] == str(rv.reviewer.id)
        run(item_reviews.restore_item(pid, str(a.item.id), r, db=db_session))
        bulk = run(item_reviews.bulk_review(pid, item_reviews.BulkReviewBody(status="approved",
                                                                            item_ids=[str(a.item.id)]), r, db=db_session))
        assert bulk["updated"] == 1

        assert run(_approve_source(db_session, rv.reviewer, a.pending.id))["ingestion_status"] == "approved"
        assert run(ingestion.retry_source(str(a.failed.id), r, db=db_session))["ingestion_status"] == "approved"
        other = Source(project_id=a.project.id, source_type="meeting", title="Another", ingestion_status="pending",
                       occurred_at=datetime(2026, 9, 4),
                       raw_content="x")
        db_session.add(other)
        db_session.commit()
        result = run(ingestion.batch_update_sources(IngestionBatchAction(source_ids=[str(other.id)], action="reject"),
                                                    r, db=db_session))
        assert result["updated"] == 1

    def test_reviewer_also_has_write(self, db_session, rv):
        a = rv.world.a
        updated = run(project_items.update_project_item(str(a.project.id), str(a.item.id),
                                                        ProjectItemUpdate(is_done=True), req(rv.reviewer),
                                                        db=db_session))
        assert updated["is_done"] is True

    def test_reviewer_cannot_manage(self, db_session, rv):
        w, r = rv.world, req(rv.reviewer)
        a, pid = w.a, str(w.a.project.id)
        assert status_of(ingestion.delete_source(str(a.processed.id), r, db=db_session)) == 403
        assert status_of(project_items.update_project_item(pid, str(a.item.id), ProjectItemUpdate(is_milestone=False),
                                                           r, db=db_session)) == 403
        assert status_of(projects.update_project(a.project.id, projects.ProjectUpdate(name="x"), r,
                                                 db=db_session)) == 403
        assert status_of(projects.archive_project(a.project.id, r, db=db_session)) == 403
        assert status_of(projects.create_project(projects.ProjectCreate(name="X"), r, db=db_session)) == 403
        assert status_of(shared_links.create_share_link(pid, shared_links.CreateShareLinkRequest(), r,
                                                        db=db_session)) == 403
        assert status_of(project_organizations.list_project_organizations(a.project.id, r, db=db_session)) == 403
        assert _set_visibility_status(db_session, rv.reviewer, a.processed.id, "shared") == 403
        # organization management: members, invitations, assignments
        org_id = a.org.id
        assert status_of(org_routes.get_members(org_id, db=db_session, user=rv.reviewer)) == 403
        assert status_of(org_routes.get_project_assignments(org_id, db=db_session, user=rv.reviewer)) == 403
        assert status_of(_assign(db_session, rv.reviewer, org_id, rv.idle_reviewer.id, a.project.id)) == 403
        db_session.expire_all()
        assert db_session.get(ProjectItem, a.item.id).is_milestone is True
        assert db_session.get(Source, a.processed.id) is not None

    def test_unassigned_reviewer_gets_nothing(self, db_session, rv):
        a = rv.world.a
        assert access.project_access_level(db_session, rv.idle_reviewer, a.project) == access.NONE
        assert _list_projects(db_session, rv.idle_reviewer)["projects"] == []
        assert status_of(_review(db_session, rv.idle_reviewer, a.project.id, a.item.id)) == 403
        assert status_of(_approve_source(db_session, rv.idle_reviewer, a.pending.id)) == 404

    def test_reviewer_of_another_organization_gets_nothing(self, db_session, rv):
        w = rv.world
        a = w.a
        assert access.project_access_level(db_session, rv.b_reviewer, a.project) == access.NONE
        assert {p["id"] for p in _list_projects(db_session, rv.b_reviewer)["projects"]} == set()
        assert status_of(_list_items(db_session, rv.b_reviewer, a.project.id)) == 403
        assert status_of(_review(db_session, rv.b_reviewer, a.project.id, a.item.id)) == 403
        assert status_of(_approve_source(db_session, rv.b_reviewer, a.pending.id)) == 404
        assert _list_sources(db_session, rv.b_reviewer)["sources"] == []

    def test_reviewer_of_shared_organization_does_not_review(self, db_session, rv):
        """A contributor organization's reviewer gets the shared level when assigned: review stays with the owner."""
        w = rv.world
        a = w.a
        _share(db_session, w.a_admin, a.project.id, "dimas", "contributor")
        a.pending.visibility = "shared"
        db_session.commit()
        assert access.project_access_level(db_session, rv.b_reviewer, a.project) == access.NONE  # not assigned
        run(_assign(db_session, w.b_admin, w.b.org.id, rv.b_reviewer.id, a.project.id))
        assert access.project_access_level(db_session, rv.b_reviewer, a.project) == access.WRITE
        assert access.can_review_items(db_session, rv.b_reviewer, a.project) is False
        assert status_of(_review(db_session, rv.b_reviewer, a.project.id, a.item.id)) in (403, 404)
        assert status_of(_approve_source(db_session, rv.b_reviewer, a.pending.id)) == 403

    def test_ingestion_rows_carry_capabilities(self, db_session, rv):
        rows = {s["id"]: s for s in _list_sources(db_session, rv.reviewer)["sources"]}
        assert rows[str(rv.world.a.pending.id)]["can_review"] is True
        assert rows[str(rv.world.a.pending.id)]["can_manage"] is False
        admin_rows = {s["id"]: s for s in _list_sources(db_session, rv.world.a_admin)["sources"]}
        assert admin_rows[str(rv.world.a.pending.id)]["can_manage"] is True
        member_rows = {s["id"]: s for s in _list_sources(db_session, rv.world.a_member)["sources"]}
        assert member_rows[str(rv.world.a.pending.id)]["can_review"] is False

    def test_project_responses_carry_capabilities(self, db_session, rv):
        w = rv.world
        pid = str(w.a.project.id)
        listed = {p["id"]: p for p in _list_projects(db_session, w.a_member)["projects"]}
        assert listed[pid]["access_level"] == "write" and listed[pid]["can_manage"] is False
        detail = run(projects.get_project_detail(w.a.project.id, req(w.a_admin), db=db_session))
        assert detail["can_manage"] is True and detail["can_review"] is True
        items = run(_list_items(db_session, rv.reviewer, pid))
        assert (items["access_level"], items["can_review"], items["can_manage"]) == ("review", True, False)


class TestReviewerIsInvitable:
    def test_admin_invites_and_promotes_reviewers(self, db_session, rv):
        w = rv.world
        invitation, _ = invitations.create_invitation(db_session, w.a_admin, "new.reviewer@x.com", "reviewer",
                                                      organization=w.a.org)
        assert invitation.role == "reviewer"
        change_member_role(db_session, w.a_admin, w.a.org.id, w.a_member.id, "reviewer")
        role = db_session.query(OrganizationMember.role).filter_by(user_id=w.a_member.id).scalar()
        assert role == "reviewer"
        # the assignment the member had keeps working, now with review
        assert access.project_access_level(db_session, w.a_member, w.a.project) == access.REVIEW

    def test_reviewer_cannot_invite(self, db_session, rv):
        with pytest.raises(HTTPException) as exc:
            invitations.create_invitation(db_session, rv.reviewer, "x@x.com", "member", organization=rv.world.a.org)
        assert exc.value.status_code == 403


class TestProjectAssignments:
    def test_assigned_member_gains_access_and_unassigned_loses_it(self, db_session, rv):
        w = rv.world
        a, org_id = w.a, w.a.org.id
        newbie = _user(db_session, "newbie@soubim.com")
        make_org_member(db_session, newbie, "member", org=a.org)
        db_session.commit()
        assert access.project_access_level(db_session, newbie, a.project) == access.NONE

        assert run(_assign(db_session, w.a_admin, org_id, newbie.id, a.project.id))["assigned"] is True
        run(_assign(db_session, w.a_admin, org_id, newbie.id, a.project.id))  # idempotent
        assert access.project_access_level(db_session, newbie, a.project) == access.WRITE
        assert {p["id"] for p in _list_projects(db_session, newbie)["projects"]} == {str(a.project.id)}
        assert {"user_id": str(newbie.id), "project_id": str(a.project.id)} in _assignments(
            db_session, w.a_admin, org_id)["assignments"]

        run(_unassign(db_session, w.a_admin, org_id, newbie.id, a.project.id))
        assert access.project_access_level(db_session, newbie, a.project) == access.NONE
        assert _list_projects(db_session, newbie)["projects"] == []
        assert status_of(_list_items(db_session, newbie, a.project.id)) == 403

    def test_cross_organization_assignment_is_denied(self, db_session, rv):
        w = rv.world
        a, b = w.a, w.b
        # souBIM admin: DIMAS user on souBIM's project, souBIM member on DIMAS's project
        assert status_of(_assign(db_session, w.a_admin, a.org.id, rv.b_member.id, a.project.id)) == 404
        assert status_of(_assign(db_session, w.a_admin, a.org.id, w.a_member.id, b.project.id)) == 404
        # through an organization the caller does not belong to / does not administer
        assert status_of(_assign(db_session, w.a_admin, b.org.id, rv.b_member.id, b.project.id)) == 404
        assert status_of(_assign(db_session, w.a_member, a.org.id, rv.idle_reviewer.id, a.project.id)) == 403
        # DIMAS admin: project A is not shared with DIMAS yet
        assert status_of(_assign(db_session, w.b_admin, b.org.id, rv.b_member.id, a.project.id)) == 404
        assert status_of(_unassign(db_session, w.b_admin, b.org.id, w.a_member.id, a.project.id)) == 404
        assert db_session.query(ProjectMember).filter_by(user_id=rv.b_member.id).count() == 0
        assert db_session.query(ProjectMember).filter_by(user_id=w.a_member.id).count() == 1

    def test_shared_organization_admin_assigns_only_own_users(self, db_session, rv):
        w = rv.world
        a, b = w.a, w.b
        _share(db_session, w.a_admin, a.project.id, "dimas", "viewer")
        listed = _assignments(db_session, w.b_admin, b.org.id)
        assert {(p["id"], p["owned"]) for p in listed["projects"]} == {(str(a.project.id), False),
                                                                       (str(b.project.id), True)}
        assert listed["assignments"] == []  # souBIM's assignments on project A are not shown to DIMAS

        run(_assign(db_session, w.b_admin, b.org.id, rv.b_member.id, a.project.id))
        assert access.project_access_level(db_session, rv.b_member, a.project) == access.READ
        # never another organization's users, not even on the shared project
        assert status_of(_assign(db_session, w.b_admin, b.org.id, rv.idle_reviewer.id, a.project.id)) == 404
        assert status_of(_unassign(db_session, w.b_admin, b.org.id, w.a_member.id, a.project.id)) == 404
        assert access.project_access_level(db_session, w.a_member, a.project) == access.WRITE
        # souBIM's list shows only souBIM users' assignments
        soubim_users = {x["user_id"] for x in _assignments(db_session, w.a_admin, a.org.id)["assignments"]}
        assert str(rv.b_member.id) not in soubim_users and str(w.a_member.id) in soubim_users

    def test_removing_a_member_clears_shared_project_assignments(self, db_session, rv):
        w = rv.world
        a, b = w.a, w.b
        _share(db_session, w.a_admin, a.project.id, "dimas", "contributor")
        run(_assign(db_session, w.b_admin, b.org.id, rv.b_member.id, a.project.id))
        remove_member(db_session, w.b_admin, b.org.id, rv.b_member.id)
        assert db_session.query(ProjectMember).filter_by(user_id=rv.b_member.id).count() == 0
        # souBIM's own assignments are untouched
        assert db_session.query(ProjectMember).filter_by(user_id=w.a_member.id).count() == 1

    def test_unknown_or_archived_project(self, db_session, rv):
        w = rv.world
        assert status_of(_assign(db_session, w.a_admin, w.a.org.id, w.a_member.id, uuid.uuid4())) == 404
        archived = Project(name="Old", owner_organization_id=w.a.org.id)
        db_session.add(archived)
        db_session.commit()
        archived.archived_at = archived.created_at
        db_session.commit()
        names = {p["name"] for p in _assignments(db_session, w.a_admin, w.a.org.id)["projects"]}
        assert "Old" not in names and "Project A" in names


class TestAssignmentSecurityReview:
    """@architect security review (12.7): ``project_members`` is one row per (project, user) and grants access
    through every organization of the user that reaches the project, so a shared organization's admin must
    not create or delete a row that also grants access through another organization."""

    @pytest.fixture
    def dual(self, db_session, rv):
        """``dual`` belongs to souBIM (owner of project A) and DIMAS; project A shared with DIMAS as viewer."""
        w = rv.world
        rv.dual = _user(db_session, "dual@both.com")
        make_org_member(db_session, rv.dual, "reviewer", org=w.a.org)
        make_org_member(db_session, rv.dual, "member", org=w.b.org)
        db_session.commit()
        _share(db_session, w.a_admin, w.a.project.id, "dimas", "viewer")
        return rv

    def test_shared_admin_cannot_grant_owner_access(self, db_session, dual):
        w = dual.world
        assert status_of(_assign(db_session, w.b_admin, w.b.org.id, dual.dual.id, w.a.project.id)) == 409
        assert access.project_access_level(db_session, dual.dual, w.a.project) == access.NONE
        assert db_session.query(ProjectMember).filter_by(user_id=dual.dual.id).count() == 0

    def test_shared_admin_cannot_assign_themselves_into_owner_access(self, db_session, dual):
        w = dual.world
        make_org_member(db_session, w.b_admin, "reviewer", org=w.a.org)  # DIMAS owner, souBIM reviewer
        db_session.commit()
        assert status_of(_assign(db_session, w.b_admin, w.b.org.id, w.b_admin.id, w.a.project.id)) == 409
        assert access.can_review_items(db_session, w.b_admin, w.a.project) is False

    def test_shared_admin_cannot_revoke_owner_assignment(self, db_session, dual):
        w = dual.world
        run(_assign(db_session, w.a_admin, w.a.org.id, dual.dual.id, w.a.project.id))  # owner side
        assert access.project_access_level(db_session, dual.dual, w.a.project) == access.REVIEW
        assert status_of(_unassign(db_session, w.b_admin, w.b.org.id, dual.dual.id, w.a.project.id)) == 409
        remove_member(db_session, w.b_admin, w.b.org.id, dual.dual.id)  # leaving DIMAS keeps souBIM's grant
        assert access.project_access_level(db_session, dual.dual, w.a.project) == access.REVIEW

    def test_owner_admin_still_manages_the_user(self, db_session, dual):
        w = dual.world
        run(_assign(db_session, w.a_admin, w.a.org.id, dual.dual.id, w.a.project.id))
        run(_unassign(db_session, w.a_admin, w.a.org.id, dual.dual.id, w.a.project.id))
        assert access.project_access_level(db_session, dual.dual, w.a.project) == access.NONE

    def test_shared_admin_manages_users_only_it_grants(self, db_session, dual):
        w = dual.world
        run(_assign(db_session, w.b_admin, w.b.org.id, dual.b_member.id, w.a.project.id))
        assert access.project_access_level(db_session, dual.b_member, w.a.project) == access.READ
        run(_unassign(db_session, w.b_admin, w.b.org.id, dual.b_member.id, w.a.project.id))
        assert access.project_access_level(db_session, dual.b_member, w.a.project) == access.NONE

    def test_project_members_only_from_the_viewers_organizations(self, db_session, dual):
        w = dual.world
        run(_assign(db_session, w.b_admin, w.b.org.id, dual.b_member.id, w.a.project.id))
        as_b = run(projects.get_project_detail(w.a.project.id, req(w.b_admin), db=db_session))
        assert {m["user_id"] for m in as_b["members"]} == {str(dual.b_member.id)}  # no souBIM names / emails
        as_a = run(projects.get_project_detail(w.a.project.id, req(w.a_admin), db=db_session))
        assert str(dual.b_member.id) not in {m["user_id"] for m in as_a["members"]}
        assert str(w.a_member.id) in {m["user_id"] for m in as_a["members"]}
        listed = {p["id"]: p for p in _list_projects(db_session, w.b_admin)["projects"]}
        assert listed[str(w.a.project.id)]["member_count"] == 1
