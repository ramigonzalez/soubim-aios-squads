"""Story 12.5: invitations, members management and active organization (HTTP level).

Needs PostgreSQL (``pg_session``): the app's own session (middleware + routes) and the test
session must see the same data.
"""

import threading
import time
from datetime import datetime, timedelta

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

from app.database.models import (
    OrganizationInvitation,
    OrganizationMember,
    Project,
    ProjectMember,
    ProjectOrganization,
    User,
)
from app.database.models import Organization
from app.services import email_sender, invitations, organizations
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


# ─── Security review (Story 12.5) ────────────────────────────────────────────


def _race(monkeypatch, db, mutate):
    """Run ``mutate(invitation_id)`` in another transaction right after the accept endpoint has
    looked the token up (simulates a concurrent accept / revoke between check and use)."""
    real = invitations.find_by_token
    other = sessionmaker(bind=db.get_bind())

    def find_then_race(session, token):
        invitation = real(session, token)
        s = other()
        try:
            mutate(s, invitation.id)
            s.commit()
        finally:
            s.close()
        return invitation

    monkeypatch.setattr(invitations, "find_by_token", find_then_race)


def _set(field):
    def mutate(s, invitation_id):
        s.query(OrganizationInvitation).filter_by(id=invitation_id).update({field: datetime.utcnow()})

    return mutate


class TestSecurityReview:
    def test_revoked_between_check_and_use_new_user(self, client, world, sent, monkeypatch):
        token = token_of(invite(client, world["admin"], world["acme"], "new@example.com"))
        _race(monkeypatch, world["db"], _set("revoked_at"))
        r = client.post("/api/invitations/public/accept", json={"token": token, "name": "N", "password": PASSWORD})
        assert r.status_code == 410
        world["db"].expire_all()
        assert world["db"].query(User).filter(User.email == "new@example.com").first() is None

    def test_accepted_concurrently_existing_user(self, client, world, sent, monkeypatch):
        token = token_of(invite(client, world["admin"], world["acme"], "outsider@other.com"))
        _race(monkeypatch, world["db"], _set("accepted_at"))
        r = client.post("/api/invitations/accept", json={"token": token}, headers=auth(world["outsider"]))
        assert r.status_code == 410
        world["db"].expire_all()
        assert world["db"].query(OrganizationMember).filter_by(
            user_id=world["outsider"].id, organization_id=world["acme"].id
        ).count() == 0

    def test_new_company_double_accept_creates_one_organization(self, client, world, sent, monkeypatch):
        platform = make_org(world["db"], "souBIM", "soubim")
        boss = make_user(world["db"], "boss@soubim.com", "Boss")
        join(world["db"], boss, platform, "owner")
        r = client.post(
            "/api/invitations", json={"email": "outsider@other.com", "organization_name": "Dup Co"}, headers=auth(boss)
        )
        token = token_of(r)
        _race(monkeypatch, world["db"], _set("accepted_at"))
        assert client.post("/api/invitations/accept", json={"token": token}, headers=auth(world["outsider"])).status_code == 410
        world["db"].expire_all()
        assert world["db"].query(Organization).filter(Organization.name == "Dup Co").count() == 0

    def test_soft_deleted_account_email_is_409_not_500(self, client, world, sent):
        gone = make_user(world["db"], "gone@example.com", "Gone")
        gone.deleted_at = datetime.utcnow()
        world["db"].commit()
        token = token_of(invite(client, world["admin"], world["acme"], "gone@example.com"))
        r = client.post("/api/invitations/public/accept", json={"token": token, "name": "N", "password": PASSWORD})
        assert r.status_code == 409

    def test_oversized_inputs_are_422_not_500(self, client, world, sent):
        token = token_of(invite(client, world["admin"], world["acme"], "new@example.com"))
        url = "/api/invitations/public/accept"
        assert client.post(url, json={"token": token, "name": "N", "password": "é" * 40}).status_code == 422
        assert client.post(url, json={"token": token, "name": "N" * 300, "password": PASSWORD}).status_code == 422
        # the invitation is still usable after rejected attempts
        assert client.post(url, json={"token": token, "name": "N", "password": PASSWORD}).status_code == 200

        platform = make_org(world["db"], "souBIM", "soubim")
        boss = make_user(world["db"], "boss@soubim.com", "Boss")
        join(world["db"], boss, platform, "owner")
        r = client.post(
            "/api/invitations", json={"email": "a@b.com", "organization_name": "X" * 300}, headers=auth(boss)
        )
        assert r.status_code == 422

    def test_client_cannot_choose_the_email_or_role(self, client, world, sent):
        token = token_of(invite(client, world["admin"], world["acme"], "new@example.com", "member"))
        r = client.post(
            "/api/invitations/public/accept",
            json={"token": token, "name": "N", "password": PASSWORD, "email": "evil@x.com", "role": "owner"},
        )
        assert r.status_code == 200
        assert r.json()["user"]["email"] == "new@example.com"
        user = world["db"].query(User).filter(User.email == "new@example.com").one()
        assert user.role == "client"
        assert world["db"].query(OrganizationMember).filter_by(user_id=user.id).one().role == "member"

    def test_cross_org_admin_cannot_manage_other_org(self, client, world, sent):
        # outsider is owner of "other": acme ids must not be reachable through it
        h = auth(world["outsider"])
        acme = world["acme"].id
        assert client.get(f"/api/organizations/{acme}/invitations", headers=h).status_code == 404
        member_url = f"/api/organizations/{acme}/members/{world['member'].id}"
        assert client.patch(member_url, json={"role": "admin"}, headers=h).status_code == 404
        assert client.delete(member_url, headers=h).status_code == 404
        # nor an acme member through the other org's path
        other_url = f"/api/organizations/{world['other'].id}/members/{world['member'].id}"
        assert client.delete(other_url, headers=h).status_code == 404
        r = invite(client, world["admin"], world["acme"], "x@example.com")
        assert client.delete(f"/api/invitations/{r.json()['id']}", headers=h).status_code == 404

    def test_concurrent_owners_cannot_demote_each_other(self, world, monkeypatch):
        db, org = world["db"], world["acme"]
        db.query(OrganizationMember).filter_by(user_id=world["admin"].id, organization_id=org.id).update({"role": "owner"})
        db.commit()
        org_id, a, b = org.id, world["owner"].id, world["admin"].id
        Session = sessionmaker(bind=db.get_bind())

        real_count = organizations._owner_count

        def slow_count(session, organization_id):  # both would read "2 owners" without the lock
            n = real_count(session, organization_id)
            time.sleep(0.5)
            return n

        monkeypatch.setattr(organizations, "_owner_count", slow_count)
        results = []

        def demote(actor_id, target_id, delay):
            time.sleep(delay)
            s = Session()
            try:
                organizations.change_member_role(s, s.get(User, actor_id), org_id, target_id, "admin")
                results.append(200)
            except HTTPException as exc:
                s.rollback()
                results.append(exc.status_code)
            finally:
                s.close()

        threads = [threading.Thread(target=demote, args=(a, b, 0)), threading.Thread(target=demote, args=(b, a, 0.1))]
        for t in threads:
            t.start()
        for t in threads:
            t.join(10)
        assert sorted(results) == [200, 403]
        db.expire_all()
        assert db.query(OrganizationMember).filter_by(organization_id=org_id, role="owner").count() == 1
