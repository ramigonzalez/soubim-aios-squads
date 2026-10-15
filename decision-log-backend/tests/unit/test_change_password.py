"""Story 12.13 (Part A): change your own password (POST /api/auth/change-password).

HTTP level (``pg_session``): the app's own session (middleware + routes) and the test session must see
the same data.
"""

import importlib.util
import logging
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.api.middleware import rate_limit
from app.config import settings
from app.database.models import User
from app.utils.security import create_access_token, hash_password, verify_password

PASSWORD = "old-password-1"
NEW_PASSWORD = "new-password-2"
URL = "/api/auth/change-password"


@pytest.fixture
def client(pg_session):
    from app.main import app

    return TestClient(app)  # no context manager: no startup (DB init, scheduler)


@pytest.fixture
def user(pg_session):
    u = User(email="ana@x.com", password_hash=hash_password(PASSWORD), name="Ana", role="client")
    pg_session.add(u)
    pg_session.commit()
    return u


def auth(u):
    return {"Authorization": "Bearer " + create_access_token(str(u.id), u.email, u.role)}


def change(client, u, current=PASSWORD, new=NEW_PASSWORD):
    return client.post(URL, json={"current_password": current, "new_password": new}, headers=auth(u))


def stored_hash(db, u):
    db.expire_all()
    return db.query(User).filter(User.id == u.id).one().password_hash


class TestChangePassword:
    def test_success_and_login_with_the_new_password(self, client, pg_session, user, caplog):
        caplog.set_level(logging.DEBUG)
        r = change(client, user)
        assert r.status_code == 204
        assert verify_password(NEW_PASSWORD, stored_hash(pg_session, user))
        assert client.post("/api/auth/login", json={"email": "ana@x.com", "password": NEW_PASSWORD}).status_code == 200
        assert client.post("/api/auth/login", json={"email": "ana@x.com", "password": PASSWORD}).status_code == 401
        assert PASSWORD not in caplog.text and NEW_PASSWORD not in caplog.text  # never logged
        # no revocation mechanism: the current token keeps working
        assert client.get("/api/auth/me", headers=auth(user)).status_code == 200

    def test_wrong_current_password(self, client, pg_session, user):
        before = stored_hash(pg_session, user)
        r = change(client, user, current="not-my-password")
        assert r.status_code == 400 and r.json() == {"detail": "invalid_current_password"}
        assert stored_hash(pg_session, user) == before

    def test_oversized_current_password_is_just_wrong(self, client, user):
        r = change(client, user, current="é" * 100)  # > 72 bytes: bcrypt would raise
        assert r.status_code == 400 and r.json()["detail"] == "invalid_current_password"

    @pytest.mark.parametrize("new,code", [
        ("short", "password_too_short"),
        ("é" * 40, "password_too_long"),
        (PASSWORD, "password_unchanged"),
    ])
    def test_new_password_rules(self, client, pg_session, user, new, code):
        before = stored_hash(pg_session, user)
        r = change(client, user, new=new)
        assert r.status_code == 400 and r.json()["detail"] == code
        assert stored_hash(pg_session, user) == before

    def test_account_without_a_password(self, client, pg_session, user):
        user.has_password = False
        pg_session.commit()
        r = change(client, user)
        assert r.status_code == 400 and r.json()["detail"] == "no_password_set"

    def test_unauthenticated_is_401(self, client):
        r = client.post(URL, json={"current_password": PASSWORD, "new_password": NEW_PASSWORD})
        assert r.status_code == 401

    def test_rate_limited_like_the_login(self, client, user, monkeypatch):
        limiter = rate_limit.limiter
        monkeypatch.setattr(limiter, "enabled", True)
        monkeypatch.setattr(settings, "trusted_proxy", False)
        monkeypatch.setattr(settings, "rate_limit_login_email_minute", "2/minute")
        limiter.reset()
        try:
            assert change(client, user, current="wrong-1").status_code == 400
            assert change(client, user, current="wrong-2").status_code == 400
            r = change(client, user, current=PASSWORD)
            assert r.status_code == 429 and "Retry-After" in r.headers
        finally:
            limiter.reset()


class TestUnusablePasswordAccounts:
    def test_google_created_account_has_no_password(self, pg_session):
        from datetime import datetime, timedelta

        from app.database.models import OrganizationInvitation
        from app.services import google_login, invitations

        invitation = OrganizationInvitation(
            organization_name="NewCo", email="g@x.com", role="owner", token_hash=invitations.hash_token("t"),
            expires_at=datetime.utcnow() + timedelta(days=1),
        )
        pg_session.add(invitation)
        pg_session.commit()
        result = google_login._accept_invitation(pg_session, invitation, "g@x.com", "G", "sub-g")
        assert result.user.has_password is False

    def test_operator_script_flags(self, db_session):
        path = Path(__file__).resolve().parents[2] / "scripts" / "create_platform_operator.py"
        spec = importlib.util.spec_from_file_location("create_platform_operator", path)
        script = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(script)
        assert script.ensure_operator(db_session, "a@x.com").user.has_password is True
        user = script.ensure_operator(db_session, "b@x.com", no_password=True).user
        assert user.has_password is False
        assert script.ensure_operator(db_session, "b@x.com", reset_password=True).user.has_password is True
