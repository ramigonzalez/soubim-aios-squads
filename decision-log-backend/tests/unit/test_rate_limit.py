"""Rate limiting (Story 13.11). The suite runs with RATE_LIMIT_ENABLED=false; these tests switch it on.

No database: ``get_db`` is overridden and the credential check is stubbed, so only the limiter path runs.
"""

from unittest.mock import MagicMock
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

from app.api.middleware import rate_limit
from app.api.middleware import auth as auth_middleware
from app.api.routes import auth as auth_routes
from app.config import settings
from app.database.session import get_db
from app.main import app
from app.services.auth_service import AuthenticationError, UserNotFoundError
from app.utils.security import create_access_token


@pytest.fixture
def client(monkeypatch):
    limiter = rate_limit.limiter
    monkeypatch.setattr(limiter, "enabled", True)
    limiter.reset()
    monkeypatch.setattr(settings, "trusted_proxy", False)
    app.dependency_overrides[get_db] = lambda: MagicMock()

    def _bad_login(*_a, **_k):
        raise AuthenticationError("bad")

    monkeypatch.setattr(auth_routes, "authenticate_user", _bad_login)

    def _no_user(*_a, **_k):
        raise UserNotFoundError("none")

    monkeypatch.setattr(auth_middleware, "get_user_by_id", _no_user)  # auth answers 401, no DB
    yield TestClient(app)
    app.dependency_overrides.pop(get_db, None)
    limiter.reset()


def _login(client, email="a@example.com", **headers):
    return client.post("/api/auth/login", json={"email": email, "password": "x"}, headers=headers)


def test_login_429_with_retry_after(client, monkeypatch):
    monkeypatch.setattr(settings, "rate_limit_login_ip", "3/minute")
    assert [_login(client, f"u{i}@example.com").status_code for i in range(3)] == [401, 401, 401]
    r = _login(client, "u9@example.com")
    assert r.status_code == 429
    assert 1 <= int(r.headers["Retry-After"]) <= 60
    assert "detail" in r.json()


def test_login_per_email_limit_across_ips(client, monkeypatch):
    monkeypatch.setattr(settings, "trusted_proxy", True)
    monkeypatch.setattr(settings, "rate_limit_login_email_minute", "2/minute")
    for i in range(2):
        assert _login(client, "Victim@Example.com", **{"X-Forwarded-For": f"203.0.113.{i}"}).status_code == 401
    # Different IP, same address (case-insensitive): blocked by the per-email limit
    r = _login(client, "victim@example.com", **{"X-Forwarded-For": "203.0.113.99"})
    assert r.status_code == 429
    assert "Retry-After" in r.headers
    # Another address from the same IP is unaffected
    assert _login(client, "other@example.com", **{"X-Forwarded-For": "203.0.113.99"}).status_code == 401


def test_forwarded_header_ignored_unless_trusted(client, monkeypatch):
    monkeypatch.setattr(settings, "rate_limit_login_ip", "2/minute")
    # Spoofed XFF values must not create fresh buckets
    codes = [_login(client, f"u{i}@example.com", **{"X-Forwarded-For": f"198.51.100.{i}"}).status_code for i in range(3)]
    assert codes == [401, 401, 429]


def test_forwarded_header_used_when_trusted_rightmost_hop(client, monkeypatch):
    monkeypatch.setattr(settings, "trusted_proxy", True)
    monkeypatch.setattr(settings, "rate_limit_login_ip", "1/minute")
    # The client prepends a fake value; the proxy appends the real one (the right-most entry).
    assert _login(client, "a1@example.com", **{"X-Forwarded-For": "6.6.6.6, 198.51.100.1"}).status_code == 401
    assert _login(client, "a2@example.com", **{"X-Forwarded-For": "7.7.7.7, 198.51.100.1"}).status_code == 429
    assert _login(client, "a3@example.com", **{"X-Forwarded-For": "7.7.7.7, 198.51.100.2"}).status_code == 401


def test_invalid_forwarded_value_falls_back_to_peer(client, monkeypatch):
    monkeypatch.setattr(settings, "trusted_proxy", True)
    monkeypatch.setattr(settings, "rate_limit_login_ip", "1/minute")
    assert _login(client, "a1@example.com", **{"X-Forwarded-For": "not-an-ip"}).status_code == 401
    assert _login(client, "a2@example.com", **{"X-Forwarded-For": "also-bad"}).status_code == 429


def test_webhook_default_limit_is_generous(client):
    assert settings.rate_limit_webhook == "120/minute"
    path = f"/api/fathom/webhook/{uuid4()}"
    codes = {client.post(path, content=b"{}").status_code for _ in range(110)}
    assert 429 not in codes


def test_webhook_limited_per_connection(client, monkeypatch):
    monkeypatch.setattr(settings, "rate_limit_webhook", "3/minute")
    a, b = uuid4(), uuid4()
    for _ in range(3):
        assert client.post(f"/api/fathom/webhook/{a}", content=b"{}").status_code != 429
    assert client.post(f"/api/fathom/webhook/{a}", content=b"{}").status_code == 429
    assert client.post(f"/api/fathom/webhook/{b}", content=b"{}").status_code != 429  # other connection


def test_invitation_limited_per_ip(client, monkeypatch):
    monkeypatch.setattr(settings, "rate_limit_invitation", "2/minute")
    codes = [client.post("/api/invitations/public/preview", json={"token": "x"}).status_code for _ in range(3)]
    assert codes[-1] == 429 and 429 not in codes[:2]


def test_health_is_exempt(client, monkeypatch):
    monkeypatch.setattr(settings, "rate_limit_default", "1/minute")
    assert all(client.get("/api/health").status_code != 429 for _ in range(5))


def test_authenticated_api_keyed_per_user(client, monkeypatch):
    monkeypatch.setattr(settings, "rate_limit_default", "2/minute")
    t1 = create_access_token(user_id=str(uuid4()), email="a@example.com", role="director")
    t2 = create_access_token(user_id=str(uuid4()), email="b@example.com", role="director")
    h1, h2 = {"Authorization": f"Bearer {t1}"}, {"Authorization": f"Bearer {t2}"}
    # Same IP, different users: separate buckets (auth then rejects the unknown users with 401, not 429)
    for _ in range(2):
        assert client.get("/api/projects", headers=h1).status_code != 429
    assert client.get("/api/projects", headers=h1).status_code == 429
    assert client.get("/api/projects", headers=h2).status_code != 429


def test_limiter_disabled(client, monkeypatch):
    monkeypatch.setattr(rate_limit.limiter, "enabled", False)
    monkeypatch.setattr(settings, "rate_limit_login_ip", "1/minute")
    monkeypatch.setattr(settings, "rate_limit_login_email_minute", "1/minute")
    assert all(_login(client).status_code == 401 for _ in range(5))
