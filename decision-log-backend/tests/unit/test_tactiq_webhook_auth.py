"""Shared-secret check of the Tactiq webhook (Story 7.19). No secret value is printed or asserted in logs."""

import asyncio
import logging
from types import SimpleNamespace

import pytest
from fastapi import BackgroundTasks, HTTPException

from app.api.routes import webhooks
from app.config import settings

SECRET = "unit-test-tactiq-secret"


@pytest.fixture
def configured(monkeypatch):
    monkeypatch.setattr(settings, "tactiq_webhook_secret", SECRET)


def env(monkeypatch, value):
    monkeypatch.setattr(settings, "environment", value)


def status_of(provided):
    with pytest.raises(HTTPException) as exc:
        webhooks.verify_tactiq_secret(provided)
    return exc.value.status_code


class TestVerify:
    def test_correct_secret_passes_everywhere(self, configured, monkeypatch):
        for e in ("test", "development", "production"):
            env(monkeypatch, e)
            webhooks.verify_tactiq_secret(SECRET)

    def test_wrong_secret_is_401_even_outside_production(self, configured, monkeypatch):
        env(monkeypatch, "test")
        assert status_of("nope") == 401
        assert status_of("") == 401

    def test_non_ascii_secret_does_not_raise_typeerror(self, configured, monkeypatch):
        env(monkeypatch, "production")
        assert status_of("sécret") == 401

    def test_missing_header_allowed_in_dev_and_test(self, configured, monkeypatch):
        for e in ("test", "development"):
            env(monkeypatch, e)
            webhooks.verify_tactiq_secret(None)

    def test_missing_header_rejected_in_production(self, configured, monkeypatch):
        env(monkeypatch, "production")
        assert status_of(None) == 401

    @pytest.mark.parametrize("placeholder", ["", "whsec_your-webhook-secret"])
    def test_production_without_a_real_secret_fails_closed(self, monkeypatch, placeholder):
        env(monkeypatch, "production")
        monkeypatch.setattr(settings, "tactiq_webhook_secret", placeholder)
        assert status_of(placeholder or None) == 503
        assert status_of("anything") == 503

    def test_uses_constant_time_compare(self, configured, monkeypatch):
        calls = []
        real = webhooks.hmac.compare_digest
        monkeypatch.setattr(webhooks.hmac, "compare_digest", lambda a, b: calls.append(1) or real(a, b))
        env(monkeypatch, "test")
        webhooks.verify_tactiq_secret(SECRET)
        assert calls

    def test_secret_is_never_logged(self, configured, monkeypatch, caplog):
        env(monkeypatch, "production")
        with caplog.at_level(logging.DEBUG):
            status_of("wrong-value-xyz")
        assert SECRET not in caplog.text and "wrong-value-xyz" not in caplog.text


class TestRoute:
    def call(self, secret, user=None):
        request = SimpleNamespace(state=SimpleNamespace(user=user))
        return asyncio.run(
            webhooks.receive_transcript(
                payload={}, request=request, background_tasks=BackgroundTasks(), db=None, x_tactiq_secret=secret
            )
        )

    def test_wrong_secret_stops_before_anything_else(self, configured, monkeypatch):
        env(monkeypatch, "test")
        with pytest.raises(HTTPException) as exc:
            self.call("wrong", user=object())
        assert exc.value.status_code == 401 and exc.value.detail == "Invalid webhook secret"

    def test_dev_without_header_keeps_the_existing_behaviour(self, configured, monkeypatch):
        env(monkeypatch, "test")
        with pytest.raises(HTTPException) as exc:  # no user: the pre-existing JWT rule still applies
            self.call(None, user=None)
        assert exc.value.status_code == 401 and exc.value.detail == "Not authenticated"

    def test_production_without_header_is_rejected(self, configured, monkeypatch):
        env(monkeypatch, "production")
        with pytest.raises(HTTPException) as exc:
            self.call(None, user=object())
        assert exc.value.detail == "Invalid webhook secret"
