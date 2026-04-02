"""
routers/search.py — POST /search/semantic

ENTERPRISE tier only.

Encodes the user's query string into a vector, then runs cosine similarity
search against the Events table to return semantically relevant results.

Unlike keyword search (which requires exact word matching), semantic search
understands intent — e.g. "cloud computing meetup" matches events tagged
"AWS", "DevOps", "SaaS" even if those words aren't in the query.
"""

import logging
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.middleware.auth import ApiTier, require_auth
from app.embeddings import encode
from app.database import find_similar_events
from app.config import settings
from app import cache
from app.database import get_pool

logger = logging.getLogger(__name__)
router = APIRouter()


class SemanticSearchRequest(BaseModel):
    query: str = Field(..., min_length=2, max_length=500)
    limit: int = Field(default=10, ge=1, le=50)


class SearchResult(BaseModel):
    eventId: str
    title: str
    score: float
    snippet: str          # first 120 chars of description


class SemanticSearchResponse(BaseModel):
    query: str
    results: list[SearchResult]
    count: int


@router.post("/semantic", response_model=SemanticSearchResponse)
async def semantic_search(
    body: SemanticSearchRequest,
    _tier: ApiTier = Depends(require_auth),
) -> SemanticSearchResponse:

    cache_key = cache.search_key(body.query, body.limit)
    cached = await cache.get(cache_key)
    if cached:
        return SemanticSearchResponse(**cached)

    query_vector = encode(body.query)

    rows = await find_similar_events(vector=query_vector, limit=body.limit)

    pool = get_pool()
    event_ids = [str(r["id"]) for r in rows]

    snippets: dict[str, str] = {}
    if event_ids:
        async with pool.acquire() as conn:
            desc_rows = await conn.fetch(
                'SELECT id, description FROM "Events" WHERE id = ANY($1::uuid[])',
                event_ids,
            )
        snippets = {str(r["id"]): (r["description"] or "")[:120] for r in desc_rows}

    results = [
        SearchResult(
            eventId=str(row["id"]),
            title=row["title"],
            score=round(float(row["score"]), 4),
            snippet=snippets.get(str(row["id"]), ""),
        )
        for row in rows
        if float(row["score"]) >= 0.3  # minimum relevance threshold
    ]

    response = SemanticSearchResponse(
        query=body.query,
        results=results,
        count=len(results),
    )
    await cache.set(cache_key, response.model_dump(), ttl=settings.SEARCH_CACHE_TTL)

    logger.info("Semantic search for '%s' -> %d results found (threshold 0.3)", body.query, len(results))
    return response
