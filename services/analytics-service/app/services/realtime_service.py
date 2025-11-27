import json
from datetime import datetime, timedelta
from typing import Optional
import redis.asyncio as redis
from app.core.config import settings


class RealtimeService:
    def __init__(self):
        self.redis: Optional[redis.Redis] = None

    async def connect(self):
        self.redis = redis.from_url(settings.REDIS_URL)

    async def close(self):
        if self.redis:
            await self.redis.close()

    async def record_click(self, link_id: str, team_id: str):
        """Record a click for realtime stats"""
        now = datetime.now()
        minute_key = f"clicks:minute:{link_id}:{now.strftime('%Y%m%d%H%M')}"
        hour_key = f"clicks:hour:{link_id}:{now.strftime('%Y%m%d%H')}"
        day_key = f"clicks:day:{link_id}:{now.strftime('%Y%m%d')}"

        pipe = self.redis.pipeline()

        # Increment counters
        pipe.incr(minute_key)
        pipe.expire(minute_key, 300)  # 5 minutes

        pipe.incr(hour_key)
        pipe.expire(hour_key, 7200)  # 2 hours

        pipe.incr(day_key)
        pipe.expire(day_key, 172800)  # 2 days

        # Track active visitors (using sorted set with timestamp as score)
        visitor_key = f"visitors:{link_id}"
        pipe.zadd(visitor_key, {f"visit:{now.timestamp()}": now.timestamp()})
        pipe.zremrangebyscore(visitor_key, 0, (now - timedelta(minutes=5)).timestamp())
        pipe.expire(visitor_key, 600)

        # Team aggregates
        team_minute_key = f"team:clicks:minute:{team_id}:{now.strftime('%Y%m%d%H%M')}"
        team_hour_key = f"team:clicks:hour:{team_id}:{now.strftime('%Y%m%d%H')}"

        pipe.incr(team_minute_key)
        pipe.expire(team_minute_key, 300)

        pipe.incr(team_hour_key)
        pipe.expire(team_hour_key, 7200)

        await pipe.execute()

    async def get_realtime_stats(self, link_id: str) -> dict:
        """Get realtime statistics for a link"""
        now = datetime.now()

        # Get current minute clicks
        minute_key = f"clicks:minute:{link_id}:{now.strftime('%Y%m%d%H%M')}"
        clicks_this_minute = await self.redis.get(minute_key)

        # Get clicks from last 5 minutes
        clicks_last_5_min = 0
        for i in range(5):
            ts = now - timedelta(minutes=i)
            key = f"clicks:minute:{link_id}:{ts.strftime('%Y%m%d%H%M')}"
            val = await self.redis.get(key)
            if val:
                clicks_last_5_min += int(val)

        # Get current hour clicks
        hour_key = f"clicks:hour:{link_id}:{now.strftime('%Y%m%d%H')}"
        clicks_this_hour = await self.redis.get(hour_key)

        # Get active visitors
        visitor_key = f"visitors:{link_id}"
        active_visitors = await self.redis.zcard(visitor_key)

        return {
            "link_id": link_id,
            "active_visitors": active_visitors,
            "clicks_this_minute": int(clicks_this_minute) if clicks_this_minute else 0,
            "clicks_last_5_minutes": clicks_last_5_min,
            "clicks_this_hour": int(clicks_this_hour) if clicks_this_hour else 0,
            "timestamp": now.isoformat(),
        }

    async def get_team_realtime_stats(self, team_id: str) -> dict:
        """Get realtime statistics for a team"""
        now = datetime.now()

        # Get current minute clicks
        minute_key = f"team:clicks:minute:{team_id}:{now.strftime('%Y%m%d%H%M')}"
        clicks_this_minute = await self.redis.get(minute_key)

        # Get clicks from last 5 minutes
        clicks_last_5_min = 0
        for i in range(5):
            ts = now - timedelta(minutes=i)
            key = f"team:clicks:minute:{team_id}:{ts.strftime('%Y%m%d%H%M')}"
            val = await self.redis.get(key)
            if val:
                clicks_last_5_min += int(val)

        # Get current hour clicks
        hour_key = f"team:clicks:hour:{team_id}:{now.strftime('%Y%m%d%H')}"
        clicks_this_hour = await self.redis.get(hour_key)

        return {
            "team_id": team_id,
            "clicks_this_minute": int(clicks_this_minute) if clicks_this_minute else 0,
            "clicks_last_5_minutes": clicks_last_5_min,
            "clicks_this_hour": int(clicks_this_hour) if clicks_this_hour else 0,
            "timestamp": now.isoformat(),
        }


realtime_service = RealtimeService()
