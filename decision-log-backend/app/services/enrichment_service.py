"""Enrichment service — generates vector embeddings for project items.

Story 5.4: AI Extraction Prompt Evolution

Generates 384-dimensional embeddings using sentence-transformers (all-MiniLM-L6-v2)
for semantic search across all item types.
"""

import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

# Lazy-loaded model
_embedding_model = None


def _get_embedding_model():
    """Lazy-load the sentence-transformers model."""
    global _embedding_model
    if _embedding_model is None:
        try:
            from sentence_transformers import SentenceTransformer
            _embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
            logger.info("Loaded embedding model: all-MiniLM-L6-v2")
        except ImportError:
            logger.warning(
                "sentence-transformers not available. "
                "Install with: pip install sentence-transformers"
            )
            return None
    return _embedding_model


def build_embedding_text(item: Dict[str, Any]) -> str:
    """Build the text to embed from item fields.

    Includes statement + context + type-specific fields for richer semantic representation.
    """
    parts = [
        item.get("statement", ""),
        f"Type: {item.get('item_type', 'decision')}",
        f"Who: {item.get('who', '')}",
    ]

    # Add type-specific context
    item_type = item.get("item_type", "decision")

    if item_type == "decision":
        if item.get("why"):
            parts.append(f"Rationale: {item['why']}")
        if item.get("causation"):
            parts.append(f"Caused by: {item['causation']}")

    elif item_type == "action_item":
        if item.get("owner"):
            parts.append(f"Owner: {item['owner']}")

    elif item_type == "topic":
        if item.get("discussion_points"):
            parts.append(f"Discussion: {item['discussion_points']}")

    elif item_type == "idea":
        if item.get("related_topic"):
            parts.append(f"Related to: {item['related_topic']}")

    elif item_type == "information":
        if item.get("reference_source"):
            parts.append(f"Source: {item['reference_source']}")

    # Add disciplines
    disciplines = item.get("affected_disciplines", [])
    if disciplines:
        parts.append(f"Disciplines: {', '.join(disciplines)}")

    return " | ".join(filter(None, parts))


def generate_embedding(text: str) -> Optional[List[float]]:
    """Generate a 384-dim embedding for a text string.

    Returns None if sentence-transformers is not available.
    """
    model = _get_embedding_model()
    if model is None:
        return None

    try:
        embedding = model.encode(text, normalize_embeddings=True)
        return embedding.tolist()
    except Exception as e:
        logger.error(f"Embedding generation failed: {e}")
        return None


def enrich_items(items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Generate embeddings for a list of extracted items.

    Args:
        items: List of item dicts from extraction

    Returns:
        Same items with 'embedding' field added (None if model unavailable)
    """
    model = _get_embedding_model()

    for item in items:
        text = build_embedding_text(item)
        if model is not None:
            try:
                embedding = model.encode(text, normalize_embeddings=True)
                item["embedding"] = embedding.tolist()
            except Exception as e:
                logger.error(f"Failed to generate embedding: {e}")
                item["embedding"] = None
        else:
            item["embedding"] = None

    logger.info(f"Enriched {len(items)} items with embeddings")
    return items
