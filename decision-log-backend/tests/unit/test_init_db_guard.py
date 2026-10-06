"""Story 13.8 — startup must not seed demo users or create_all in production."""

import os

import pytest

from app.database import init_db as init_db_module


@pytest.fixture
def calls(monkeypatch):
    recorded = {"create_all": 0, "seed": 0}

    def fake_create_all(*args, **kwargs):
        recorded["create_all"] += 1

    def fake_seed():
        recorded["seed"] += 1

    monkeypatch.setattr(init_db_module.Base.metadata, "create_all", fake_create_all)
    monkeypatch.setattr(init_db_module, "seed_database", fake_seed)
    monkeypatch.delenv("DEMO_MODE", raising=False)
    return recorded


def _configure(monkeypatch, environment, demo_mode=False):
    monkeypatch.setattr(init_db_module.settings, "environment", environment)
    monkeypatch.setattr(init_db_module.settings, "demo_mode", demo_mode)


@pytest.mark.parametrize("environment", ["development", "test", "Development"])
def test_local_environments_create_tables_and_seed(monkeypatch, calls, environment):
    _configure(monkeypatch, environment)
    init_db_module.init_db()
    assert calls == {"create_all": 1, "seed": 1}


@pytest.mark.parametrize("environment", ["production", "staging"])
def test_production_does_not_create_tables_or_seed(monkeypatch, calls, environment):
    _configure(monkeypatch, environment)
    init_db_module.init_db()
    assert calls == {"create_all": 0, "seed": 0}
    assert os.environ.get("DEMO_MODE") is None  # never forced on


def test_production_seeds_only_with_explicit_demo_mode_setting(monkeypatch, calls):
    _configure(monkeypatch, "production", demo_mode=True)
    init_db_module.init_db()
    assert calls == {"create_all": 0, "seed": 1}


def test_production_seeds_with_explicit_demo_mode_env(monkeypatch, calls):
    _configure(monkeypatch, "production")
    monkeypatch.setenv("DEMO_MODE", "true")
    init_db_module.init_db()
    assert calls == {"create_all": 0, "seed": 1}
