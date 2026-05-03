import hashlib
import json

import redis.asyncio as aioredis

from core.config import settings

_client: aioredis.Redis | None = None


async def connect() -> None:
    global _client
    _client = aioredis.from_url(settings.redis_url, decode_responses=True)


async def disconnect() -> None:
    if _client:
        await _client.aclose()


def get_client() -> aioredis.Redis:
    if _client is None:
        raise RuntimeError("Redis client is not initialized")
    return _client


def _normalize_payload(payload: dict) -> dict:
    members = payload.get("members") or []
    normalized_members = [
        {
            **m,
            "skills": sorted(m.get("skills") or []),
        }
        for m in members
    ]
    normalized_members.sort(key=lambda m: (m.get("position", ""), m.get("experience_years", 0.0)))
    return {**payload, "members": normalized_members}


def make_cache_key(payload: dict) -> str:
    """Stable SHA-256 key from a normalized, sorted JSON of the request payload."""
    normalized = _normalize_payload(payload)
    serialized = json.dumps(normalized, sort_keys=True, ensure_ascii=False)
    return "recommend:" + hashlib.sha256(serialized.encode()).hexdigest()


async def get_cached(key: str) -> dict | None:
    value = await get_client().get(key)
    if value is None:
        return None
    return json.loads(value)


async def set_cached(key: str, data: dict) -> None:
    await get_client().set(key, json.dumps(data), ex=settings.cache_ttl_seconds)
