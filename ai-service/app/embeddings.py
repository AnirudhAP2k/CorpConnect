"""
embeddings.py — HuggingFace Serverless Inference API client.

Replaces the local SentenceTransformer / PyTorch backend with a remote HTTP
call to the free HuggingFace Inference API.

Model: sentence-transformers/all-MiniLM-L6-v2
  - 384 dimensions (unchanged — no schema migration needed)
  - Produces normalised vectors (cosine similarity = dot product)
  - Free via HuggingFace Serverless Inference API (HUGGINGFACE_API_KEY)

Public API is identical to the previous local implementation:
  load_model()                         — no-op (kept for startup compatibility)
  encode(text)                         — list[float] | list[list[float]]
  weighted_average_embeddings(...)     — list[float]
  build_user_profile(history)          — list[float] | None
"""

from typing import Union
import logging
import httpx
import numpy as np

from app.config import settings

logger = logging.getLogger(__name__)

# ─── Constants ────────────────────────────────────────────────────────────────

_HF_API_URL = (
    "https://router.huggingface.co/hf-inference/models/"
    "sentence-transformers/all-MiniLM-L6-v2/pipeline/feature-extraction"
)
_EXPECTED_DIM = 384
# httpx timeout: connect=5s, read=30s (HF cold-starts can be slow)
_TIMEOUT = httpx.Timeout(connect=5.0, read=30.0, write=10.0, pool=5.0)


# ─── Startup hook (no-op — kept for main.py compatibility) ────────────────────

def load_model() -> None:
    """
    No-op. Kept so main.py lifespan startup code does not need changes.
    Validates that HUGGINGFACE_API_KEY is configured and logs readiness.
    """
    if not settings.HUGGINGFACE_API_KEY:
        logger.warning(
            "⚠️  HUGGINGFACE_API_KEY is not set. "
            "Embedding calls will fail with 401 Unauthorized."
        )
    else:
        logger.info(
            "🤖 Embeddings backend: HuggingFace Inference API "
            "(sentence-transformers/all-MiniLM-L6-v2, %d dims)",
            _EXPECTED_DIM,
        )


# ─── Core encode function ─────────────────────────────────────────────────────

def encode(text: Union[str, list[str]]) -> list[float] | list[list[float]]:
    """
    Encode text(s) into normalised 384-dimensional embedding vector(s)
    via the HuggingFace Serverless Inference API (synchronous).

    Single string  → list[float]         (length 384)
    List of strings → list[list[float]]
    """
    is_single = isinstance(text, str)
    inputs = [text] if is_single else text

    headers = {
        "Authorization": f"Bearer {settings.HUGGINGFACE_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "inputs": inputs,
        # Ask HF to return normalised vectors so cosine sim = dot product
        "options": {"normalize_embeddings": True, "wait_for_model": True},
    }

    try:
        with httpx.Client(timeout=_TIMEOUT) as client:
            response = client.post(_HF_API_URL, json=payload, headers=headers)
            response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        logger.error(
            "HuggingFace API returned %s: %s",
            exc.response.status_code,
            exc.response.text[:200],
        )
        raise RuntimeError(
            f"Embedding API error {exc.response.status_code}: {exc.response.text[:200]}"
        ) from exc
    except httpx.RequestError as exc:
        logger.error("HuggingFace API request failed: %s", exc)
        raise RuntimeError(f"Embedding API unreachable: {exc}") from exc

    result: list[list[float]] = response.json()

    # Guard: validate returned shape matches expected dimensions
    if not result or len(result[0]) != _EXPECTED_DIM:
        raise RuntimeError(
            f"Unexpected embedding dimension from API: "
            f"got {len(result[0]) if result else 0}, expected {_EXPECTED_DIM}"
        )

    return result[0] if is_single else result


# ─── Profile builder helpers (unchanged logic, same public API) ───────────────

def weighted_average_embeddings(
    embeddings: list[list[float]],
    weights: list[float],
) -> list[float]:
    """
    Compute a weighted average of multiple normalised embedding vectors.
    Returns a re-normalised result vector (unit length).
    Used to build a user's 'taste profile' from their event history.
    """
    if not embeddings:
        raise ValueError("No embeddings to average")

    emb_matrix = np.array(embeddings, dtype=float)   # shape (N, 384)
    w = np.array(weights, dtype=float)
    w = w / w.sum()                                    # normalise weights → sum=1
    result = (emb_matrix * w[:, np.newaxis]).sum(axis=0)

    norm = np.linalg.norm(result)
    if norm > 0:
        result /= norm

    return result.tolist()


def build_user_profile(history: list[dict]) -> list[float] | None:
    """
    Build a user's taste-profile vector from their event engagement history.
    Returns None if no pre-computed embeddings are available in the history rows.

    history: list of dicts with keys:
        embedding (list[float])  — pre-stored vector from the DB
        weight    (float)        — engagement weight (e.g. 0.5–1.0)
    """
    valid = [row for row in history if row.get("embedding") is not None]
    if not valid:
        return None

    embeddings = [row["embedding"] for row in valid]
    weights    = [float(row.get("weight", 0.5)) for row in valid]

    return weighted_average_embeddings(embeddings, weights)
