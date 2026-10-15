"""Story 12.9: a project's Drive folder, shared by its organization with the service account.

HTTP level (``pg_session``). Google is faked: ``DriveClient.list_shared_folders`` returns what the
service account would see, i.e. every client's shared folders.
"""

from datetime import datetime
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.database.models import OrganizationMember, Project, User
from app.services import drive_folders
from app.utils.security import create_access_token, hash_password
from tests.org_helpers import make_org

ROBOT = "promem-drive@example.iam.gserviceaccount.com"

SHARED = [
    {"id": "f-acme", "name": "Acme Tower", "sharingUser": {"emailAddress": "admin@acme.com"},
     "sharedWithMeTime": "2026-10-15T12:00:00Z", "webViewLink": "https://drive/f-acme"},
    {"id": "f-acme-member", "name": "Acme Docs", "sharingUser": {"emailAddress": "Member@Acme.com"},
     "sharedWithMeTime": "2026-10-15T11:00:00Z"},
    {"id": "f-other", "name": "Other Secrets", "sharingUser": {"emailAddress": "boss@other.com"}},
    {"id": "f-stranger", "name": "Stranger", "sharingUser": {"emailAddress": "someone@gmail.com"}},
    {"id": "f-no-sharer", "name": "Owned by robot"},
]


class FakeDrive:
    def list_shared_folders(self):
        return SHARED


@pytest.fixture
def client(pg_session):
    from app.main import app

    return TestClient(app)  # no context manager: no startup (DB init, scheduler)


@pytest.fixture
def drive(monkeypatch):
    monkeypatch.setattr(drive_folders, "service_account_email", lambda: ROBOT)
    monkeypatch.setattr(drive_folders, "DriveClient", FakeDrive)


def make_user(db, email):
    user = User(email=email, password_hash=hash_password("password123"), name=email, role="client")
    db.add(user)
    db.flush()
    return user


def auth(user):
    return {"Authorization": "Bearer " + create_access_token(str(user.id), user.email, user.role)}


@pytest.fixture
def world(pg_session):
    db = pg_session
    acme, other = make_org(db, "Acme", "acme"), make_org(db, "Other", "other")
    admin, member, reader = make_user(db, "admin@acme.com"), make_user(db, "member@acme.com"), make_user(db, "reader@acme.com")
    boss = make_user(db, "boss@other.com")
    for user, org, role in ((admin, acme, "owner"), (member, acme, "admin"), (reader, acme, "member"), (boss, other, "owner")):
        db.add(OrganizationMember(user_id=user.id, organization_id=org.id, role=role))
    project = Project(name="Acme Tower", owner_organization_id=acme.id, last_drive_poll=datetime(2026, 10, 1))
    other_project = Project(name="Other Tower", owner_organization_id=other.id)
    db.add_all([project, other_project])
    db.commit()
    return dict(db=db, acme=acme, other=other, admin=admin, member=member, reader=reader, boss=boss,
                project=project, other_project=other_project)


def url(project, suffix=""):
    return f"/api/projects/{project.id}/drive-folder{suffix}"


def test_state_shows_service_account_and_no_folder(client, world, drive):
    r = client.get(url(world["project"]), headers=auth(world["admin"]))
    assert r.status_code == 200
    assert r.json() == {"configured": True, "service_account_email": ROBOT, "folder_id": None, "folder_name": None,
                        "last_checked_at": "2026-10-01T00:00:00Z", "error": None}


def test_options_are_only_folders_shared_by_members_of_the_owning_organization(client, world, drive):
    r = client.get(url(world["project"], "/options"), headers=auth(world["admin"]))
    assert r.status_code == 200
    assert [f["id"] for f in r.json()] == ["f-acme", "f-acme-member"]  # case-insensitive e-mail match
    assert r.json()[0] == {"id": "f-acme", "name": "Acme Tower", "shared_by": "admin@acme.com",
                           "shared_at": "2026-10-15T12:00:00Z", "url": "https://drive/f-acme"}
    other = client.get(url(world["other_project"], "/options"), headers=auth(world["boss"]))
    assert [f["id"] for f in other.json()] == ["f-other"]


def test_choose_folder_sets_name_and_restarts_polling(client, world, drive):
    r = client.put(url(world["project"]), json={"folder_id": "f-acme-member"}, headers=auth(world["member"]))
    assert r.status_code == 200
    body = r.json()
    assert (body["folder_id"], body["folder_name"], body["last_checked_at"]) == ("f-acme-member", "Acme Docs", None)
    db = world["db"]
    db.refresh(world["project"])
    assert world["project"].drive_folder_id == "f-acme-member"


@pytest.mark.parametrize("folder_id", ["f-other", "f-stranger", "f-no-sharer", "made-up"])
def test_folder_of_another_organization_is_refused(client, world, drive, folder_id):
    """The 12.2 F2 hijack: the service account can read every client's folder, the API must not let one pick it."""
    r = client.put(url(world["project"]), json={"folder_id": folder_id}, headers=auth(world["admin"]))
    assert r.status_code == 403
    assert r.json()["detail"] == "folder_not_shared_by_organization"
    world["db"].refresh(world["project"])
    assert world["project"].drive_folder_id is None


@pytest.mark.parametrize("who", ["reader", "boss"])
@pytest.mark.parametrize("method,suffix,body", [
    ("get", "", None), ("get", "/options", None), ("put", "", {"folder_id": "f-acme"}), ("delete", "", None),
])
def test_only_owner_or_admin_of_the_owning_organization(client, world, drive, who, method, suffix, body):
    kwargs = {"headers": auth(world[who])}
    if body is not None:
        kwargs["json"] = body
    assert getattr(client, method)(url(world["project"], suffix), **kwargs).status_code == 403


def test_remove_folder(client, world, drive):
    client.put(url(world["project"]), json={"folder_id": "f-acme"}, headers=auth(world["admin"]))
    assert client.delete(url(world["project"]), headers=auth(world["admin"])).status_code == 204
    state = client.get(url(world["project"]), headers=auth(world["admin"])).json()
    assert (state["folder_id"], state["folder_name"]) == (None, None)


def test_not_configured(client, world, monkeypatch):
    monkeypatch.setattr(drive_folders, "service_account_email", lambda: None)
    state = client.get(url(world["project"]), headers=auth(world["admin"])).json()
    assert (state["configured"], state["service_account_email"]) == (False, None)
    r = client.get(url(world["project"], "/options"), headers=auth(world["admin"]))
    assert (r.status_code, r.json()["detail"]) == (503, "drive_not_configured")


def test_google_failure_is_502(client, world, drive, monkeypatch):
    class Broken:
        def list_shared_folders(self):
            raise RuntimeError("google down")

    monkeypatch.setattr(drive_folders, "DriveClient", Broken)
    r = client.get(url(world["project"], "/options"), headers=auth(world["admin"]))
    assert (r.status_code, r.json()["detail"]) == (502, "drive_unavailable")


def test_monitor_skips_projects_of_blocked_organizations(world):
    from app.services.drive_monitor import DriveMonitor

    db = world["db"]
    world["project"].drive_folder_id = "f-acme"
    world["other_project"].drive_folder_id = "f-other"
    world["other"].status = "blocked"
    db.commit()
    with patch("app.services.drive_monitor.DriveClient") as drive_cls, patch("app.services.drive_monitor.DocumentProcessor"):
        drive_cls.return_value = MagicMock(list_new_files=MagicMock(return_value=[]))
        DriveMonitor(db).poll_all_projects()
        polled = [c.kwargs["folder_id"] for c in drive_cls.return_value.list_new_files.call_args_list]
    assert polled == ["f-acme"]
