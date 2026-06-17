"""
Redis 缓存工具
"""
import json
from typing import Any, Optional

import redis.asyncio as aioredis
from loguru import logger

from app.config import get_settings

settings = get_settings()

redis_client: Optional[aioredis.Redis] = None


async def get_redis() -> aioredis.Redis:
    global redis_client
    if redis_client is None:
        redis_client = aioredis.from_url(
            settings.REDIS_URL, decode_responses=True
        )
    return redis_client


async def cache_get(key: str) -> Optional[Any]:
    try:
        r = await get_redis()
        data = await r.get(key)
        if data:
            return json.loads(data)
        return None
    except Exception as e:
        logger.warning(f"Cache get error: {e}")
        return None


async def cache_set(key: str, value: Any, ttl: int = None):
    try:
        r = await get_redis()
        ttl = ttl or settings.CACHE_TTL
        await r.set(key, json.dumps(value, default=str), ex=ttl)
    except Exception as e:
        logger.warning(f"Cache set error: {e}")


async def cache_delete(pattern: str):
    try:
        r = await get_redis()
        keys = await r.keys(pattern)
        if keys:
            await r.delete(*keys)
    except Exception as e:
        logger.warning(f"Cache delete error: {e}")


async def close_redis():
    global redis_client
    if redis_client:
        await redis_client.close()
        redis_client = None
