"""
llm.py — Generative LLM client singleton.

Wraps the OpenAI-compatible API for both OpenAI and Groq providers.
Swap the provider by changing LLM_PROVIDER and LLM_API_KEY in .env —
no other code changes are required.

Supported providers:
  - "groq"   → api.groq.com  (free tier, llama-3.1-8b-instant / mixtral-8x7b-32768)
  - "openai" → api.openai.com (gpt-4o-mini / gpt-4o)
"""

import hashlib
import hmac
import logging

from openai import AsyncOpenAI

from app.config import settings

logger = logging.getLogger(__name__)

_client: AsyncOpenAI | None = None

_PROVIDER_BASE_URLS: dict[str, str | None] = {
    "groq":   settings.LLM_API_BASE_URL,
    "openai": None, 
}

def get_llm_client() -> AsyncOpenAI:
    """Return (or create) the LLM client singleton."""
    global _client
    if _client is None:
        if not settings.LLM_API_KEY:
            raise RuntimeError(
                "LLM_API_KEY is not set — add it to ai-service/.env to enable generative features."
            )
        base_url = _PROVIDER_BASE_URLS.get(settings.LLM_PROVIDER)
        _client = AsyncOpenAI(
            api_key=settings.LLM_API_KEY,
            base_url=base_url,
        )
        logger.info(
            "🤖 LLM client initialised — provider=%s model=%s",
            settings.LLM_PROVIDER,
            settings.LLM_MODEL_NAME,
        )
    return _client


def is_llm_configured() -> bool:
    """Return True if the LLM API key has been set (feature gate)."""
    return bool(settings.LLM_API_KEY)


async def generate(
    system_prompt: str,
    user_message: str,
    *,
    max_tokens: int | None = None,
    temperature: float = 0.4,
) -> str:
    """
    Generate a response from the configured LLM.

    Args:
        system_prompt: The system-level instruction that shapes the LLM's behaviour.
        user_message: The actual user query or content to process.
        max_tokens: Override the default max token limit (defaults to settings.LLM_MAX_TOKENS).
        temperature: Sampling temperature (0 = deterministic, 1 = creative).

    Returns:
        The LLM's response as a plain string.

    Raises:
        RuntimeError: If LLM_API_KEY is not configured.
    """
    client = get_llm_client()
    response = await client.chat.completions.create(
        model=settings.LLM_MODEL_NAME,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": user_message},
        ],
        temperature=temperature,
        max_tokens=max_tokens or settings.LLM_MAX_TOKENS,
    )
    return response.choices[0].message.content or ""


# ─── n8n HMAC Utilities ───────────────────────────────────────────────────────

def compute_hmac_signature(payload: bytes) -> str:
    """Compute HMAC-SHA256 hex signature for a raw payload."""
    secret = settings.N8N_WEBHOOK_SECRET.encode()
    return hmac.new(secret, payload, hashlib.sha256).hexdigest()


def verify_hmac_signature(payload: bytes, signature: str) -> bool:
    """Verify an incoming HMAC-SHA256 hex signature. Constant-time comparison."""
    expected = compute_hmac_signature(payload)
    return hmac.compare_digest(expected, signature)
