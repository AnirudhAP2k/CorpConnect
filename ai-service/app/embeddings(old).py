"""
embeddings.py — SentenceTransformer model singleton.

Model: all-MiniLM-L6-v2
  - 384 dimensions
  - ~90MB download (cached after first run)
  - CPU-friendly, fast inference
  - Produces normalised vectors (cosine similarity = dot product)
"""

from functools import lru_cache
from typing import Union
from sentence_transformers import SentenceTransformer

from app.config import settings
import numpy as np

_model: SentenceTransformer | None = None


def load_model() -> None:
    """Pre-load the model on startup (avoids cold-start on first request)."""
    global _model
    print(f"🤖 Loading embedding model: {settings.MODEL_NAME}...")
    _model = SentenceTransformer(settings.MODEL_NAME)
    print(f"   ✅ Model loaded — {_model.get_sentence_embedding_dimension()} dimensions")


def get_model() -> SentenceTransformer:
    if _model is None:
        raise RuntimeError("Model not loaded — call load_model() first")
    return _model


def encode(text: Union[str, list[str]]) -> list[float] | list[list[float]]:
    """
    Encode text(s) into normalised embedding vector(s).

    Single string  → list[float]  (length 384)
    List of strings → list[list[float]]
    """
    model = get_model()
    result = model.encode(text, normalize_embeddings=True)
    if isinstance(text, str):
        return result.tolist()
    return [r.tolist() for r in result]


def weighted_average_embeddings(
    embeddings: list[list[float]],
    weights: list[float],
) -> list[float]:
    """
    Compute a weighted average of multiple normalised embedding vectors.
    Returns a normalised result vector.
    Used to build a user's 'taste profile' from their history.
    """

    if not embeddings:
        raise ValueError("No embeddings to average")

    emb_matrix = np.array(embeddings, dtype=float)     # shape (N, 384)
    w = np.array(weights, dtype=float)
    w = w / w.sum()                                     # normalise weights to sum=1
    result = (emb_matrix * w[:, np.newaxis]).sum(axis=0)

    # Re-normalise to unit vector
    norm = np.linalg.norm(result)
    if norm > 0:
        result /= norm

    return result.tolist()


def build_user_profile(history: list[dict]) -> list[float] | None:
    """
    Build a user's taste-profile vector from their event history.
    Returns None if no embeddings are available.

    history: list of dicts with keys: embedding (list[float]), weight (float)
    """
    valid = [row for row in history if row.get("embedding") is not None]
    if not valid:
        return None

    embeddings = [row["embedding"] for row in valid]
    weights    = [float(row.get("weight", 0.5)) for row in valid]

    return weighted_average_embeddings(embeddings, weights)
