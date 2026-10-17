"""One LLM client factory for every Claude call (Story 13.17).

LLM_PROVIDER picks where calls go:
- ``anthropic`` (default): the Claude API directly, with ANTHROPIC_API_KEY.
- ``openrouter``: OpenRouter's Anthropic-compatible endpoint (same Anthropic SDK, other base URL),
  with OPENROUTER_API_KEY.

Spike (2026-10-15): OpenRouter accepts streamed ``messages`` calls, ``output_config.effort`` and
reports usage, but rejects the server-side refusal fallback (``fallbacks`` must be an array there,
its own routing option), so that feature is sent only to the Anthropic provider.
"""

from typing import Any, Dict, Optional

ANTHROPIC = "anthropic"
OPENROUTER = "openrouter"
PROVIDERS = (ANTHROPIC, OPENROUTER)
DEFAULT_OPENROUTER_BASE_URL = "https://openrouter.ai/api"

_KEY_SETTING = {ANTHROPIC: "ANTHROPIC_API_KEY", OPENROUTER: "OPENROUTER_API_KEY"}


class LLMConfigError(ValueError):
    """The chosen LLM provider is not configured (raised at startup by Settings)."""


def _settings(settings=None):
    if settings is not None:
        return settings
    from app.config import settings as app_settings

    return app_settings


def provider_api_key(provider: str, anthropic_api_key: Optional[str], openrouter_api_key: Optional[str]) -> Optional[str]:
    """The key the provider uses; blank counts as missing."""
    key = anthropic_api_key if provider == ANTHROPIC else openrouter_api_key
    return key.strip() if key and key.strip() else None


def check_provider_key(provider: str, anthropic_api_key: Optional[str], openrouter_api_key: Optional[str]) -> None:
    """Raise LLMConfigError when the chosen provider has no key."""
    if provider not in PROVIDERS:
        raise LLMConfigError(f"LLM_PROVIDER must be one of {', '.join(PROVIDERS)} (got {provider!r})")
    if not provider_api_key(provider, anthropic_api_key, openrouter_api_key):
        raise LLMConfigError(f"LLM_PROVIDER={provider} needs {_KEY_SETTING[provider]}, which is not set")


def get_llm_client(settings=None):
    """Anthropic SDK client for the configured provider."""
    import anthropic

    s = _settings(settings)
    key = provider_api_key(s.llm_provider, s.anthropic_api_key, s.openrouter_api_key)
    if s.llm_provider == OPENROUTER:
        return anthropic.Anthropic(api_key=key, base_url=s.openrouter_base_url or DEFAULT_OPENROUTER_BASE_URL)
    return anthropic.Anthropic(api_key=key)


def response_text(response) -> str:
    """The text of a Messages API response, skipping non-text blocks (e.g. a leading thinking block)."""
    parts = []
    for block in response.content:
        kind = getattr(block, "type", "text")
        if isinstance(kind, str) and kind != "text":
            continue
        parts.append(getattr(block, "text", "") or "")
    return "".join(parts)


def supports_server_side_fallback(settings=None) -> bool:
    """Only the Claude API knows the server-side refusal fallback (beta header + ``fallbacks``)."""
    return _settings(settings).llm_provider == ANTHROPIC


def pricing_key(model: Optional[str]) -> Optional[str]:
    """Map a provider model id to its MODEL_PRICING key.

    OpenRouter ids look like ``anthropic/claude-opus-5.5``; the Claude API id is ``claude-opus-5-5``.
    """
    if not model:
        return None
    name = model.strip().split("/", 1)[1] if model.strip().startswith("anthropic/") else model.strip()
    return name.replace(".", "-")


def lookup_pricing(model: Optional[str], pricing: Dict[str, Dict[str, float]]) -> Optional[Dict[str, Any]]:
    """MODEL_PRICING entry for a model id from either provider, or None when unknown."""
    if not model:
        return None
    return pricing.get(model) or pricing.get(pricing_key(model) or "")
