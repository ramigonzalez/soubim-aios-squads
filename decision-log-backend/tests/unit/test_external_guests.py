"""Story 12.15: external people invited to one project (HTTP level, PostgreSQL).

World: Acme owns projects X and Y. X has an internal meeting (approved item), a shared meeting (one approved
and one pending item) and an internal source-less item. Acme's owner invites guest@client.com to X; the guest
accepts. The isolation suite proves the guest is treated like a shared organization on X (viewer → read,
contributor → write) and reaches nothing else of Acme.
"""

from datetime import datetime, timedelta

import pytest

from app.database.models import (
    OrganizationInvitation,
    OrganizationMember,
    Project,
    ProjectItem,
    ProjectMember,
    ProjectOrganization,
    Source,
)
from tests.org_helpers import make_org
from tests.unit.test_invitations import (  # noqa: F401 — fixtures
    PASSWORD,
    auth,
    client,
    join,
    make_user,
    sent,
)

GUEST = "guest@client.com"


def _item(project, statement, source=None, status="approved"):
    return ProjectItem(
        project_id=project.id, source_id=source.id if source else None, item_type="decision",
        source_type="meeting" if source else "manual_input", statement=statement, decision_statement=statement,
        who="Ana", timestamp="", discipline="architecture", affected_disciplines=["architecture"], why="because",
        consensus={}, review_status=status,
    )


def _meeting(project, title, visibility):
    return Source(project_id=project.id, source_type="meeting", title=title, occurred_at=datetime(2026, 9, 1),
                  ingestion_status="processed", included=True, raw_content="0:01 - A\n  Oi", visibility=visibility)


@pytest.fixture
def world(pg_session):
    db = pg_session
    acme = make_org(db, "Acme", "acme")
    client_org = make_org(db, "Client Co", "client-co")
    owner = make_user(db, "owner@acme.com", "Owner")
    admin = make_user(db, "admin@acme.com", "Admin")
    member = make_user(db, "member@acme.com", "Member")
    join(db, owner, acme, "owner")
    join(db, admin, acme, "admin")
    join(db, member, acme, "member")
    x = Project(name="Project X", owner_organization_id=acme.id)
    y = Project(name="Project Y", owner_organization_id=acme.id)
    db.add_all([x, y])
    db.flush()
    db.add(ProjectMember(project_id=x.id, user_id=member.id, role="member"))
    internal = _meeting(x, "Internal meeting", "internal")
    shared = _meeting(x, "Shared meeting", "shared")
    y_meeting = _meeting(y, "Y meeting", "shared")
    db.add_all([internal, shared, y_meeting])
    db.flush()
    items = dict(
        internal=_item(x, "Internal decision", internal),
        shared=_item(x, "Shared decision", shared),
        pending=_item(x, "Pending decision", shared, status="pending"),
        manual=_item(x, "Manual internal decision"),
        y=_item(y, "Y decision", y_meeting),
    )
    db.add_all(items.values())
    db.commit()
    return dict(db=db, acme=acme, client_org=client_org, owner=owner, admin=admin, member=member, x=x, y=y,
                internal=internal, shared=shared, y_meeting=y_meeting, items=items)


def invite(client, who, project, email=GUEST):
    return client.post(f"/api/projects/{project.id}/externals/invitations", json={"email": email}, headers=auth(who))


def token_of(response) -> str:
    return response.json()["invite_url"].rsplit("/invite/", 1)[1]


def set_access(client, world, guest, access):
    r = client.patch(f"/api/projects/{world['x'].id}/externals/{guest.id}", json={"access": access},
                     headers=auth(world["admin"]))
    assert r.status_code == 200, r.text


@pytest.fixture
def guest(client, world, sent):
    """guest@client.com: has an account and their own organization; accepted the invitation to X."""
    user = make_user(world["db"], GUEST, "Guest")
    join(world["db"], user, world["client_org"], "owner")
    token = token_of(invite(client, world["owner"], world["x"]))
    r = client.post("/api/invitations/accept", json={"token": token}, headers=auth(user))
    assert r.status_code == 200, r.text
    assert r.json()["project_id"] == str(world["x"].id)
    return user


# ─── Invite ───────────────────────────────────────────────────────────────────


class TestInvite:
    def test_owner_invites_and_gets_the_link(self, client, world, sent):
        r = invite(client, world["admin"], world["x"], "New.Guest@Example.com")
        assert r.status_code == 201
        body = r.json()
        assert body["email"] == "new.guest@example.com" and body["status"] == "pending"
        row = world["db"].query(OrganizationInvitation).one()
        assert row.project_id == world["x"].id and row.role == "external"
        assert row.token_hash != token_of(r)  # stored hashed (12.5)
        assert body["invite_url"] in sent[0]["body"]
        listed = client.get(f"/api/projects/{world['x'].id}/externals", headers=auth(world["admin"])).json()
        assert listed["externals"] == [] and [i["email"] for i in listed["invitations"]] == ["new.guest@example.com"]
        assert "invite_url" not in listed["invitations"][0]
        # not in the organization's (team page) invitations
        org_list = client.get(f"/api/organizations/{world['acme'].id}/invitations", headers=auth(world["admin"]))
        assert org_list.json()["invitations"] == []

    def test_only_owning_organization_admins(self, client, world, sent):
        assert invite(client, world["member"], world["x"]).status_code == 403
        outsider = make_user(world["db"], "boss@client.com")
        join(world["db"], outsider, world["client_org"], "owner")
        assert invite(client, outsider, world["x"]).status_code == 403  # no access to the project at all
        # a shared organization's admin cannot invite either (no admin on the project)
        world["db"].add(ProjectOrganization(project_id=world["x"].id, organization_id=world["client_org"].id,
                                            access="contributor"))
        world["db"].commit()
        assert invite(client, outsider, world["x"]).status_code == 403
        assert client.get(f"/api/projects/{world['x'].id}/externals", headers=auth(outsider)).status_code == 403
        assert sent == []

    def test_regular_member_is_already_member(self, client, world, sent):
        r = invite(client, world["admin"], world["x"], "MEMBER@acme.com")
        assert r.status_code == 409 and r.json()["detail"] == "already_member"

    def test_external_on_the_project_is_already_invited(self, client, world, sent, guest):
        r = invite(client, world["admin"], world["x"], GUEST)
        assert r.status_code == 409 and r.json()["detail"] == "already_invited"
        # but can be invited to another project of the organization
        assert invite(client, world["admin"], world["y"], GUEST).status_code == 201

    def test_one_pending_invitation_per_email_and_project(self, client, world, sent):
        first = invite(client, world["admin"], world["x"])
        second = invite(client, world["admin"], world["x"])
        assert client.post("/api/invitations/public/preview", json={"token": token_of(first)}).status_code == 410
        assert client.post("/api/invitations/public/preview", json={"token": token_of(second)}).status_code == 200
        listed = client.get(f"/api/projects/{world['x'].id}/externals", headers=auth(world["admin"])).json()
        assert len(listed["invitations"]) == 1

    def test_revoke(self, client, world, sent):
        r = invite(client, world["admin"], world["x"])
        url = f"/api/projects/{world['x'].id}/externals/invitations/{r.json()['id']}"
        assert client.delete(url, headers=auth(world["member"])).status_code == 403
        wrong = f"/api/projects/{world['y'].id}/externals/invitations/{r.json()['id']}"
        assert client.delete(wrong, headers=auth(world["admin"])).status_code == 404
        assert client.delete(url, headers=auth(world["admin"])).status_code == 204
        assert client.post("/api/invitations/public/preview", json={"token": token_of(r)}).status_code == 410
        listed = client.get(f"/api/projects/{world['x'].id}/externals", headers=auth(world["admin"])).json()
        assert listed["invitations"] == []


# ─── Accept / reject ──────────────────────────────────────────────────────────


class TestAccept:
    def test_preview_names_organization_and_project(self, client, world, sent):
        token = token_of(invite(client, world["owner"], world["x"]))
        preview = client.post("/api/invitations/public/preview", json={"token": token}).json()
        assert preview["organization_name"] == "Acme" and preview["project_name"] == "Project X"
        assert preview["project_id"] == str(world["x"].id) and preview["role"] == "external"
        assert preview["account_exists"] is False

    def test_accept_with_existing_account(self, client, world, guest):
        db = world["db"]
        db.expire_all()
        membership = db.query(OrganizationMember).filter_by(user_id=guest.id, organization_id=world["acme"].id).one()
        assert membership.role == "external"
        assignment = db.query(ProjectMember).filter_by(user_id=guest.id).one()
        assert assignment.project_id == world["x"].id and assignment.access == "viewer"
        # the switcher shows Acme (external) next to their own organization, which works as before
        orgs = client.get("/api/organizations/me", headers=auth(guest)).json()
        assert {(o["slug"], o["role"]) for o in orgs} == {("client-co", "owner"), ("acme", "external")}
        listed = client.get(f"/api/projects/{world['x'].id}/externals", headers=auth(world["admin"])).json()
        assert [(e["email"], e["access"]) for e in listed["externals"]] == [(GUEST, "viewer")]
        assert listed["invitations"] == []

    def test_accept_after_sign_up_creates_no_organization(self, client, world, sent):
        token = token_of(invite(client, world["owner"], world["x"], "new@guest.com"))
        r = client.post("/api/invitations/public/accept", json={"token": token, "name": "New", "password": PASSWORD})
        assert r.status_code == 200
        headers = {"Authorization": "Bearer " + r.json()["access_token"]}
        orgs = client.get("/api/organizations/me", headers=headers).json()
        assert [(o["slug"], o["role"]) for o in orgs] == [("acme", "external")]
        projects = client.get("/api/projects/", headers=headers).json()["projects"]
        assert [p["name"] for p in projects] == ["Project X"]
        assert projects[0]["is_external"] is True and projects[0]["access_level"] == "read"

    def test_wrong_email_logged_in(self, client, world, sent):
        token = token_of(invite(client, world["owner"], world["x"]))
        other = make_user(world["db"], "other@client.com")
        world["db"].commit()
        r = client.post("/api/invitations/accept", json={"token": token}, headers=auth(other))
        assert r.status_code == 403
        assert world["db"].query(OrganizationMember).filter_by(user_id=other.id).count() == 0

    def test_expired(self, client, world, sent):
        token = token_of(invite(client, world["owner"], world["x"]))
        row = world["db"].query(OrganizationInvitation).one()
        row.expires_at = datetime.utcnow() - timedelta(seconds=1)
        world["db"].commit()
        assert client.post("/api/invitations/public/preview", json={"token": token}).status_code == 410
        r = client.post("/api/invitations/public/accept", json={"token": token, "name": "N", "password": PASSWORD})
        assert r.status_code == 410
        assert client.post("/api/invitations/public/reject", json={"token": token}).status_code == 410
        listed = client.get(f"/api/projects/{world['x'].id}/externals", headers=auth(world["admin"])).json()
        assert listed["invitations"] == []

    def test_revoked(self, client, world, sent):
        r = invite(client, world["owner"], world["x"])
        client.delete(f"/api/projects/{world['x'].id}/externals/invitations/{r.json()['id']}", headers=auth(world["owner"]))
        user = make_user(world["db"], GUEST)
        world["db"].commit()
        assert client.post("/api/invitations/accept", json={"token": token_of(r)}, headers=auth(user)).status_code == 410
        assert world["db"].query(ProjectMember).filter_by(user_id=user.id).count() == 0

    def test_reject(self, client, world, sent):
        token = token_of(invite(client, world["owner"], world["x"]))
        r = client.post("/api/invitations/public/reject", json={"token": token})
        assert r.status_code == 200 and r.json()["status"] == "rejected"
        listed = client.get(f"/api/projects/{world['x'].id}/externals", headers=auth(world["admin"])).json()
        assert [i["status"] for i in listed["invitations"]] == ["rejected"]  # "recusado"
        # closed: cannot be accepted or rejected again
        body = {"token": token, "name": "N", "password": PASSWORD}
        assert client.post("/api/invitations/public/accept", json=body).status_code == 410
        assert client.post("/api/invitations/public/reject", json={"token": token}).status_code == 410
        # a new invitation replaces the rejected one
        assert invite(client, world["owner"], world["x"]).status_code == 201
        listed = client.get(f"/api/projects/{world['x'].id}/externals", headers=auth(world["admin"])).json()
        assert [i["status"] for i in listed["invitations"]] == ["pending"]

    def test_organization_invitation_cannot_be_rejected(self, client, world, sent):
        r = client.post("/api/invitations", json={"email": "x@y.com", "role": "member",
                                                  "organization_id": str(world["acme"].id)}, headers=auth(world["owner"]))
        assert client.post("/api/invitations/public/reject", json={"token": token_of(r)}).status_code == 404

    def test_member_who_joined_meanwhile_is_already_member(self, client, world, sent):
        token = token_of(invite(client, world["owner"], world["x"]))
        user = make_user(world["db"], GUEST)
        join(world["db"], user, world["acme"], "member")
        r = client.post("/api/invitations/accept", json={"token": token}, headers=auth(user))
        assert r.status_code == 409 and r.json()["detail"] == "already_member"
        assert world["db"].query(OrganizationInvitation).one().accepted_at is None


# ─── Isolation ────────────────────────────────────────────────────────────────


def _statements(client, user, project):
    r = client.get(f"/api/projects/{project.id}/items", headers=auth(user))
    assert r.status_code == 200, r.text
    return sorted(i["statement"] for i in r.json()["items"])


@pytest.mark.parametrize("level", ["viewer", "contributor"])
class TestIsolation:
    def test_only_project_x(self, client, world, guest, level):
        set_access(client, world, guest, level)
        h = auth(guest)
        names = sorted(p["name"] for p in client.get("/api/projects/", headers=h).json()["projects"])
        assert names == ["Project X"]
        acme = sorted(p["name"] for p in client.get("/api/projects/", headers=auth(guest, world["acme"])).json()["projects"])
        assert acme == ["Project X"]
        # project Y: detail, items, meetings, stages, participants
        y = world["y"]
        assert client.get(f"/api/projects/{y.id}", headers=h).status_code in (403, 404)
        assert client.get(f"/api/projects/{y.id}/items", headers=h).status_code == 403
        assert client.get(f"/api/projects/{y.id}/stages", headers=h).status_code == 403
        assert client.get(f"/api/projects/{y.id}/participants", headers=h).status_code == 403
        assert client.get(f"/api/sources/{world['y_meeting'].id}/meeting", headers=h).status_code == 404
        assert client.get(f"/api/decisions/{world['items']['y'].id}", headers=h).status_code == 404

    def test_no_organization_settings(self, client, world, guest, level):
        set_access(client, world, guest, level)
        h, org = auth(guest), world["acme"].id
        for url in (f"/api/organizations/{org}/members", f"/api/organizations/{org}/invitations",
                    f"/api/organizations/{org}/project-assignments"):
            assert client.get(url, headers=h).status_code == 403
        r = client.post("/api/invitations", json={"email": "a@b.com", "role": "member", "organization_id": str(org)},
                        headers=h)
        assert r.status_code == 403
        # project X settings: edit, sharing, Drive, share links, Fathom rules, externals
        x = world["x"].id
        assert client.patch(f"/api/projects/{x}", json={"name": "Hacked"}, headers=h).status_code == 403
        assert client.get(f"/api/projects/{x}/organizations", headers=h).status_code == 403
        assert client.get(f"/api/projects/{x}/drive-folder", headers=h).status_code == 403
        assert client.get(f"/api/projects/{x}/milestones/share", headers=h).status_code == 403
        assert client.get(f"/api/projects/{x}/fathom-rules", headers=h).status_code == 403
        assert client.get(f"/api/projects/{x}/externals", headers=h).status_code == 403
        assert invite(client, guest, world["x"], "friend@client.com").status_code == 403
        assert client.delete(f"/api/projects/{x}", headers=h).status_code == 403

    def test_only_shared_approved_content_of_x(self, client, world, guest, level):
        set_access(client, world, guest, level)
        h, x, items = auth(guest), world["x"], world["items"]
        assert _statements(client, guest, x) == ["Shared decision"]
        r = client.get(f"/api/projects/{x.id}/items", headers=h, params={"review_status": "pending,rejected"})
        assert r.json()["items"] == []
        assert client.get(f"/api/projects/{x.id}/items/{items['shared'].id}", headers=h).status_code == 200
        for key in ("internal", "pending", "manual"):
            assert client.get(f"/api/projects/{x.id}/items/{items[key].id}", headers=h).status_code == 404
            assert client.get(f"/api/decisions/{items[key].id}", headers=h).status_code == 404
        assert client.get(f"/api/sources/{world['shared'].id}/meeting", headers=h).status_code == 200
        assert client.get(f"/api/sources/{world['internal'].id}/meeting", headers=h).status_code == 404
        sources = client.get("/api/ingestion", headers=h, params={"ingestion_status": "processed"}).json()
        titles = [s.get("title") for s in sources["sources"]]
        assert "Internal meeting" not in titles and "Y meeting" not in titles
        detail = client.get(f"/api/projects/{x.id}", headers=h).json()
        assert detail["stats"]["total_decisions"] == 1
        assert detail["members"] == []  # never Acme's member list
        assert detail["is_external"] is True and detail["can_manage"] is False and detail["can_review"] is False

    def test_no_review_or_visibility(self, client, world, guest, level):
        set_access(client, world, guest, level)
        h, x, items = auth(guest), world["x"], world["items"]
        r = client.post(f"/api/projects/{x.id}/items/{items['shared'].id}/review", json={"status": "rejected"}, headers=h)
        assert r.status_code == 403
        r = client.patch(f"/api/sources/{world['shared'].id}/visibility", json={"visibility": "internal"}, headers=h)
        assert r.status_code == 403
        r = client.patch(f"/api/projects/{x.id}/items/{items['shared'].id}", json={"is_milestone": True}, headers=h)
        assert r.status_code == 403


class TestViewerAndContributor:
    def test_viewer_cannot_write(self, client, world, guest):
        h, x = auth(guest), world["x"]
        body = {"statement": "Guest item", "item_type": "decision", "who": "Guest", "affected_disciplines": ["architecture"]}
        assert client.post(f"/api/projects/{x.id}/items", json=body, headers=h).status_code == 403
        r = client.patch(f"/api/projects/{x.id}/items/{world['items']['shared'].id}", json={"is_done": True}, headers=h)
        assert r.status_code == 403
        assert client.post(f"/api/projects/{x.id}/participants", json={"name": "P", "discipline": "architecture"},
                           headers=h).status_code == 403

    def test_contributor_adds_content_owned_by_the_organization(self, client, world, guest):
        set_access(client, world, guest, "contributor")
        h, x = auth(guest), world["x"]
        body = {"statement": "Guest item", "item_type": "decision", "who": "Guest", "affected_disciplines": ["architecture"]}
        r = client.post(f"/api/projects/{x.id}/items", json=body, headers=h)
        assert r.status_code == 201, r.text
        assert r.json()["created_by_external"] is True and r.json()["created_by_name"] == "Guest"
        world["db"].expire_all()
        item = world["db"].query(ProjectItem).filter(ProjectItem.statement == "Guest item").one()
        assert item.owner_organization_id == world["acme"].id and item.created_by == guest.id
        # Acme sees it with the "Externo" flag
        listed = client.get(f"/api/projects/{x.id}/items", headers=auth(world["member"])).json()["items"]
        mine = next(i for i in listed if i["statement"] == "Guest item")
        assert mine["created_by_external"] is True
        assert next(i for i in listed if i["statement"] == "Shared decision")["created_by_external"] is False
        # edits like a shared contributor
        r = client.patch(f"/api/projects/{x.id}/items/{world['items']['shared'].id}", json={"is_done": True}, headers=h)
        assert r.status_code == 200
        # cannot create a meeting shared from the start (only internal to Acme, like a shared org's member)
        assert client.get(f"/api/projects/{x.id}/items", headers=h).json()["can_review"] is False


class TestPeopleAndRemoval:
    def test_badge_in_team_page_and_people_list(self, client, world, guest):
        members = client.get(f"/api/organizations/{world['acme'].id}/members", headers=auth(world["admin"])).json()
        assert {m["email"]: m["role"] for m in members["members"]}[GUEST] == "external"
        people = client.get(f"/api/projects/{world['x'].id}", headers=auth(world["admin"])).json()["members"]
        assert {p["email"]: p["is_external"] for p in people} == {"member@acme.com": False, GUEST: True}

    def test_team_page_cannot_convert_or_reassign(self, client, world, guest):
        base = f"/api/organizations/{world['acme'].id}/members/{guest.id}"
        assert client.patch(base, json={"role": "member"}, headers=auth(world["owner"])).status_code == 409
        assert client.put(f"{base}/projects/{world['y'].id}", headers=auth(world["owner"])).status_code == 409

    def test_change_access_needs_admin(self, client, world, guest):
        url = f"/api/projects/{world['x'].id}/externals/{guest.id}"
        assert client.patch(url, json={"access": "contributor"}, headers=auth(world["member"])).status_code == 403
        assert client.patch(url, json={"access": "contributor"}, headers=auth(guest)).status_code == 403
        assert client.patch(url, json={"access": "admin"}, headers=auth(world["owner"])).status_code == 422
        other = f"/api/projects/{world['x'].id}/externals/{world['member'].id}"
        assert client.patch(other, json={"access": "viewer"}, headers=auth(world["owner"])).status_code == 404

    def test_remove_from_last_project_removes_membership_keeps_content(self, client, world, guest):
        db = world["db"]
        set_access(client, world, guest, "contributor")
        body = {"statement": "Guest item", "item_type": "decision", "who": "Guest", "affected_disciplines": ["architecture"]}
        assert client.post(f"/api/projects/{world['x'].id}/items", json=body, headers=auth(guest)).status_code == 201
        # also on Y
        token = token_of(invite(client, world["owner"], world["y"], GUEST))
        assert client.post("/api/invitations/accept", json={"token": token}, headers=auth(guest)).status_code == 200

        assert client.delete(f"/api/projects/{world['x'].id}/externals/{guest.id}", headers=auth(world["admin"])).status_code == 204
        db.expire_all()
        assert db.query(OrganizationMember).filter_by(user_id=guest.id, organization_id=world["acme"].id).one().role == "external"
        assert client.get(f"/api/projects/{world['x'].id}/items", headers=auth(guest)).status_code == 403

        assert client.delete(f"/api/projects/{world['y'].id}/externals/{guest.id}", headers=auth(world["admin"])).status_code == 204
        db.expire_all()
        assert db.query(OrganizationMember).filter_by(user_id=guest.id, organization_id=world["acme"].id).count() == 0
        assert db.query(OrganizationMember).filter_by(user_id=guest.id).count() == 1  # their own organization
        assert db.query(ProjectItem).filter(ProjectItem.statement == "Guest item").count() == 1
        assert client.get("/api/projects/", headers=auth(guest)).json()["projects"] == []

    def test_removal_keeps_a_shared_organization_assignment(self, client, world, guest):
        """The single project_members row is also the guest's assignment for their own organization, made by its
        admin (X shared with it): removing the external access only clears ``access``; the shared organization's
        assignment stays (it was granted by that organization, not by the invitation)."""
        db = world["db"]
        boss = make_user(db, "boss@client.com", "Boss")
        join(db, boss, world["client_org"], "owner")
        db.query(OrganizationMember).filter_by(user_id=guest.id, organization_id=world["client_org"].id).update(
            {OrganizationMember.role: "member"})
        db.add(ProjectOrganization(project_id=world["x"].id, organization_id=world["client_org"].id, access="viewer"))
        db.commit()
        assign = f"/api/organizations/{world['client_org'].id}/members/{guest.id}/projects/{world['x'].id}"
        assert client.put(assign, headers=auth(boss)).status_code == 200
        url = f"/api/projects/{world['x'].id}/externals/{guest.id}"
        assert client.delete(url, headers=auth(world["admin"])).status_code == 204
        db.expire_all()
        row = db.query(ProjectMember).filter_by(user_id=guest.id, project_id=world["x"].id).one()
        assert row.access is None and row.role == "member"
        assert db.query(OrganizationMember).filter_by(user_id=guest.id, organization_id=world["acme"].id).count() == 0
        listed = client.get(f"/api/projects/{world['x'].id}/externals", headers=auth(world["admin"])).json()
        assert listed["externals"] == []
        # still reaches X, now only through the shared organization
        assert _statements(client, guest, world["x"]) == ["Shared decision"]

    def test_blocked_organization_grants_nothing(self, client, world, guest):
        world["acme"].status = "blocked"
        world["db"].commit()
        assert client.get(f"/api/projects/{world['x'].id}/items", headers=auth(guest)).status_code == 403



# ─── Security review (Story 12.15) ────────────────────────────────────────────


@pytest.fixture
def shared_org(client, world, sent):
    """Client Co (S): its owner and a plain member U (u@client.com), U not assigned anywhere; S has an internal
    meeting on X (only visible to people reaching X through S)."""
    db = world["db"]
    boss = make_user(db, "boss@client.com", "Boss")
    u = make_user(db, "u@client.com", "Uma")
    join(db, boss, world["client_org"], "owner")
    join(db, u, world["client_org"], "member")
    s_meeting = _meeting(world["x"], "S internal meeting", "internal")
    s_meeting.owner_organization_id = world["client_org"].id
    db.add(s_meeting)
    db.commit()
    return dict(boss=boss, u=u, s_meeting=s_meeting)


def _share_with_s(world, access="contributor"):
    world["db"].add(ProjectOrganization(project_id=world["x"].id, organization_id=world["client_org"].id, access=access))
    world["db"].commit()


def _invite_and_accept(client, world, user):
    token = token_of(invite(client, world["owner"], world["x"], user.email))
    r = client.post("/api/invitations/accept", json={"token": token}, headers=auth(user))
    assert r.status_code == 200, r.text


def _caps(client, world, user):
    r = client.get(f"/api/projects/{world['x'].id}", headers=auth(user))
    return r.json() if r.status_code == 200 else r.status_code


def _s_assignment(client, world, s, method):
    url = f"/api/organizations/{world['client_org'].id}/members/{s['u'].id}/projects/{world['x'].id}"
    return getattr(client, method)(url, headers=auth(s["boss"])).status_code


def _assert_external_viewer_only(client, world, s):
    caps = _caps(client, world, s["u"])
    assert caps["access_level"] == "read" and caps["is_external"] is True
    assert client.get(f"/api/sources/{s['s_meeting'].id}/meeting", headers=auth(s["u"])).status_code == 404
    body = {"statement": "U item", "item_type": "decision", "who": "U", "affected_disciplines": ["architecture"]}
    assert client.post(f"/api/projects/{world['x'].id}/items", json=body, headers=auth(s["u"])).status_code == 403


class TestExternalRowIsNotASharedAssignment:
    """An external invitation's ``project_members`` row must never count as "assigned member of a shared
    organization" (it would give the shared level and the shared organization's internal meetings)."""

    @pytest.mark.parametrize("order", ["invite_then_share", "share_then_invite"])
    def test_external_grant_stays_external(self, client, world, shared_org, order):
        s = shared_org
        if order == "invite_then_share":
            _invite_and_accept(client, world, s["u"])
            _share_with_s(world)
        else:
            _share_with_s(world)
            _invite_and_accept(client, world, s["u"])
        _assert_external_viewer_only(client, world, s)
        # S's admin can unassign (nothing to unassign: no 409) and it does not touch the external grant
        assert _s_assignment(client, world, s, "delete") == 204
        _assert_external_viewer_only(client, world, s)
        # S's team page does not show the external row as an assignment
        listed = client.get(f"/api/organizations/{world['client_org'].id}/project-assignments", headers=auth(s["boss"]))
        assert listed.json()["assignments"] == []
        # A removes the external access: nothing is left
        url = f"/api/projects/{world['x'].id}/externals/{s['u'].id}"
        assert client.delete(url, headers=auth(world["admin"])).status_code == 204
        assert _caps(client, world, s["u"]) == 403
        world["db"].expire_all()
        assert world["db"].query(ProjectMember).filter_by(user_id=s["u"].id).count() == 0

    def test_shared_admin_assigns_over_external_row_then_unassigns(self, client, world, shared_org):
        s = shared_org
        _invite_and_accept(client, world, s["u"])
        _share_with_s(world)
        assert _s_assignment(client, world, s, "put") == 200
        caps = _caps(client, world, s["u"])
        assert caps["access_level"] == "write" and caps["is_external"] is False
        assert client.get(f"/api/sources/{s['s_meeting'].id}/meeting", headers=auth(s["u"])).status_code == 200
        # S withdraws its assignment: back to the external grant only
        assert _s_assignment(client, world, s, "delete") == 204
        _assert_external_viewer_only(client, world, s)
        world["db"].expire_all()
        row = world["db"].query(ProjectMember).filter_by(user_id=s["u"].id).one()
        assert row.role == "external" and row.access == "viewer"

    def test_removing_from_shared_org_keeps_the_external_grant(self, client, world, shared_org):
        s = shared_org
        _invite_and_accept(client, world, s["u"])
        _share_with_s(world)
        assert _s_assignment(client, world, s, "put") == 200
        url = f"/api/organizations/{world['client_org'].id}/members/{s['u'].id}"
        assert client.delete(url, headers=auth(s["boss"])).status_code == 204
        caps = _caps(client, world, s["u"])
        assert caps["access_level"] == "read" and caps["is_external"] is True


class TestIngestionForGuests:
    def test_only_meetings_past_review_without_reviewer_fields(self, client, world, guest):
        db = world["db"]
        x = world["x"]
        pending = _meeting(x, "Pending shared", "shared")
        pending.ingestion_status, pending.ai_summary = "pending", "secret summary"
        rejected = _meeting(x, "Rejected shared", "shared")
        rejected.ingestion_status, rejected.rejected_by = "rejected", world["admin"].id
        rejected.rejected_at, rejected.extraction_error = datetime.utcnow(), "boom"
        failed = _meeting(x, "Failed shared", "shared")
        failed.ingestion_status, failed.extraction_error = "failed", "stack trace"
        db.add_all([pending, rejected, failed])
        world["shared"].approved_by, world["shared"].approved_at = world["admin"].id, datetime.utcnow()
        db.commit()
        h = auth(guest)

        assert client.get("/api/ingestion", headers=h).json()["sources"] == []
        assert client.get("/api/ingestion/count", headers=h).json()["pending"] == 0
        history = client.get("/api/ingestion/history", headers=h).json()["sources"]
        assert [s["title"] for s in history] == ["Shared meeting"]
        assert history[0]["approved_by_name"] is None and history[0]["extraction_error"] is None
        listed = client.get("/api/ingestion", headers=h, params={"ingestion_status": "rejected"}).json()["sources"]
        assert listed == []

        # Acme's members are unaffected
        member = auth(world["member"])
        titles = {s["title"] for s in client.get("/api/ingestion/history", headers=member).json()["sources"]}
        assert {"Shared meeting", "Rejected shared", "Failed shared"} <= titles
        assert client.get("/api/ingestion/count", headers=member).json()["pending"] == 1


class TestAcceptRaces:
    def test_google_accept_by_a_member_is_already_member_and_binds_nothing(self, client, world, sent):
        from app.services import google_login

        invite(client, world["owner"], world["x"], "outsider@acme.com")
        user = make_user(world["db"], "outsider@acme.com")
        join(world["db"], user, world["acme"], "member")  # became a member after the invitation
        invitation = world["db"].query(OrganizationInvitation).one()
        with pytest.raises(google_login.GoogleLoginError) as exc:
            google_login._accept_invitation(world["db"], invitation, "outsider@acme.com", "O", "google-sub-1")
        assert exc.value.reason == "already_member" and exc.value.status == 409
        world["db"].expire_all()
        assert world["db"].get(type(user), user.id).google_sub is None
        assert world["db"].query(OrganizationInvitation).one().accepted_at is None

    def test_concurrent_first_accept_is_409_not_500(self, client, world, sent, monkeypatch):
        from fastapi import HTTPException
        from sqlalchemy.orm import sessionmaker

        from app.services import invitations as inv

        db = world["db"]
        invite(client, world["owner"], world["x"])
        user = make_user(db, GUEST)
        db.commit()
        invitation = db.query(OrganizationInvitation).one()
        other = sessionmaker(bind=db.get_bind())
        real_commit = db.commit

        def commit_after_race():
            monkeypatch.setattr(db, "commit", real_commit)
            s = other()
            try:  # another accept (e.g. of a project Y invitation) created the external membership first
                s.add(OrganizationMember(user_id=user.id, organization_id=world["acme"].id, role="external"))
                s.commit()
            finally:
                s.close()
            real_commit()

        monkeypatch.setattr(db, "commit", commit_after_race)
        with pytest.raises(HTTPException) as exc:
            inv.accept_for_user(db, invitation, user)
        assert exc.value.status_code == 409
        db.expire_all()
        assert db.query(OrganizationInvitation).one().accepted_at is None


# ─── Own contributions (Rami, 2026-10-15) ─────────────────────────────────────


ITEM = {"statement": "Guest item", "item_type": "decision", "who": "Guest", "affected_disciplines": ["architecture"]}


@pytest.fixture
def others(client, world, guest, sent):
    """The guest is a contributor; a second guest (viewer) on X; X shared with Partner (not the guest's own
    organization) as viewer, whose owner reads X."""
    db = world["db"]
    set_access(client, world, guest, "contributor")
    second = make_user(db, "second@other.com", "Second")
    db.commit()
    _invite_and_accept(client, world, second)
    partner = make_org(db, "Partner", "partner")
    boss = make_user(db, "boss@partner.com", "Boss")
    join(db, boss, partner, "owner")
    db.add(ProjectOrganization(project_id=world["x"].id, organization_id=partner.id, access="viewer"))
    db.commit()
    return dict(second=second, boss=boss)


def _item_status(client, user, project, item_id):
    return client.get(f"/api/projects/{project.id}/items/{item_id}", headers=auth(user)).status_code


class TestOwnContributions:
    def test_own_item_is_pending_visible_to_author_only_until_approved(self, client, world, guest, others):
        x = world["x"]
        r = client.post(f"/api/projects/{x.id}/items", json=ITEM, headers=auth(guest))
        assert r.status_code == 201 and r.json()["review_status"] == "pending"
        item_id = r.json()["id"]

        # the author: list (marked pending) + detail
        listed = client.get(f"/api/projects/{x.id}/items", headers=auth(guest)).json()["items"]
        assert {i["statement"]: i["review_status"] for i in listed} == {"Shared decision": "approved", "Guest item": "pending"}
        assert _item_status(client, guest, x, item_id) == 200
        # another guest and the shared organization: not visible
        for other in (others["second"], others["boss"]):
            assert "Guest item" not in _statements(client, other, x)
            assert _item_status(client, other, x, item_id) == 404
        # Acme reviews it (pending queue) and approves
        assert "Guest item" in _statements(client, world["member"], x)
        r = client.post(f"/api/projects/{x.id}/items/{item_id}/review", json={"status": "approved"},
                        headers=auth(world["admin"]))
        assert r.status_code == 200
        # approved: normal rules — a manual item is internal to Acme, so still not for other guests / shared orgs
        assert _item_status(client, guest, x, item_id) == 200
        for other in (others["second"], others["boss"]):
            assert _item_status(client, other, x, item_id) == 404
        assert _item_status(client, world["member"], x, item_id) == 200

    def test_own_uploaded_meeting_visible_to_author_only(self, client, world, guest, others):
        db, x = world["db"], world["x"]
        mine = _meeting(x, "Guest upload", "internal")
        mine.created_by = guest.id
        mine.ingestion_status = "pending"
        db.add(mine)
        db.flush()
        approved = _item(x, "From guest upload", mine)
        extracted_pending = _item(x, "Pending from guest upload", mine, status="pending")
        db.add_all([approved, extracted_pending])
        db.commit()
        assert client.get(f"/api/sources/{mine.id}/meeting", headers=auth(guest)).status_code == 200
        statements = _statements(client, guest, x)
        assert "From guest upload" in statements
        assert "Pending from guest upload" not in statements  # extracted items wait for Acme's review
        for other in (others["second"], others["boss"]):
            assert client.get(f"/api/sources/{mine.id}/meeting", headers=auth(other)).status_code == 404
            assert "From guest upload" not in _statements(client, other, x)

    def test_nothing_else_is_revealed(self, client, world, guest, others):
        # items of an internal meeting the guest did not create stay hidden, and so does another guest's item
        x = world["x"]
        assert _item_status(client, guest, x, world["items"]["internal"].id) == 404
        assert client.get(f"/api/sources/{world['internal'].id}/meeting", headers=auth(guest)).status_code == 404
        set_access(client, world, others["second"], "contributor")
        r = client.post(f"/api/projects/{x.id}/items", json={**ITEM, "statement": "Second item"},
                        headers=auth(others["second"]))
        assert r.status_code == 201
        assert _item_status(client, guest, x, r.json()["id"]) == 404
        assert "Second item" not in _statements(client, guest, x)

    def test_removal_cuts_own_content(self, client, world, guest, others):
        x = world["x"]
        item_id = client.post(f"/api/projects/{x.id}/items", json=ITEM, headers=auth(guest)).json()["id"]
        assert client.delete(f"/api/projects/{x.id}/externals/{guest.id}", headers=auth(world["admin"])).status_code == 204
        assert _item_status(client, guest, x, item_id) == 403
        assert client.get(f"/api/decisions/{item_id}", headers=auth(guest)).status_code == 404
        assert client.get("/api/ingestion/history", headers=auth(guest)).json()["sources"] == []
