"""Story 13.17: one LLM client factory, Anthropic or OpenRouter — no network, fake SDK clients."""

import json
from types import SimpleNamespace

import anthropic
import pytest
from pydantic import ValidationError

from app.api.routes.extraction_runs import _calculate_extraction_cost
from app.config import Settings, settings
from app.services import extraction_v2, llm_client
from app.services.llm_client import (
    DEFAULT_OPENROUTER_BASE_URL,
    get_llm_client,
    lookup_pricing,
    pricing_key,
    supports_server_side_fallback,
)

OUTPUT = {"meeting_summary": "Resumo.", "items": [{"item_type": "decision", "statement": "Usar C50.", "who": "Ana"}]}


def _settings(provider, anthropic_key="sk-ant-test", openrouter_key="sk-or-test", base_url=DEFAULT_OPENROUTER_BASE_URL):
    return SimpleNamespace(
        llm_provider=provider,
        anthropic_api_key=anthropic_key,
        openrouter_api_key=openrouter_key,
        openrouter_base_url=base_url,
        llm_model="claude-opus-5-5" if provider == "anthropic" else "anthropic/claude-opus-5.5",
        extraction_max_tokens=64000,
        extraction_effort="high",
    )


class FakeAnthropic:
    """Stands in for anthropic.Anthropic: records constructor kwargs and stream() calls."""

    instances = []

    def __init__(self, **kwargs):
        self.kwargs = kwargs
        self.calls = []
        self.messages = self
        FakeAnthropic.instances.append(self)

    def stream(self, **kwargs):
        self.calls.append(kwargs)
        model = kwargs["model"]

        class _Stream:
            def __enter__(self):
                return self

            def __exit__(self, *exc):
                return False

            def get_final_message(self):
                return SimpleNamespace(
                    content=[SimpleNamespace(type="text", text=json.dumps(OUTPUT))],
                    stop_reason="end_turn",
                    model=model,
                    usage=SimpleNamespace(input_tokens=1200, output_tokens=300),
                )

        return _Stream()


@pytest.fixture
def fake_sdk(monkeypatch):
    FakeAnthropic.instances = []
    monkeypatch.setattr(anthropic, "Anthropic", FakeAnthropic)
    return FakeAnthropic


@pytest.fixture
def provider(monkeypatch):
    """Switch the app settings to a provider for one test."""

    def use(name):
        for key, value in vars(_settings(name)).items():
            monkeypatch.setattr(settings, key, value)

    return use


class TestFactory:
    def test_anthropic_provider_uses_the_claude_api_key(self, fake_sdk):
        client = get_llm_client(_settings("anthropic"))
        assert client.kwargs == {"api_key": "sk-ant-test"}  # SDK default base URL

    def test_openrouter_provider_uses_openrouter_key_and_base_url(self, fake_sdk):
        client = get_llm_client(_settings("openrouter", anthropic_key=None))
        assert client.kwargs == {"api_key": "sk-or-test", "base_url": "https://openrouter.ai/api"}

    def test_openrouter_base_url_is_configurable(self, fake_sdk):
        client = get_llm_client(_settings("openrouter", base_url="https://proxy.example/api"))
        assert client.kwargs["base_url"] == "https://proxy.example/api"

    def test_defaults_to_app_settings(self, fake_sdk, provider):
        provider("openrouter")
        assert get_llm_client().kwargs["base_url"] == DEFAULT_OPENROUTER_BASE_URL

    def test_server_side_fallback_only_on_anthropic(self):
        assert supports_server_side_fallback(_settings("anthropic")) is True
        assert supports_server_side_fallback(_settings("openrouter")) is False


class TestExtractionThroughBothProviders:
    def test_anthropic_sends_fallback_header_and_fields(self, fake_sdk, provider):
        provider("anthropic")
        result = extraction_v2.run_meeting_extraction("prompt")

        call = fake_sdk.instances[-1].calls[0]
        assert call["extra_headers"] == {"anthropic-beta": "server-side-fallback-2026-07-01"}
        assert call["extra_body"] == {"output_config": {"effort": "high"}, "fallbacks": "default"}
        assert result.model == "claude-opus-5-5" and len(result.items) == 1

    def test_openrouter_drops_provider_only_fields(self, fake_sdk, provider):
        provider("openrouter")
        result = extraction_v2.run_meeting_extraction("prompt")

        client = fake_sdk.instances[-1]
        call = client.calls[0]
        assert client.kwargs["base_url"] == DEFAULT_OPENROUTER_BASE_URL
        assert call["model"] == "anthropic/claude-opus-5.5"
        assert "extra_headers" not in call
        assert call["extra_body"] == {"output_config": {"effort": "high"}}  # effort is supported, fallbacks is not
        assert (result.input_tokens, result.output_tokens) == (1200, 300)
        assert len(result.items) == 1


class TestStartupKeyCheck:
    BASE = dict(
        _env_file=None,
        database_url="sqlite://",
        jwt_secret_key="x" * 40,
        tactiq_webhook_secret="secret",
    )

    def test_openrouter_without_key_fails_with_a_clear_message(self):
        with pytest.raises(ValidationError, match="LLM_PROVIDER=openrouter needs OPENROUTER_API_KEY"):
            Settings(**self.BASE, llm_provider="openrouter", anthropic_api_key="sk-ant", openrouter_api_key="")

    def test_anthropic_without_key_fails_with_a_clear_message(self):
        with pytest.raises(ValidationError, match="LLM_PROVIDER=anthropic needs ANTHROPIC_API_KEY"):
            Settings(**self.BASE, llm_provider="anthropic", anthropic_api_key=" ", openrouter_api_key="sk-or")

    def test_unknown_provider_fails(self):
        with pytest.raises(ValidationError, match="LLM_PROVIDER must be one of"):
            Settings(**self.BASE, llm_provider="bedrock", anthropic_api_key="sk-ant")

    def test_openrouter_ignores_the_production_anthropic_placeholder(self):
        s = Settings(
            **self.BASE,
            llm_provider="OpenRouter",
            anthropic_api_key="not-set-until-story-13.17",
            openrouter_api_key="sk-or",
        )
        assert s.llm_provider == "openrouter"

    def test_openrouter_does_not_need_an_anthropic_key(self):
        s = Settings(**self.BASE, llm_provider="openrouter", anthropic_api_key=None, openrouter_api_key="sk-or")
        assert s.anthropic_api_key is None and s.openrouter_base_url == DEFAULT_OPENROUTER_BASE_URL

    def test_default_provider_is_anthropic(self):
        s = Settings(**self.BASE, anthropic_api_key="ci-dummy-key")
        assert s.llm_provider == "anthropic"


class TestPricingMapping:
    @pytest.mark.parametrize(
        "model, key",
        [
            ("anthropic/claude-opus-5.5", "claude-opus-5-5"),
            ("anthropic/claude-opus-5-5", "claude-opus-5-5"),
            ("claude-opus-5-5", "claude-opus-5-5"),
            ("anthropic/claude-sonnet-5.5", "claude-sonnet-5-5"),
        ],
    )
    def test_openrouter_ids_map_to_claude_api_ids(self, model, key):
        assert pricing_key(model) == key

    def test_openrouter_run_costs_the_same_as_direct(self):
        direct = _calculate_extraction_cost("claude-opus-5-5", 1_000_000, 1_000_000)
        assert _calculate_extraction_cost("anthropic/claude-opus-5.5", 1_000_000, 1_000_000) == direct == 24.0

    def test_unknown_models_have_no_price(self):
        pricing = {"claude-opus-5-5": {"input": 4.0, "output": 20.0}}
        assert lookup_pricing("openai/gpt-5", pricing) is None
        assert lookup_pricing(None, pricing) is None
        assert _calculate_extraction_cost("google/gemini-3-pro", 10, 10) is None


def test_no_call_site_builds_its_own_client():
    """Every LLM call goes through the factory (llm_client is the only place that builds a client)."""
    import pathlib

    app_dir = pathlib.Path(llm_client.__file__).parents[1]
    offenders = [
        str(p.relative_to(app_dir))
        for p in app_dir.rglob("*.py")
        if p.name != "llm_client.py" and "Anthropic(" in p.read_text(encoding="utf-8")
    ]
    assert offenders == []
