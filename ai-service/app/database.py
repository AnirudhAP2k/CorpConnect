"""
database.py — asyncpg connection pool + pgvector raw SQL helpers.

We use raw asyncpg (not SQLAlchemy ORM) to keep dependencies minimal and
have full control over vector queries.
"""

from typing import Optional
import asyncpg
try:
    from pgvector.asyncpg import register_vector
    PGVECTOR_AVAILABLE = True
except ImportError:
    PGVECTOR_AVAILABLE = False

from app.config import settings

# Module-level pool — initialised in lifespan
_pool: Optional[asyncpg.Pool] = None


async def init_db_pool() -> None:
    global _pool
    _pool = await asyncpg.create_pool(
        dsn=settings.DATABASE_URL,
        min_size=2,
        max_size=5,          # keep low — AI service should not starve the Next.js app
        command_timeout=30,
        init=_init_connection,
    )
    print("✅ DB pool initialised")


async def _init_connection(conn: asyncpg.Connection) -> None:
    """Register pgvector codec on each new connection (if extension is installed)."""
    if not PGVECTOR_AVAILABLE:
        return
    try:
        await register_vector(conn)
    except ValueError as e:
        # pgvector extension not installed in DB yet — run scripts/enable-pgvector.ts
        print(f"⚠️  pgvector not available ({e}). Recommendations and search will be disabled.")
        print("   Run: npx tsx scripts/enable-pgvector.ts  (from the Next.js project root)")


async def close_db_pool() -> None:
    global _pool
    if _pool:
        await _pool.close()
        _pool = None


def get_pool() -> asyncpg.Pool:
    if _pool is None:
        raise RuntimeError("DB pool not initialised — call init_db_pool() first")
    return _pool


async def save_event_embedding(event_id: str, embedding: list[float]) -> None:
    pool = get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            'UPDATE "Events" SET embedding = $1 WHERE id = $2::uuid',
            embedding,
            event_id,
        )


async def save_org_embedding(org_id: str, embedding: list[float]) -> None:
    pool = get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            'UPDATE "Organization" SET embedding = $1 WHERE id = $2::uuid',
            embedding,
            org_id,
        )


async def find_similar_events(
    vector: list[float],
    limit: int = 10,
    exclude_ids: list[str] | None = None,
) -> list[dict]:
    """Return events ranked by cosine similarity to vector."""
    pool = get_pool()
    exclude_ids = exclude_ids or []
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT
                e.id,
                e.title,
                e."categoryId",
                e."organizationId",
                e."startDateTime",
                e."eventType",
                e."visibility",
                1 - (e.embedding <=> $1) AS score
            FROM "Events" e
            WHERE
                e.embedding IS NOT NULL
                AND e.visibility = 'PUBLIC'
                AND e."startDateTime" > NOW()
                AND e.id != ALL($2::uuid[])
            ORDER BY e.embedding <=> $1
            LIMIT $3
            """,
            vector,
            exclude_ids,
            limit,
        )
    return [dict(r) for r in rows]


async def find_similar_orgs(
    vector: list[float],
    limit: int = 10,
    exclude_ids: list[str] | None = None,
) -> list[dict]:
    """Return orgs ranked by cosine similarity to vector."""
    pool = get_pool()
    exclude_ids = exclude_ids or []
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT
                o.id,
                o.name,
                o."industryId",
                o.size,
                o.logo,
                1 - (o.embedding <=> $1) AS score
            FROM "Organization" o
            WHERE
                o.embedding IS NOT NULL
                AND o.id != ALL($2::uuid[])
            ORDER BY o.embedding <=> $1
            LIMIT $3
            """,
            vector,
            exclude_ids,
            limit,
        )
    return [dict(r) for r in rows]


async def get_user_history(user_id: str) -> list[dict]:
    """Fetch user's participation + view history with event embeddings."""
    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT
                e.id        AS event_id,
                e.embedding,
                ep.status,
                COALESCE(ev.duration_seconds, 0) AS duration_seconds,
                CASE
                    WHEN ep.status = 'ATTENDED'                THEN 1.0
                    WHEN ep.status = 'REGISTERED'              THEN 0.7
                    WHEN COALESCE(ev.duration_seconds,0) > 60  THEN 0.5
                    ELSE 0.2
                END AS weight
            FROM "Events" e
            LEFT JOIN "EventParticipation" ep ON ep."eventId" = e.id AND ep."userId" = $1::uuid
            LEFT JOIN (
                SELECT "eventId", MAX("durationSeconds") AS duration_seconds
                FROM "EventView"
                WHERE "userId" = $1::uuid
                GROUP BY "eventId"
            ) ev ON ev."eventId" = e.id
            WHERE (ep."userId" = $1::uuid OR ev."eventId" IS NOT NULL)
              AND e.embedding IS NOT NULL
            """,
            user_id,
        )
    return [dict(r) for r in rows]


async def get_org_interaction_counts(org_id: str) -> dict[str, int]:
    """Return {targetOrgId: sharedEventCount} for an org, for boosting recommendations."""
    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT "targetOrgId"::text, COUNT(*) AS cnt
            FROM "OrgInteraction"
            WHERE "sourceOrgId" = $1::uuid
            GROUP BY "targetOrgId"
            """,
            org_id,
        )
    return {r["targetOrgId"]: r["cnt"] for r in rows}


async def get_api_credential(tenant_id: str) -> dict | None:
    """Fetch ApiCredential by tenantId."""
    pool = get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT id, "apiKey", tier, "usageCount", "usageLimit", "lastUsedAt"
            FROM "ApiCredential"
            WHERE "tenantId" = $1::uuid
            """,
            tenant_id,
        )
    return dict(row) if row else None


async def increment_usage(tenant_id: str) -> None:
    """Increment usageCount and update lastUsedAt for a tenant."""
    pool = get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            """
            UPDATE "ApiCredential"
            SET "usageCount" = "usageCount" + 1, "lastUsedAt" = NOW()
            WHERE "tenantId" = $1::uuid
            """,
            tenant_id,
        )
