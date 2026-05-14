"""
routers/embed.py — POST /embed/event and POST /embed/org

Receives a text payload from Next.js (via JobQueue), generates an embedding
using SentenceTransformer, and saves it to the PostgreSQL vector column.

Only callable with a master JWT (ENTERPRISE tier gate enforced by auth middleware,
but embed is only triggered by the Next.js job runner — not exposed to tenants).
"""

import logging
from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.middleware.auth import ApiTier, require_auth
from app.embeddings import encode
from app.database import save_event_embedding, save_org_embedding
from app import cache

logger = logging.getLogger(__name__)
router = APIRouter()


class EmbedEventRequest(BaseModel):
    eventId: str
    text: str    # pre-built text: f"{title}. {description}. Category: {category}. Tags: {tags}"


class EmbedOrgRequest(BaseModel):
    orgId: str
    text: str    # pre-built text: f"{name}. {description}. Industry: {industry}. Size: {size}"


class EmbedResponse(BaseModel):
    ok: bool
    dimensions: int = 384


@router.post("/event", response_model=EmbedResponse)
async def embed_event(
    body: EmbedEventRequest,
    _tier: ApiTier = Depends(require_auth),
) -> EmbedResponse:
    """Generate and store embedding for an event. Called by Next.js job runner."""
    vector = encode(body.text)
    await save_event_embedding(body.eventId, vector)

    # Invalidate any cached recommendations that might have this event
    # (broad invalidation — fine for current scale)
    await cache.delete(f"event_emb:{body.eventId}")

    logger.info("Embedding updated for event=%s", body.eventId)
    return EmbedResponse(ok=True, dimensions=len(vector))


@router.post("/org", response_model=EmbedResponse)
async def embed_org(
    body: EmbedOrgRequest,
    _tier: ApiTier = Depends(require_auth),
) -> EmbedResponse:
    """Generate and store embedding for an organization. Called by Next.js job runner."""
    vector = encode(body.text)
    await save_org_embedding(body.orgId, vector)

    await cache.delete(f"org_emb:{body.orgId}")

    logger.info("Embedding updated for org=%s", body.orgId)
    return EmbedResponse(ok=True, dimensions=len(vector))
