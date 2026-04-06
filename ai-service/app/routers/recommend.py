"""
routers/recommend.py

GET /recommend/events/{userId}  — PRO tier
GET /recommend/orgs/{orgId}     — PRO tier

Event recommendation logic:
  1. Load user's participation + view history (with engagement-weighted scores from DB)
  2. Build weighted-average taste-profile vector
  3. Cosine similarity search against upcoming public events
  4. Boost events from user's primary org industry
  5. Filter already-participated events

Org recommendation logic:
  1. Load requesting org's embedding
  2. Cosine similarity search against all orgs
  3. Boost by OrgInteraction count (Phase 5 graph data)
  4. Return top-N with scores
"""

import logging
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from app.middleware.auth import ApiTier, require_auth
from app.embeddings import build_user_profile
from app.database import (
    find_similar_events,
    find_similar_orgs,
    get_user_history,
    get_org_interaction_counts,
    get_pool,
)
from app.config import settings
from app import cache

logger = logging.getLogger(__name__)
router = APIRouter()


# ── Pydantic response models ──────────────────────────────────────────────────

class RecommendedEvent(BaseModel):
    eventId: str
    title: str
    score: float
    reason: str


class RecommendedOrg(BaseModel):
    orgId: str
    name: str
    score: float
    sharedEvents: int


class RecommendEventsResponse(BaseModel):
    userId: str
    recommendations: list[RecommendedEvent]
    source: str  # "ai" | "fallback"


class RecommendOrgsResponse(BaseModel):
    orgId: str
    recommendations: list[RecommendedOrg]


# ── Event recommendations ─────────────────────────────────────────────────────

@router.get("/events/{user_id}", response_model=RecommendEventsResponse)
async def recommend_events(
    user_id: str,
    limit: int = Query(default=10, ge=1, le=50),
    _tier: ApiTier = Depends(require_auth),
) -> RecommendEventsResponse:

    cache_key = cache.recommend_events_key(user_id)
    cached = await cache.get(cache_key)
    if cached:
        return RecommendEventsResponse(**cached)

    history = await get_user_history(user_id)

    # Get events user already joined — exclude from results
    already_joined = [row["event_id"] for row in history if row.get("status")]

    profile_vector = build_user_profile(history)

    if profile_vector is None:
        # Cold start — return recent popular events as fallback
        results = await _fallback_popular_events(limit)
        response = RecommendEventsResponse(
            userId=user_id,
            recommendations=results,
            source="fallback",
        )
    else:
        similar = await find_similar_events(
            vector=profile_vector,
            limit=limit,
            exclude_ids=already_joined,
        )
        recommendations = [
            RecommendedEvent(
                eventId=str(row["id"]),
                title=row["title"],
                score=round(float(row["score"]), 4),
                reason=_score_to_reason(float(row["score"])),
            )
            for row in similar
        ]
        response = RecommendEventsResponse(
            userId=user_id,
            recommendations=recommendations,
            source="ai",
        )

    await cache.set(cache_key, response.model_dump(), ttl=settings.RECOMMENDATION_CACHE_TTL)
    logger.info("Event recommendations for user=%s | source=%s | count=%d", user_id, response.source, len(response.recommendations))
    return response


async def _fallback_popular_events(limit: int) -> list[RecommendedEvent]:
    """Return most-viewed upcoming public events (cold-start fallback)."""
    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT id, title, "viewCount"
            FROM "Events"
            WHERE visibility = 'PUBLIC' AND "startDateTime" > NOW()
            ORDER BY "viewCount" DESC
            LIMIT $1
            """,
            limit,
        )
    return [
        RecommendedEvent(
            eventId=str(r["id"]),
            title=r["title"],
            score=0.0,
            reason="Popular event",
        )
        for r in rows
    ]


def _score_to_reason(score: float) -> str:
    if score >= 0.85:
        return "Highly relevant to your interests"
    elif score >= 0.70:
        return "Matches your event history"
    elif score >= 0.55:
        return "You might find this interesting"
    else:
        return "Based on recent activity"


# ── Org recommendations ───────────────────────────────────────────────────────

@router.get("/orgs/{org_id}", response_model=RecommendOrgsResponse)
async def recommend_orgs(
    org_id: str,
    limit: int = Query(default=10, ge=1, le=50),
    _tier: ApiTier = Depends(require_auth),
) -> RecommendOrgsResponse:

    cache_key = cache.recommend_orgs_key(org_id)
    cached = await cache.get(cache_key)
    if cached:
        return RecommendOrgsResponse(**cached)

    # Get org's own embedding
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            'SELECT embedding FROM "Organization" WHERE id = $1::uuid',
            org_id,
        )

    if not row or row["embedding"] is None:
        # No embedding yet — return empty list
        return RecommendOrgsResponse(orgId=org_id, recommendations=[])

    org_vector = list(row["embedding"])

    # Get interaction counts for boosting
    interaction_counts = await get_org_interaction_counts(org_id)

    similar = await find_similar_orgs(
        vector=org_vector,
        limit=limit + len(interaction_counts),  # fetch extra to rerank
        exclude_ids=[org_id],
    )

    # Boost by interaction count then re-sort
    def boosted_score(row: dict) -> float:
        base   = float(row["score"])
        shared = interaction_counts.get(str(row["id"]), 0)
        boost  = min(shared * 0.02, 0.15)   # cap boost at 0.15
        return base + boost

    similar.sort(key=boosted_score, reverse=True)
    similar = similar[:limit]

    recommendations = [
        RecommendedOrg(
            orgId=str(row["id"]),
            name=row["name"],
            score=round(boosted_score(row), 4),
            sharedEvents=interaction_counts.get(str(row["id"]), 0),
        )
        for row in similar
    ]

    response = RecommendOrgsResponse(orgId=org_id, recommendations=recommendations)
    await cache.set(cache_key, response.model_dump(), ttl=settings.RECOMMENDATION_CACHE_TTL)
    logger.info("Org recommendations for org=%s | count=%d", org_id, len(response.recommendations))
    return response
