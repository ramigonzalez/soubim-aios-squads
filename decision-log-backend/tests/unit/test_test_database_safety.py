"""Tests run on a throwaway database, never the dev database (Story 7.18)."""

import pytest
from sqlalchemy import create_engine

from tests.conftest import TEST_DB_PREFIX, assert_test_database


def _pg_engine(database: str):
    # create_engine does not connect, so no server is needed
    return create_engine(f"postgresql://postgres:postgres@localhost:5432/{database}")


class TestAssertTestDatabase:
    def test_refuses_the_dev_database(self):
        with pytest.raises(RuntimeError, match="Refusing to create/drop tables in database 'decisionlog'"):
            assert_test_database(_pg_engine("decisionlog"))

    def test_refuses_any_non_test_database(self):
        with pytest.raises(RuntimeError):
            assert_test_database(_pg_engine("production"))

    def test_allows_throwaway_test_databases(self):
        assert_test_database(_pg_engine(f"{TEST_DB_PREFIX}_abc123"))

    def test_allows_sqlite(self):
        assert_test_database(create_engine("sqlite://"))


def test_app_engine_points_at_a_test_database():
    """The app's own engine (services, middleware, app.database.session users) is redirected too."""
    from app.database.session import engine

    assert engine.url.get_backend_name() == "sqlite" or (engine.url.database or "").startswith(TEST_DB_PREFIX)
    assert_test_database(engine)
