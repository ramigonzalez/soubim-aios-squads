"""Prompt loader service — loads and caches extraction prompts from disk.

Story 5.4: AI Extraction Prompt Evolution
"""

import os
from pathlib import Path
from typing import Dict, Optional

# In-memory cache for loaded prompts
_prompt_cache: Dict[str, str] = {}

# Prompts directory
PROMPTS_DIR = Path(__file__).parent.parent / "prompts"


def load_prompt(name: str, reload: bool = False) -> str:
    """Load a prompt template from disk with caching.

    Args:
        name: Prompt file name without extension (e.g., 'extract_meeting')
        reload: Force reload from disk (bypass cache)

    Returns:
        Prompt template string with {{variable}} placeholders
    """
    if not reload and name in _prompt_cache:
        return _prompt_cache[name]

    file_path = PROMPTS_DIR / f"{name}.md"
    if not file_path.exists():
        raise FileNotFoundError(f"Prompt file not found: {file_path}")

    content = file_path.read_text(encoding="utf-8")
    _prompt_cache[name] = content
    return content


def render_prompt(name: str, variables: Dict[str, str], reload: bool = False) -> str:
    """Load and render a prompt template with variable substitution.

    Args:
        name: Prompt file name without extension
        variables: Dict of {{key}}: value substitutions
        reload: Force reload from disk

    Returns:
        Rendered prompt string
    """
    template = load_prompt(name, reload=reload)
    rendered = template
    for key, value in variables.items():
        rendered = rendered.replace(f"{{{{{key}}}}}", str(value))
    return rendered


def clear_cache():
    """Clear the prompt cache (for testing/development)."""
    _prompt_cache.clear()


def list_prompts() -> list:
    """List all available prompt files."""
    if not PROMPTS_DIR.exists():
        return []
    return [f.stem for f in PROMPTS_DIR.glob("*.md")]
