"""
routers/webhooks.py — n8n inference webhook.

Allows n8n workflows to call CorpConnect's hosted LLM for mid-workflow
AI decisions without configuring separate OpenAI/Groq credentials in n8n.

Auth: HMAC-SHA256 over the raw request body using N8N_SHARED_SECRET.
Header: X-N8n-Signature: <hex digest>

Endpoint:
    POST /webhooks/n8n
    Body: { "task": "generate_email" | "evaluate_condition" | "freeform",
            "prompt": "...", "context": { ... } }
    Response: { "ok": true, "output": "..." }
"""

import hashlib
import hmac
import logging
from typing import Any

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from app.config import settings
from app.llm import generate, is_llm_configured
from app.prompts.loader import load_prompt

logger = logging.getLogger(__name__)

router = APIRouter()

# ─── Task-to-Template Mapping ──────────────────────────────────────────────────

TASK_TEMPLATE_MAP: dict[str, str] = {
    "generate_email": "n8n_generate_email",
    "evaluate_condition": "n8n_evaluate_condition",
    "freeform": "n8n_freeform",
}


# ─── Models ───────────────────────────────────────────────────────────────────

class N8nInferenceRequest(BaseModel):
    task: str = Field(
        ...,
        description="Task type: 'generate_email', 'evaluate_condition', or 'freeform'",
    )
    prompt: str = Field(..., description="The prompt / instruction for the LLM")
    context: dict[str, Any] = Field(
        default_factory=dict,
        description="Arbitrary context data from the n8n workflow",
    )


class N8nInferenceResponse(BaseModel):
    ok: bool = True
    output: str


# ─── HMAC verification ───────────────────────────────────────────────────────

def _verify_n8n_hmac(raw_body: bytes, signature: str) -> bool:
    """Verify HMAC-SHA256 signature from n8n using the shared secret."""
    secret = settings.N8N_SHARED_SECRET
    if not secret:
        return False
    expected = hmac.new(
        secret.encode(), raw_body, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


# ─── Endpoint ─────────────────────────────────────────────────────────────────

@router.post("/n8n", response_model=N8nInferenceResponse)
async def n8n_inference(request: Request):
    """
    n8n calls this endpoint mid-workflow to get LLM output.
    Auth: HMAC-SHA256 over the raw body via X-N8n-Signature header.
    """
    # 1. Read raw body for HMAC verification
    raw_body = await request.body()

    # 2. Verify HMAC
    signature = request.headers.get("x-n8n-signature", "")
    if not _verify_n8n_hmac(raw_body, signature):
        logger.warning("[webhooks/n8n] HMAC verification failed")
        raise HTTPException(status_code=401, detail="Invalid or missing HMAC signature")

    # 3. Check LLM availability
    if not is_llm_configured():
        raise HTTPException(
            status_code=503,
            detail="LLM not configured — set LLM_API_KEY in ai-service/.env",
        )

    # 4. Parse and validate body
    try:
        body = N8nInferenceRequest.model_validate_json(raw_body)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid request body: {e}")

    # 5. Load prompt template based on task
    template_name = TASK_TEMPLATE_MAP.get(body.task, "n8n_freeform")
    try:
        template = load_prompt(template_name)
        system_prompt = template.system_prompt or ""
        temperature = template.temperature if template.temperature is not None else 0.3
    except Exception as e:
        logger.warning("[webhooks/n8n] Failed to load prompt template '%s': %s", template_name, e)
        system_prompt = (
            "You are an AI assistant integrated into an event management automation workflow. "
            "Follow the user's instruction using the provided context data. "
            "Be concise and actionable."
        )
        temperature = 0.3

    # 6. Build user message with context
    context_str = ""
    if body.context:
        context_str = f"\n\nContext data:\n{body.context}\n\n"
    user_message = f"{body.prompt}{context_str}"

    # 7. Generate LLM response
    try:
        output = await generate(
            system_prompt=system_prompt,
            user_message=user_message,
            temperature=temperature,
        )
        logger.info(
            "[webhooks/n8n] task=%s prompt_len=%d output_len=%d",
            body.task, len(body.prompt), len(output),
        )
        return N8nInferenceResponse(ok=True, output=output)
    except Exception as e:
        logger.error("[webhooks/n8n] LLM generation failed: %s", e)
        raise HTTPException(status_code=500, detail=f"LLM generation failed: {e}")
