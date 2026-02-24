"""
cache.py — Redis cache with graceful no-op fallback.

If REDIS_URL is not set (or Redis is unreachable), all cache operations
silently return None / do nothing — the service works without Redis,
just without caching.
"""

import json
from typing import Any
import redis.asyncio as aioredis

from app.config import settings

_redis: aioredis.Redis | None = None


async def init_cache() -> None:
    global _redis
    if not settings.REDIS_URL:
        print("ℹ️  REDIS_URL not set — caching disabled")
        return
    try:
        _redis = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
        await _redis.ping()
        print("✅ Redis connected")
    except Exception as e:
        print(f"⚠️  Redis unavailable ({e}) — caching disabled")
        _redis = None


async def get(key: str) -> Any | None:
    if _redis is None:
        return None
    try:
        value = await _redis.get(key)
        return json.loads(value) if value else None
    except Exception:
        return None


async def set(key: str, value: Any, ttl: int = 300) -> None:
    if _redis is None:
        return
    try:
        await _redis.setex(key, ttl, json.dumps(value, default=str))
    except Exception:
        pass


async def delete(key: str) -> None:
    if _redis is None:
        return
    try:
        await _redis.delete(key)
    except Exception:
        pass


def recommend_events_key(user_id: str) -> str:
    return f"rec:events:{user_id}"


def recommend_orgs_key(org_id: str) -> str:
    return f"rec:orgs:{org_id}"


def search_key(query: str, limit: int) -> str:
    import hashlib
    h = hashlib.md5(f"{query}:{limit}".encode()).hexdigest()[:12]
    return f"search:{h}"
