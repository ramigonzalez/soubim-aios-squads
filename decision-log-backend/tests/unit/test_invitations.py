"""Story 12.5: invitations, members management and active organization (HTTP level).

Needs PostgreSQL (``pg_session``): the app's own session (middleware + routes) and the test
session must see the same data.
"""

from datetime import datetime, timedelta

import pytest
from fastapi.testclient import TestClient

from app.database.models import (
    OrganizationInvitation,
    OrganizationMember,
    Project,
    ProjectMember,
    ProjectOrganization,
    User,
)
from app.services import email_sender, invitations
from app.utils.security import create_access_token, hash_password
from tests.org_helpers import make_org

PASSWORD = "password123"


@pytest.fixture
def client(pg_session):
    from app.main import app

    return TestClient(app)  # no context manager: no startup (DB init, scheduler)


@pytest.fixture
def sent(monkeypatch):
    """Capture emails instead of logging them."""
    outbox = []

    class Capture:
        def send(self, to, subject, body):
            outbox.append({"to": to, "subject": subject, "body": body})
            return True

    monkeypatch.setattr(invitations, "get_email_sender", lambda: Capture())
    return outbox


def make_user(db, email, name="Someone"):
    user = User(email=email, password_hash=hash_password(PASSWORD), name=name, role="client")
    db.add(user)
    db.flush()
    return user


def join(db, user, org, role):
    db.add(OrganizationMember(user_id=user.id, organization_id=org.id, role=role))
    db.commit()


def auth(user, org=None):
    headers = {"Authorization": "Bearer " + create_access_token(str(user.id), user.email, user.role)}
    if org is not None:
        headers["X-Organization-Id"] = str(org.id)
    return headers


@pytest.fixture
def world(pg_session):
    db = pg_session
    acme = make_org(db, "Acme", "acme")
    other = make_org(db, "Other", "other")
    owner = make_user(db, "owner@acme.com", "Owner")
    admin = make_user(db, "admin@acme.com", "Admin")
    member = make_user(db, "member@acme.com", "Member")
    outsider = make_user(db, "outsider@other.com", "Outsider")
    join(db, owner, acme, "owner")
    join(db, admin, acme, "admin")
    join(db, member, acme, "member")
    join(db, outsider, other, "owner")
    return dict(db=db, acme=acme, other=other, owner=owner, admin=admin, member=member, outsider=outsider)


def invite(client, who, org, email, role="member"):
    return client.post(
        "/api/invitations",
        json={"email": email, "role": role, "organization_id": str(org.id)},
        headers=auth(who),
    )


def token_of(response) -> str:
    return response.json()["invite_url"].rsplit("/invite/", 1)[1]


class TestCreate:
    def test_admin_invites_and_link_is_sent(self, client, world, sent):
        r = invite(client, world["admin"], world["acme"], "New.Person@Example.com", "member")
        assert r.status_code == 201
        body = r.json()
        assert body["email"] == "new.person@example.com"
        assert body["status"] == "pending"
        assert body["invite_url"].endswith(token_of(r))
        assert sent[0]["to"] == "new.person@example.com"
        assert body["invite_url"] in sent[0]["body"]

    def test_token_is_stored_hashed(self, client, world, sent):
        r = invite(client, world["admin"], world["acme"], "x@example.com")
        raw = token_of(r)
        row = world["db"].query(OrganizationInvitation).one()
        assert raw not in row.token_hash
        assert row.token_hash == invitations.hash_token(raw)

    def test_member_cannot_invite(self, client, world, sent):
        assert invite(client, world["member"], world["acme"], "x@example.com").status_code == 403
        assert sent == []

    def test_non_member_cannot_invite(self, client, world, sent):
        assert invite(client, world["outsider"], world["acme"], "x@example.com").status_code == 404

    def test_admin_cannot_grant_owner(self, client, world, sent):
        assert invite(client, world["admin"], world["acme"], "x@example.com", "owner").status_code == 403
        assert invite(client, world["owner"], world["acme"], "x@example.com", "owner").status_code == 201

    def test_existing_member_conflict(self, client, world, sent):
        assert invite(client, world["admin"], world["acme"], "MEMBER@acme.com").status_code == 409

    def test_new_invitation_revokes_previous(self, client, world, sent):
        first = invite(client, world["admin"], world["acme"], "x@example.com")
        invite(client, world["admin"], world["acme"], "x@example.com")
        assert client.post("/api/invitations/public/preview", json={"token": token_of(first)}).status_code == 410

    def test_list_pending_and_revoke(self, client, world, sent):
        r = invite(client, world["admin"], world["acme"], "x@example.com")
        listed = client.get(f"/api/organizations/{world['acme'].id}/invitations", headers=auth(world["admin"]))
        assert [i["email"] for i in listed.json()["invitations"]] == ["x@example.com"]
        assert "invite_url" not in listed.json()["invitations"][0]

        assert client.delete(f"/api/invitations/{r.json()['id']}", headers=auth(world["member"])).status_code == 403
        assert client.delete(f"/api/invitations/{r.json()['id']}", headers=auth(world["admin"])).status_code == 204
        listed = client.get(f"/api/organizations/{world['acme'].id}/invitations", headers=auth(world["admin"]))
        assert listed.json()["invitations"] == []
        assert client.post("/api/invitations/public/preview", json={"token": token_of(r)}).status_code == 410

    def test_new_company_needs_platform_admin(self, client, world, sent):
        r = client.post(
            "/api/invitations",
            json={"email": "boss@newco.com", "organization_name": "NewCo"},
            headers=auth(world["admin"]),
        )
        assert r.status_code == 403


class TestAcceptNewUser:
    def test_creates_account_and_membership(self, client, world, sent):
        token = token_of(invite(client, world["admin"], world["acme"], "new@example.com", "admin"))
        preview = client.post("/api/invitations/public/preview", json={"token": token}).json()
        assert preview == {
            "organization_name": "Acme", "email": "new@example.com", "role": "admin", "account_exists": False,
        }

        r = client.post(
            "/api/invitations/public/accept", json={"token": token, "name": "New Person", "password": PASSWORD}
        )
        assert r.status_code == 200
        assert r.json()["user"]["email"] == "new@example.com"
        # the returned token works
        headers = {"Authorization": "Bearer " + r.json()["access_token"]}
        orgs = client.get("/api/organizations/me", headers=headers).json()
        assert [(o["slug"], o["role"]) for o in orgs] == [("acme", "admin")]
        # and the login works with the chosen password
        assert client.post("/api/auth/login", json={"email": "new@example.com", "password": PASSWORD}).status_code == 200

    def test_single_use(self, client, world, sent):
        token = token_of(invite(client, world["admin"], world["acme"], "new@example.com"))
        body = {"token": token, "name": "New", "password": PASSWORD}
        assert client.post("/api/invitations/public/accept", json=body).status_code == 200
        assert client.post("/api/invitations/public/accept", json=body).status_code == 410
        assert client.post("/api/invitations/public/preview", json={"token": token}).status_code == 410

    def test_expired(self, client, world, sent):
        token = token_of(invite(client, world["admin"], world["acme"], "new@example.com"))
        row = world["db"].query(OrganizationInvitation).one()
        row.expires_at = datetime.utcnow() - timedelta(seconds=1)
        world["db"].commit()
        assert client.post("/api/invitations/public/preview", json={"token": token}).status_code == 410
        r = client.post("/api/invitations/public/accept", json={"token": token, "name": "N", "password": PASSWORD})
        assert r.status_code == 410
        assert world["db"].query(User).filter(User.email == "new@example.com").first() is None
        listed = client.get(f"/api/organizations/{world['acme'].id}/invitations", headers=auth(world["admin"]))
        assert listed.json()["invitations"] == []

    def test_unknown_token(self, client, world):
        assert client.post("/api/invitations/public/preview", json={"token": "nope"}).status_code == 404

    def test_existing_account_must_log_in(self, client, world, sent):
        # the invited email already has an account: the public endpoint must not touch it
        token = token_of(invite(client, world["admin"], world["acme"], "outsider@other.com"))
        assert client.post("/api/invitations/public/preview", json={"token": token}).json()["account_exists"] is True
        r = client.post("/api/invitations/public/accept", json={"token": token, "name": "X", "password": "hijack-pass"})
        assert r.status_code == 409
        login = client.post("/api/auth/login", json={"email": "outsider@other.com", "password": "hijack-pass"})
        assert login.status_code == 401

    def test_short_password_rejected(self, client, world, sent):
        token = token_of(invite(client, world["admin"], world["acme"], "new@example.com"))
        r = client.post("/api/invitations/public/accept", json={"token": token, "name": "N", "password": "short"})
        assert r.status_code == 422


class TestAcceptExistingUser:
    def test_joins_and_is_single_use(self, client, world, sent):
        token = token_of(invite(client, world["admin"], world["acme"], "outsider@other.com", "member"))
        r = client.post("/api/invitations/accept", json={"token": token}, headers=auth(world["outsider"]))
        assert r.status_code == 200
        assert r.json()["slug"] == "acme"
        orgs = client.get("/api/organizations/me", headers=auth(world["outsider"])).json()
        assert {(o["slug"], o["role"]) for o in orgs} == {("other", "owner"), ("acme", "member")}
        again = client.post("/api/invitations/accept", json={"token": token}, headers=auth(world["outsider"]))
        assert again.status_code == 410

    def test_wrong_email(self, client, world, sent):
        token = token_of(invite(client, world["admin"], world["acme"], "outsider@other.com"))
        r = client.post("/api/invitations/accept", json={"token": token}, headers=auth(world["member"]))
        assert r.status_code == 403
        assert world["db"].query(OrganizationInvitation).one().accepted_at is None

    def test_requires_login(self, client, world, sent):
        token = token_of(invite(client, world["admin"], world["acme"], "outsider@other.com"))
        assert client.post("/api/invitations/accept", json={"token": token}).status_code == 401


class TestNewCompany:
    def test_platform_admin_invites_company_owner(self, client, world, sent):
        platform = make_org(world["db"], "souBIM", "soubim")
        boss = make_user(world["db"], "boss@soubim.com", "Boss")
        join(world["db"], boss, platform, "admin")
        r = client.post(
            "/api/invitations",
            json={"email": "ceo@newco.com", "role": "member", "organization_name": "New Co"},
            headers=auth(boss),
        )
        assert r.status_code == 201
        assert r.json()["role"] == "owner"  # always: the first person owns the company
        assert r.json()["organization_id"] is None
        token = token_of(r)
        assert client.post("/api/invitations/public/preview", json={"token": token}).json()["organization_name"] == "New Co"

        done = client.post("/api/invitations/public/accept", json={"token": token, "name": "CEO", "password": PASSWORD})
        assert done.status_code == 200
        headers = {"Authorization": "Bearer " + done.json()["access_token"]}
        orgs = client.get("/api/organizations/me", headers=headers).json()
        assert [(o["name"], o["slug"], o["role"]) for o in orgs] == [("New Co", "new-co", "owner")]


class TestMembers:
    def url(self, world, user=None):
        base = f"/api/organizations/{world['acme'].id}/members"
        return base + (f"/{user.id}" if user else "")

    def test_list_requires_admin(self, client, world):
        assert client.get(self.url(world), headers=auth(world["member"])).status_code == 403
        assert client.get(self.url(world), headers=auth(world["outsider"])).status_code == 404
        r = client.get(self.url(world), headers=auth(world["admin"]))
        assert {m["email"]: m["role"] for m in r.json()["members"]} == {
            "owner@acme.com": "owner", "admin@acme.com": "admin", "member@acme.com": "member",
        }

    def test_change_role(self, client, world):
        r = client.patch(self.url(world, world["member"]), json={"role": "admin"}, headers=auth(world["admin"]))
        assert r.status_code == 200 and r.json()["role"] == "admin"

    def test_admin_cannot_touch_owner_or_grant_owner(self, client, world):
        assert client.patch(self.url(world, world["owner"]), json={"role": "member"}, headers=auth(world["admin"])).status_code == 403
        assert client.patch(self.url(world, world["member"]), json={"role": "owner"}, headers=auth(world["admin"])).status_code == 403
        assert client.delete(self.url(world, world["owner"]), headers=auth(world["admin"])).status_code == 403

    def test_last_owner_cannot_be_demoted_or_removed(self, client, world):
        r = client.patch(self.url(world, world["owner"]), json={"role": "admin"}, headers=auth(world["owner"]))
        assert r.status_code == 409
        assert client.delete(self.url(world, world["owner"]), headers=auth(world["owner"])).status_code == 409
        assert world["db"].query(OrganizationMember).filter_by(user_id=world["owner"].id, role="owner").count() == 1

    def test_second_owner_allows_demoting_the_first(self, client, world):
        client.patch(self.url(world, world["admin"]), json={"role": "owner"}, headers=auth(world["owner"]))
        r = client.patch(self.url(world, world["owner"]), json={"role": "admin"}, headers=auth(world["owner"]))
        assert r.status_code == 200

    def test_remove_member_clears_project_assignments(self, client, world):
        db = world["db"]
        mine = Project(name="Mine", owner_organization_id=world["acme"].id)
        theirs = Project(name="Theirs", owner_organization_id=world["other"].id)
        db.add_all([mine, theirs])
        db.flush()
        db.add_all([
            ProjectMember(project_id=mine.id, user_id=world["member"].id, role="member"),
            ProjectMember(project_id=theirs.id, user_id=world["member"].id, role="member"),
        ])
        db.commit()
        assert client.delete(self.url(world, world["member"]), headers=auth(world["admin"])).status_code == 204
        db.expire_all()
        assert db.query(OrganizationMember).filter_by(user_id=world["member"].id).count() == 0
        remaining = db.query(ProjectMember).filter_by(user_id=world["member"].id).all()
        assert [str(pm.project_id) for pm in remaining] == [str(theirs.id)]

    def test_unknown_member(self, client, world):
        assert client.delete(self.url(world, world["outsider"]), headers=auth(world["admin"])).status_code == 404


class TestActiveOrganization:
    def test_non_member_organization_is_403(self, client, world):
        r = client.get("/api/projects/", headers=auth(world["member"], world["other"]))
        assert r.status_code == 403
        # on any authenticated endpoint, not only the project list
        r = client.get(f"/api/organizations/{world['acme'].id}/members", headers=auth(world["admin"], world["other"]))
        assert r.status_code == 403

    def test_malformed_id_is_403(self, client, world):
        headers = {**auth(world["member"]), "X-Organization-Id": "not-a-uuid"}
        assert client.get("/api/projects/", headers=headers).status_code == 403

    def test_organizations_me_ignores_a_stale_header(self, client, world):
        # a removed membership must not lock the client out of the list it needs to recover
        r = client.get("/api/organizations/me", headers=auth(world["member"], world["other"]))
        assert r.status_code == 200

    def test_project_list_scoped_to_active_organization(self, client, world):
        db = world["db"]
        acme_project = Project(name="Acme project", owner_organization_id=world["acme"].id)
        other_project = Project(name="Other project", owner_organization_id=world["other"].id)
        db.add_all([acme_project, other_project])
        db.flush()
        db.add(ProjectOrganization(project_id=other_project.id, organization_id=world["acme"].id, access="viewer"))
        # the user belongs to both organizations
        db.add(OrganizationMember(user_id=world["owner"].id, organization_id=world["other"].id, role="owner"))
        another = Project(name="Only other", owner_organization_id=world["other"].id)
        db.add(another)
        db.commit()

        def names(org):
            r = client.get("/api/projects/", headers=auth(world["owner"], org))
            assert r.status_code == 200
            return sorted(p["name"] for p in r.json()["projects"])

        assert names(world["acme"]) == ["Acme project", "Other project"]  # owned + shared with acme
        assert names(world["other"]) == ["Only other", "Other project"]
        assert names(None) == ["Acme project", "Only other", "Other project"]  # no header: union (12.2)


def test_log_sender_never_logs_the_link_outside_dev(monkeypatch, caplog):
    link = "http://app/invite/SECRET"
    monkeypatch.setattr(email_sender.settings, "environment", "production")
    with caplog.at_level("DEBUG"):
        assert email_sender.LogEmailSender().send("a@b.com", "s", link) is False
    assert "SECRET" not in caplog.text

    monkeypatch.setattr(email_sender.settings, "environment", "development")
    with caplog.at_level("INFO"):
        email_sender.LogEmailSender().send("a@b.com", "s", link)
    assert "SECRET" in caplog.text
