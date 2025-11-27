import uuid
import logging
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from user_agents import parse as parse_user_agent

logger = logging.getLogger(__name__)

router = APIRouter()


class ClickEvent(BaseModel):
    link_id: str
    short_code: str
    ip: str
    user_agent: str
    referer: Optional[str] = None
    timestamp: Optional[datetime] = None
    country: Optional[str] = None
    region: Optional[str] = None
    city: Optional[str] = None


def parse_device_info(user_agent_string: str) -> dict:
    """Parse user agent to extract device info"""
    ua = parse_user_agent(user_agent_string)
    return {
        "device": "mobile" if ua.is_mobile else "tablet" if ua.is_tablet else "desktop",
        "browser": f"{ua.browser.family} {ua.browser.version_string}",
        "os": f"{ua.os.family} {ua.os.version_string}",
    }


@router.post("/click")
async def record_click(event: ClickEvent, request: Request):
    """Record a click event and send to Kafka"""
    try:
        producer = request.app.state.click_producer

        if not producer or not producer.producer:
            logger.warning("Kafka producer not available")
            raise HTTPException(status_code=503, detail="Stream service unavailable")

        # Parse device info
        device_info = parse_device_info(event.user_agent)

        # Prepare click data
        click_data = {
            "id": str(uuid.uuid4()),
            "link_id": event.link_id,
            "short_code": event.short_code,
            "timestamp": (event.timestamp or datetime.utcnow()).isoformat(),
            "ip": event.ip,
            "user_agent": event.user_agent,
            "referer": event.referer or "",
            "country": event.country or "",
            "region": event.region or "",
            "city": event.city or "",
            **device_info,
        }

        # Send to Kafka
        await producer.send_click(click_data)
        logger.debug(f"Click event sent to Kafka: {click_data['id']}")

        return {"status": "ok", "id": click_data["id"]}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to record click: {e}")
        raise HTTPException(status_code=500, detail="Failed to record click event")


@router.get("/status")
async def get_stream_status(request: Request):
    """Get stream processing status"""
    producer = getattr(request.app.state, "click_producer", None)
    kafka_connected = producer is not None and producer.producer is not None

    return {
        "kafka_connected": kafka_connected,
        "clickhouse_connected": True,
        "messages_processed": 0,
        "messages_failed": 0,
    }
