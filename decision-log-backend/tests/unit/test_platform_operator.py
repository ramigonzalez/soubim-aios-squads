"""Story 12.13 (Part A): platform operator, /api/platform/*, organization status (payment pending / blocked)
and the create_platform_operator script.

HTTP level (``pg_session``): the app's own session (middleware + routes) and the test session must see
the same data.
"""

import importlib.util
import logging
from datetime import datetime
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.database.models import (
    Organization,
    OrganizationInvitation,
    OrganizationMember,
    Project,
    ProjectItem,
    Source,
    User,
)
from app.services import google_login, invitations
from app.services.google_login import LoginResult
from app.utils.security import create_access_token, hash_password, verify_password
from tests.org_helpers import make_org

PASSWORD = "password123"


@pytest.fixture
def client(pg_session):
    from app.main import app

    return TestClient(app)  # no context manager: no startup (DB init, scheduler)


@pytest.fixture(autouse=True)
def no_email(monkeypatch):
    class Silent:
        def send(self, to, subject, body):
            return True

    monkeypatch.setattr(invitations, "get_email_sender", lambda: Silent())


def make_user(db, email, name="Someone", operator=False):
    user = User(email=email, password_hash=hash_password(PASSWORD), name=name, role="client",
                is_platform_operator=operator)
    db.add(user)
    db.flush()
    return user


def join(db, user, org, role):
    db.add(OrganizationMember(user_id=user.id, organization_id=org.id, role=role))
    db.flush()


def auth(user, org=None):
    headers = {"Authorization": "Bearer " + create_access_token(str(user.id), user.email, user.role)}
    if org is not None:
        headers["X-Organization-Id"] = str(org.id)
    return headers


def login(client, email):
    return client.post("/api/auth/login", json={"email": email, "password": PASSWORD})


@pytest.fixture
def world(pg_session):
    db = pg_session
    acme = make_org(db, "Acme", "acme")
    other = make_org(db, "Other", "other")
    admin = make_user(db, "admin@acme.com", "Admin")
    member = make_user(db, "member@acme.com", "Member")
    both = make_user(db, "both@acme.com", "Both")  # admin of Acme and of Other
    operator = make_user(db, "operator@platform.com", "Operator", operator=True)
    join(db, admin, acme, "owner")
    join(db, member, acme, "admin")
    join(db, both, acme, "admin")
    join(db, both, other, "admin")
    project = Project(name="Acme Tower", owner_organization_id=acme.id)
    other_project = Project(name="Other Tower", owner_organization_id=other.id)
    db.add_all([project, other_project])
    db.flush()
    source = Source(project_id=project.id, source_type="meeting", title="Kickoff", occurred_at=datetime(2026, 9, 1),
                    ingestion_status="processed", raw_content="0:01 - Ana\n  Oi", visibility="shared")
    db.add(source)
    db.flush()
    item = ProjectItem(project_id=project.id, source_id=source.id, item_type="decision", statement="Use steel",
                       decision_statement="Use steel", who="Ana", timestamp="00:01:00", discipline="architecture",
                       affected_disciplines=["architecture"], why="cost", consensus={}, review_status="approved")
    db.add(item)
    db.commit()
    return dict(db=db, acme=acme, other=other, admin=admin, member=member, both=both, operator=operator,
                project=project, other_project=other_project, source=source, item=item)


def set_status(db, org, status):
    org.status = status
    db.commit()


PLATFORM_CALLS = [
    ("get", "/api/platform/organizations", None),
    ("get", "/api/platform/organizations/{acme}", None),
    ("patch", "/api/platform/organizations/{acme}", {"status": "blocked"}),
    ("get", "/api/platform/invitations", None),
    ("post", "/api/platform/invitations", {"email": "ceo@newco.com", "organization_name": "NewCo"}),
    ("delete", "/api/platform/invitations/{random}", None),
]


def _call(client, method, path, body, world, headers):
    path = path.format(acme=world["acme"].id, random="00000000-0000-0000-0000-000000000001")
    kwargs = {"headers": headers}
    if body is not None:
        kwargs["json"] = body
    return getattr(client, method)(path, **kwargs)


class TestPlatformAccess:
    @pytest.mark.parametrize("method,path,body", PLATFORM_CALLS)
    def test_org_admin_gets_403_everywhere(self, client, world, method, path, body):
        assert _call(client, method, path, body, world, auth(world["admin"])).status_code == 403
        assert _call(client, method, path, body, world, {}).status_code == 401
        world["db"].expire_all()
        assert world["acme"].status == "active"
        assert world["db"].query(OrganizationInvitation).count() == 0

    def test_operator_flag_cannot_be_set_through_the_api(self, client, world):
        boss = world["operator"]
        r = client.post("/api/platform/invitations", json={"email": "new@x.com", "organization_name": "X"},
                        headers=auth(boss))
        token = r.json()["invite_url"].rsplit("/invite/", 1)[1]
        done = client.post("/api/invitations/public/accept",
                           json={"token": token, "name": "N", "password": PASSWORD, "is_platform_operator": True})
        assert done.status_code == 200
        assert done.json()["user"]["is_platform_operator"] is False
        assert world["db"].query(User).filter(User.email == "new@x.com").one().is_platform_operator is False


class TestOperatorSeesCountsOnly:
    def test_list_organizations(self, client, world):
        r = client.get("/api/platform/organizations", headers=auth(world["operator"]))
        assert r.status_code == 200
        orgs = {o["slug"]: o for o in r.json()["organizations"]}
        assert set(orgs) == {"acme", "other"}
        acme = orgs["acme"]
        assert set(acme) == {"id", "name", "slug", "status", "created_at", "member_count", "project_count",
                             "last_activity_at"}
        assert (acme["name"], acme["status"], acme["member_count"], acme["project_count"]) == ("Acme", "active", 3, 1)
        assert acme["last_activity_at"] is not None

    def test_detail_lists_members_without_content(self, client, world):
        r = client.get(f"/api/platform/organizations/{world['acme'].id}", headers=auth(world["operator"]))
        assert r.status_code == 200
        body = r.json()
        assert sorted((m["email"], m["role"]) for m in body["members"]) == [
            ("admin@acme.com", "owner"), ("both@acme.com", "admin"), ("member@acme.com", "admin")]
        assert all(set(m) == {"name", "email", "role"} for m in body["members"])
        text = r.text
        for secret in ("Acme Tower", "Kickoff", "Use steel"):
            assert secret not in text
        assert client.get("/api/platform/organizations/00000000-0000-0000-0000-000000000001",
                          headers=auth(world["operator"])).status_code == 404

    def test_operator_has_no_access_to_tenant_data(self, client, world):
        h = auth(world["operator"])
        me = client.get("/api/auth/me", headers=h)
        assert me.status_code == 200
        assert me.json()["is_platform_operator"] is True
        assert me.json()["projects"] == [] and me.json()["organizations"] == []
        assert client.get("/api/organizations/me", headers=h).json() == []
        assert client.get("/api/projects/", headers=h).json()["projects"] == []
        pid, sid, iid = world["project"].id, world["source"].id, world["item"].id
        assert client.get(f"/api/projects/{pid}", headers=h).status_code in (403, 404)
        assert client.get(f"/api/projects/{pid}/items", headers=h).status_code in (403, 404)
        assert client.get(f"/api/projects/{pid}/items/{iid}", headers=h).status_code in (403, 404)
        assert client.get(f"/api/sources/{sid}/meeting", headers=h).status_code in (403, 404)
        assert client.get("/api/ingestion?ingestion_status=processed", headers=h).json()["sources"] == []
        assert client.get(f"/api/organizations/{world['acme'].id}/members", headers=h).status_code == 404
        assert client.get("/api/projects/", headers=auth(world["operator"], world["acme"])).status_code == 403

    def test_operator_logs_in_without_organization(self, client, world):
        r = login(client, "operator@platform.com")
        assert r.status_code == 200
        assert r.json()["user"]["is_platform_operator"] is True


class TestStatus:
    def test_operator_changes_status(self, client, world):
        url = f"/api/platform/organizations/{world['acme'].id}"
        h = auth(world["operator"])
        r = client.patch(url, json={"status": "payment_pending"}, headers=h)
        assert r.status_code == 200 and r.json()["status"] == "payment_pending"
        world["db"].expire_all()
        assert world["acme"].status == "payment_pending"
        assert client.patch(url, json={"status": "deleted"}, headers=h).status_code == 422
        assert client.patch("/api/platform/organizations/00000000-0000-0000-0000-000000000001",
                            json={"status": "blocked"}, headers=h).status_code == 404

    def test_payment_pending_keeps_access_and_reports_status(self, client, world):
        set_status(world["db"], world["acme"], "payment_pending")
        r = login(client, "member@acme.com")
        assert r.status_code == 200
        assert [(o["slug"], o["status"]) for o in r.json()["user"]["organizations"]] == [("acme", "payment_pending")]
        h = auth(world["member"])
        assert [p["name"] for p in client.get("/api/projects/", headers=h).json()["projects"]] == ["Acme Tower"]
        assert client.get(f"/api/projects/{world['project'].id}/items", headers=h).status_code == 200
        assert client.get("/api/organizations/me", headers=h).json()[0]["status"] == "payment_pending"


class TestBlocked:
    def test_member_of_a_blocked_organization_loses_everything(self, client, world):
        old_token = auth(world["member"])  # issued before the block
        set_status(world["db"], world["acme"], "blocked")

        r = login(client, "member@acme.com")
        assert r.status_code == 403 and r.json()["detail"] == "organization_blocked"
        for path in ("/api/auth/me", "/api/projects/", f"/api/projects/{world['project'].id}/items",
                     "/api/organizations/me"):
            r = client.get(path, headers=old_token)
            assert r.status_code == 403 and r.json()["detail"] == "organization_blocked", path

    def test_wrong_password_is_still_401(self, client, world):
        set_status(world["db"], world["acme"], "blocked")
        assert client.post("/api/auth/login", json={"email": "member@acme.com", "password": "nope"}).status_code == 401

    def test_multi_organization_user_keeps_the_other_organization(self, client, world):
        set_status(world["db"], world["acme"], "blocked")
        r = login(client, "both@acme.com")
        assert r.status_code == 200
        assert [o["slug"] for o in r.json()["user"]["organizations"]] == ["other"]
        h = auth(world["both"])
        assert [p["name"] for p in client.get("/api/projects/", headers=h).json()["projects"]] == ["Other Tower"]
        assert client.get(f"/api/projects/{world['project'].id}", headers=h).status_code == 403
        assert client.get(f"/api/projects/{world['project'].id}/items", headers=h).status_code == 403
        assert client.get(f"/api/sources/{world['source'].id}/meeting", headers=h).status_code == 404
        assert client.get(f"/api/organizations/{world['acme'].id}/members", headers=h).status_code == 404
        # choosing the blocked organization as the active one is refused
        assert client.get("/api/projects/", headers=auth(world["both"], world["acme"])).status_code == 403

    def test_unblocking_restores_access(self, client, world):
        set_status(world["db"], world["acme"], "blocked")
        set_status(world["db"], world["acme"], "active")
        assert login(client, "member@acme.com").status_code == 200

    def test_user_without_any_organization_still_logs_in(self, client, world):
        make_user(world["db"], "lonely@x.com")
        world["db"].commit()
        r = login(client, "lonely@x.com")
        assert r.status_code == 200 and r.json()["user"]["projects"] == []

    def test_google_sign_in_is_refused(self, client, world, monkeypatch):
        from app.integrations import google_oidc

        set_status(world["db"], world["acme"], "blocked")
        monkeypatch.setattr(google_oidc, "is_configured", lambda: True)
        monkeypatch.setattr(google_login, "redeem", lambda db, code, key: LoginResult(
            user=db.query(User).filter(User.email == "member@acme.com").one()))
        r = client.post("/api/auth/google/exchange", json={"code": "c", "browser_key": "k"})
        assert r.status_code == 403 and r.json()["detail"] == "organization_blocked"

    def test_operator_is_never_blocked(self, client, world):
        join(world["db"], world["operator"], world["acme"], "member")
        set_status(world["db"], world["acme"], "blocked")
        assert login(client, "operator@platform.com").status_code == 200
        assert client.get("/api/platform/organizations", headers=auth(world["operator"])).status_code == 200


class TestCompanyInvitations:
    def test_create_list_and_revoke(self, client, world):
        h = auth(world["operator"])
        r = client.post("/api/platform/invitations", json={"email": "CEO@NewCo.com", "organization_name": "NewCo"},
                        headers=h)
        assert r.status_code == 201
        body = r.json()
        assert body["organization_id"] is None and body["role"] == "owner" and body["email"] == "ceo@newco.com"
        assert "/invite/" in body["invite_url"]

        listed = client.get("/api/platform/invitations", headers=h).json()["invitations"]
        assert [(i["email"], i["organization_name"]) for i in listed] == [("ceo@newco.com", "NewCo")]
        assert "invite_url" not in listed[0]

        assert client.delete(f"/api/platform/invitations/{body['id']}", headers=h).status_code == 204
        assert client.get("/api/platform/invitations", headers=h).json()["invitations"] == []
        token = body["invite_url"].rsplit("/invite/", 1)[1]
        assert client.post("/api/invitations/public/preview", json={"token": token}).status_code == 410

    def test_organization_invitations_are_not_listed_or_revoked_here(self, client, world):
        r = client.post("/api/invitations", json={"email": "x@y.com", "organization_id": str(world["acme"].id)},
                        headers=auth(world["admin"]))
        assert r.status_code == 201
        h = auth(world["operator"])
        assert client.get("/api/platform/invitations", headers=h).json()["invitations"] == []
        assert client.delete(f"/api/platform/invitations/{r.json()['id']}", headers=h).status_code == 404
        world["db"].expire_all()
        assert world["db"].query(OrganizationInvitation).one().revoked_at is None

    def test_accepting_creates_an_active_organization(self, client, world):
        r = client.post("/api/platform/invitations", json={"email": "ceo@newco.com", "organization_name": "NewCo"},
                        headers=auth(world["operator"]))
        token = r.json()["invite_url"].rsplit("/invite/", 1)[1]
        done = client.post("/api/invitations/public/accept", json={"token": token, "name": "CEO", "password": PASSWORD})
        assert done.status_code == 200
        assert [(o["name"], o["role"], o["status"]) for o in done.json()["user"]["organizations"]] == [
            ("NewCo", "owner", "active")]
        orgs = client.get("/api/platform/organizations", headers=auth(world["operator"])).json()["organizations"]
        assert {o["name"]: o["member_count"] for o in orgs}["NewCo"] == 1


# ─── scripts/create_platform_operator.py ─────────────────────────────────────


@pytest.fixture
def script():
    path = Path(__file__).resolve().parents[2] / "scripts" / "create_platform_operator.py"
    spec = importlib.util.spec_from_file_location("create_platform_operator", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    yield module
    logging.disable(logging.NOTSET)  # main() silences INFO logs for the operator's terminal


def run_script(script, db, *argv):
    lines = []
    code = script.main(list(argv), session_factory=lambda: db, out=lines.append)
    return code, lines


class TestCreatePlatformOperatorScript:
    def test_creates_operator_on_an_empty_database(self, script, db_session):
        code, lines = run_script(script, db_session, "Rami@Example.com", "--name", "Rami")
        assert code == 0
        user = db_session.query(User).one()
        assert (user.email, user.name, user.is_platform_operator) == ("rami@example.com", "Rami", True)
        assert db_session.query(OrganizationMember).count() == 0
        assert db_session.query(Organization).count() == 0
        password = lines[-1]
        assert len(password) >= 20
        assert verify_password(password, user.password_hash)
        assert sum(password in line for line in lines) == 1  # printed once

    def test_is_idempotent(self, script, db_session):
        run_script(script, db_session, "rami@example.com")
        hash_before = db_session.query(User).one().password_hash
        code, lines = run_script(script, db_session, "rami@example.com")
        assert code == 0
        assert "nothing changed" in lines[0] and len(lines) == 1  # no password printed again
        db_session.expire_all()
        assert db_session.query(User).count() == 1
        assert db_session.query(User).one().password_hash == hash_before

    def test_existing_user_only_gets_the_flag(self, script, db_session):
        org = make_org(db_session, "souBIM", "soubim")
        user = User(email="rami@example.com", password_hash=hash_password(PASSWORD), name="Rami", role="director")
        db_session.add(user)
        db_session.flush()
        join(db_session, user, org, "owner")
        db_session.commit()
        code, lines = run_script(script, db_session, "rami@example.com")
        assert code == 0 and len(lines) == 1
        db_session.expire_all()
        user = db_session.query(User).one()
        assert user.is_platform_operator is True
        assert verify_password(PASSWORD, user.password_hash)  # password untouched
        assert db_session.query(OrganizationMember).count() == 1  # memberships untouched

    def test_reset_password_prints_a_new_one(self, script, db_session):
        run_script(script, db_session, "rami@example.com")
        code, lines = run_script(script, db_session, "rami@example.com", "--reset-password")
        assert code == 0
        db_session.expire_all()
        assert verify_password(lines[-1], db_session.query(User).one().password_hash)

    def test_no_password_for_google_only(self, script, db_session):
        code, lines = run_script(script, db_session, "rami@example.com", "--no-password")
        assert code == 0
        assert "Google" in lines[-1]
        assert db_session.query(User).one().is_platform_operator is True

    def test_deleted_account_is_refused(self, script, db_session):
        db_session.add(User(email="rami@example.com", password_hash="x", name="R", role="client",
                            deleted_at=datetime.utcnow()))
        db_session.commit()
        code, lines = run_script(script, db_session, "rami@example.com")
        assert code == 1 and lines[0].startswith("error:")
        assert db_session.query(User).one().is_platform_operator is False
