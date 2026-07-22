"""
routers/generate.py — POST /generate/event-description
                      POST /generate/matchmaking-reason

RAG-powered content generation using the LLM.

Both endpoints retrieve relevant OrgDocument chunks via pgvector cosine
similarity, then feed that grounded context to the LLM to produce accurate,
brand-aligned and legally-compliant outputs.

Auth: Master JWT only (internal Next.js server action calls).
"""

import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app import cache
from app.database import get_pool
from app.embeddings import encode
from app.llm import generate, is_llm_configured
from app.middleware.auth import require_master_jwt
from app.prompts import load_prompt
import json
import hashlib

logger = logging.getLogger(__name__)
router = APIRouter(dependencies=[Depends(require_master_jwt)])

# ─── Constants ────────────────────────────────────────────────────────────────

# Number of OrgDocument chunks to retrieve per context layer
_TOP_K_DOCS = 4

# Minimum cosine similarity score to include a chunk in the context
_MIN_SCORE = 0.25


# ─── Pydantic Models ─────────────────────────────────────────────────────────

class GenerateDescriptionRequest(BaseModel):
    orgId: str
    roughDraft: str = Field(..., min_length=10, max_length=2000,
                             description="A rough draft or key points to expand.")
    eventId: str | None = None   # If provided, also retrieves event-specific docs


class GenerateDescriptionResponse(BaseModel):
    description: str
    suggestions: list[str]
    sourceDocs: list[str]   # titles of OrgDocument chunks used


class MatchmakingReasonRequest(BaseModel):
    sourceOrgId: str
    targetOrgId: str
    score: float = Field(..., ge=0.0, le=1.0,
                          description="Cosine similarity score between the two orgs.")


class MatchmakingReasonResponse(BaseModel):
    reason: str
    sharedThemes: list[str]


# ─── RAG retrieval helpers ────────────────────────────────────────────────────

async def _retrieve_docs(
    query_vector: list[float],
    org_id: str | None,
    doc_types: list[str],
    top_k: int = _TOP_K_DOCS,
) -> list[dict]:
    """
    Retrieve the top-K most relevant OrgDocument chunks for a given query vector
    filtered by org and doc type.
    """
    pool = get_pool()

    query = f"""
        SELECT id, title, content, "docType",
               1 - (embedding <=> $1) AS score
        FROM "OrgDocument"
        WHERE
            embedding IS NOT NULL
            AND (
                ("organizationId" = $2::uuid AND "docType"::text = ANY($3::text[]))
                OR ("organizationId" IS NULL AND "docType"::text = ANY($3::text[]))
            )
            AND 1 - (embedding <=> $1) >= {_MIN_SCORE}
        ORDER BY embedding <=> $1
        LIMIT $4
    """
    async with pool.acquire() as conn:
        rows = await conn.fetch(query, query_vector, org_id, doc_types, top_k)
    return [dict(r) for r in rows]


def _build_context_block(label: str, docs: list[dict]) -> str:
    """Format retrieved docs into a labeled context block for the prompt."""
    if not docs:
        return f"[{label}]\nNo relevant documents found.\n"
    chunks = "\n---\n".join(
        f"Source: {d['title']}\n{d['content']}" for d in docs
    )
    return f"[{label}]\n{chunks}\n"


# ─── Routes ──────────────────────────────────────────────────────────────────

@router.post(
    "/event-description",
    response_model=GenerateDescriptionResponse,
    summary="Generate a polished event description using RAG",
)
async def generate_event_description(body: GenerateDescriptionRequest):
    """
    Expand a rough event description draft into a polished, brand-aligned,
    legally-compliant description by grounding the LLM in:
      - The organization's company description (brand voice, mission)
      - Platform-wide legal/compliance documents (T&Cs, policies)
      - Event-specific context (if eventId is provided)
    """
    if not is_llm_configured():
        raise HTTPException(
            status_code=503,
            detail="LLM is not configured. Set LLM_API_KEY in ai-service/.env.",
        )

    # 1. Check cache first
    input_str = f"{body.orgId}:{body.roughDraft.lower().strip()}:{body.eventId or ''}"
    prompt_hash = hashlib.md5(input_str.encode()).hexdigest()
    cache_key = cache.llm_generation_key(prompt_hash)
    
    cached = await cache.get(cache_key)
    if cached:
        logger.info("Returning cached event description for org=%s", body.orgId)
        return GenerateDescriptionResponse(**cached)

    # Embed the rough draft for RAG retrieval
    draft_vector: list[float] = encode(body.roughDraft)

    # Retrieve relevant context from all applicable doc types
    brand_docs = await _retrieve_docs(
        draft_vector, body.orgId, ["COMPANY_DESCRIPTION"], top_k=3
    )
    legal_docs = await _retrieve_docs(
        draft_vector, None, ["LEGAL_COMPLIANCE"], top_k=2
    )
    event_docs = []
    if body.eventId:
        event_docs = await _retrieve_docs(
            draft_vector, body.orgId, ["EVENT_DESCRIPTION"], top_k=2
        )

    all_docs = brand_docs + legal_docs + event_docs
    source_titles = [d["title"] for d in all_docs]

    # Build context and load YAML prompt
    context = "\n".join([
        _build_context_block("ORGANIZATION BRAND & MISSION", brand_docs),
        _build_context_block("PLATFORM POLICIES & COMPLIANCE", legal_docs),
        _build_context_block("EXISTING EVENT CONTEXT", event_docs) if event_docs else "",
    ])

    prompt_tpl = load_prompt("event_description")
    system_prompt = prompt_tpl.format_system(context=context)
    user_message = prompt_tpl.format_user(rough_draft=body.roughDraft)

    generated = await generate(
        system_prompt,
        user_message,
        max_tokens=prompt_tpl.max_tokens or 600,
        temperature=prompt_tpl.temperature or 0.4,
    )

    # Extract short improvement suggestions from a second focused call using template
    suggestions_tpl = load_prompt("event_description_suggestions")
    suggestions_raw = await generate(
        suggestions_tpl.system_prompt or "",
        generated,
        max_tokens=suggestions_tpl.max_tokens or 150,
        temperature=suggestions_tpl.temperature or 0.3,
    )

    # Parse suggestions safely
    try:
        start = suggestions_raw.find("[")
        end = suggestions_raw.rfind("]") + 1
        suggestions: list[str] = json.loads(suggestions_raw[start:end]) if start >= 0 else []
    except Exception:
        suggestions = []

    logger.info(
        "Generated event description for org=%s | %d source docs used",
        body.orgId, len(all_docs),
    )

    response = GenerateDescriptionResponse(
        description=generated,
        suggestions=suggestions[:3],
        sourceDocs=source_titles,
    )
    
    # Cache for 1 hour to save on LLM costs for re-submits
    await cache.set(cache_key, response.model_dump(), ttl=3600)
    
    return response


@router.post(
    "/matchmaking-reason",
    response_model=MatchmakingReasonResponse,
    summary="Explain why two organizations are a strong match",
)
async def generate_matchmaking_reason(body: MatchmakingReasonRequest):
    """
    Generate a human-readable explanation for why two organizations match,
    grounded in their actual company descriptions (not just their similarity score).
    """
    # Check cache first
    cache_key = cache.matchmaking_reason_key(body.sourceOrgId, body.targetOrgId)
    cached = await cache.get(cache_key)
    if cached:
        logger.info("Returning cached match reason for %s -> %s", body.sourceOrgId, body.targetOrgId)
        return MatchmakingReasonResponse(**cached)

    if not is_llm_configured():
        raise HTTPException(
            status_code=503,
            detail="LLM is not configured. Set LLM_API_KEY in ai-service/.env.",
        )

    pool = get_pool()

    # Fetch both orgs' basic info and their company description docs
    async def get_org_summary(org_id: str) -> tuple[str, str]:
        """Returns (org_name, best company description chunk)."""
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                'SELECT name, description FROM "Organization" WHERE id = $1::uuid', org_id
            )
        if not row:
            return ("Unknown Organization", "")

        org_query_vector = encode(row["description"] or row["name"])
        docs = await _retrieve_docs(org_query_vector, org_id, ["COMPANY_DESCRIPTION"], top_k=2)
        best_context = "\n".join(d["content"] for d in docs) if docs else (row["description"] or "")
        return (row["name"], best_context)

    source_name, source_context = await get_org_summary(body.sourceOrgId)
    target_name, target_context = await get_org_summary(body.targetOrgId)

    score_pct = round(body.score * 100)

    prompt_tpl = load_prompt("matchmaking_reason")
    system_prompt = prompt_tpl.system_prompt or ""
    user_message = prompt_tpl.format_user(
        source_name=source_name,
        source_context=source_context[:600],
        target_name=target_name,
        target_context=target_context[:600],
        score_pct=score_pct,
    )

    response_text = await generate(
        system_prompt,
        user_message,
        max_tokens=prompt_tpl.max_tokens or 300,
        temperature=prompt_tpl.temperature or 0.3,
    )

    # Split reason and themes
    reason = response_text
    shared_themes: list[str] = []
    try:
        start = response_text.rfind("[")
        end = response_text.rfind("]") + 1
        if start >= 0:
            shared_themes = json.loads(response_text[start:end])
            reason = response_text[:start].strip()
    except Exception:
        pass

    logger.info(
        "Matchmaking reason generated for %s ↔ %s (score=%.2f)",
        source_name, target_name, body.score,
    )

    response = MatchmakingReasonResponse(
        reason=reason,
        sharedThemes=shared_themes[:5],
    )
    
    # Matchmaking reasons change rarely — cache for 24h
    await cache.set(cache_key, response.model_dump(), ttl=86400)
    
    return response
