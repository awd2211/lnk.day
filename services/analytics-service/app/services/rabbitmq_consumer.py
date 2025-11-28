import json
import asyncio
import logging
from datetime import datetime
from typing import Optional, Callable, Dict, Any
import aio_pika
from aio_pika import IncomingMessage

from app.core.config import settings
from app.core.clickhouse import get_clickhouse_client

logger = logging.getLogger(__name__)

# Exchange and Queue names (should match shared-types)
CLICK_EVENTS_EXCHANGE = "click.events"
LINK_EVENTS_EXCHANGE = "link.events"

ANALYTICS_CLICK_EVENTS_QUEUE = "analytics.click.events"
ANALYTICS_LINK_EVENTS_QUEUE = "analytics.link.events"

# Routing keys
CLICK_RECORDED_KEY = "click.recorded"
CLICK_BATCH_KEY = "click.batch"
LINK_CREATED_KEY = "link.created"
LINK_UPDATED_KEY = "link.updated"
LINK_DELETED_KEY = "link.deleted"


class RabbitMQConsumer:
    def __init__(self):
        self.connection: Optional[aio_pika.Connection] = None
        self.channel: Optional[aio_pika.Channel] = None
        self.clickhouse = get_clickhouse_client()
        self.batch = []
        self.batch_size = 100
        self.flush_interval = 5  # seconds
        self._running = False

    async def connect(self) -> bool:
        """Connect to RabbitMQ"""
        try:
            self.connection = await aio_pika.connect_robust(
                settings.RABBITMQ_URL,
                timeout=10,
            )
            self.channel = await self.connection.channel()
            await self.channel.set_qos(prefetch_count=100)

            # Declare exchanges
            click_exchange = await self.channel.declare_exchange(
                CLICK_EVENTS_EXCHANGE,
                aio_pika.ExchangeType.TOPIC,
                durable=True,
            )
            link_exchange = await self.channel.declare_exchange(
                LINK_EVENTS_EXCHANGE,
                aio_pika.ExchangeType.TOPIC,
                durable=True,
            )

            # Declare and bind click events queue
            click_queue = await self.channel.declare_queue(
                ANALYTICS_CLICK_EVENTS_QUEUE,
                durable=True,
            )
            await click_queue.bind(click_exchange, CLICK_RECORDED_KEY)
            await click_queue.bind(click_exchange, CLICK_BATCH_KEY)

            # Declare and bind link events queue
            link_queue = await self.channel.declare_queue(
                ANALYTICS_LINK_EVENTS_QUEUE,
                durable=True,
            )
            await link_queue.bind(link_exchange, LINK_CREATED_KEY)
            await link_queue.bind(link_exchange, LINK_UPDATED_KEY)
            await link_queue.bind(link_exchange, LINK_DELETED_KEY)

            logger.info("RabbitMQ consumer connected and queues configured")
            return True

        except Exception as e:
            logger.error(f"Failed to connect to RabbitMQ: {e}")
            return False

    async def start(self):
        """Start consuming messages"""
        if not await self.connect():
            logger.warning("RabbitMQ connection failed, consumer not started")
            return

        self._running = True

        # Start periodic flush task
        asyncio.create_task(self._periodic_flush())

        # Start consuming click events
        click_queue = await self.channel.declare_queue(
            ANALYTICS_CLICK_EVENTS_QUEUE,
            durable=True,
        )
        await click_queue.consume(self._on_click_event)

        # Start consuming link events
        link_queue = await self.channel.declare_queue(
            ANALYTICS_LINK_EVENTS_QUEUE,
            durable=True,
        )
        await link_queue.consume(self._on_link_event)

        logger.info("RabbitMQ consumer started consuming messages")

    async def stop(self):
        """Stop the consumer"""
        self._running = False

        # Flush remaining batch
        if self.batch:
            await self._flush_batch()

        if self.channel:
            await self.channel.close()
        if self.connection:
            await self.connection.close()

        logger.info("RabbitMQ consumer stopped")

    async def _on_click_event(self, message: IncomingMessage):
        """Handle click event messages"""
        async with message.process():
            try:
                body = json.loads(message.body.decode())
                event_type = body.get("type", "")

                if event_type == "click.recorded":
                    await self._process_click(body.get("data", {}))
                elif event_type == "click.batch":
                    clicks = body.get("data", {}).get("clicks", [])
                    for click in clicks:
                        await self._process_click(click)

            except Exception as e:
                logger.error(f"Failed to process click event: {e}")

    async def _on_link_event(self, message: IncomingMessage):
        """Handle link event messages"""
        async with message.process():
            try:
                body = json.loads(message.body.decode())
                event_type = body.get("type", "")
                data = body.get("data", {})

                if event_type == "link.created":
                    await self._handle_link_created(data)
                elif event_type == "link.updated":
                    await self._handle_link_updated(data)
                elif event_type == "link.deleted":
                    await self._handle_link_deleted(data)

                logger.debug(f"Processed link event: {event_type}")

            except Exception as e:
                logger.error(f"Failed to process link event: {e}")

    async def _process_click(self, click_data: Dict[str, Any]):
        """Add click to batch for processing"""
        self.batch.append(click_data)

        if len(self.batch) >= self.batch_size:
            await self._flush_batch()

    async def _periodic_flush(self):
        """Periodically flush the batch"""
        while self._running:
            await asyncio.sleep(self.flush_interval)
            if self.batch:
                await self._flush_batch()

    async def _flush_batch(self):
        """Flush batch to ClickHouse"""
        if not self.batch:
            return

        batch_to_insert = self.batch.copy()
        self.batch = []

        try:
            data = []
            for event in batch_to_insert:
                timestamp = event.get("timestamp")
                if isinstance(timestamp, str):
                    try:
                        timestamp = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
                    except ValueError:
                        timestamp = datetime.utcnow()

                data.append({
                    "id": event.get("id", ""),
                    "link_id": event.get("linkId", ""),
                    "short_code": event.get("shortCode", ""),
                    "timestamp": timestamp,
                    "ip": event.get("ip", ""),
                    "user_agent": event.get("userAgent", ""),
                    "referer": event.get("referer", ""),
                    "country": event.get("country", "Unknown"),
                    "region": event.get("region", ""),
                    "city": event.get("city", ""),
                    "device": event.get("device", ""),
                    "browser": event.get("browser", ""),
                    "os": event.get("os", ""),
                })

            self.clickhouse.execute(
                """
                INSERT INTO clicks (id, link_id, short_code, timestamp, ip, user_agent,
                                    referer, country, region, city, device, browser, os)
                VALUES
                """,
                data,
            )
            logger.info(f"Flushed {len(batch_to_insert)} click events to ClickHouse")

        except Exception as e:
            logger.error(f"Failed to flush batch to ClickHouse: {e}")
            # Re-add failed items back to batch
            self.batch = batch_to_insert + self.batch

    async def _handle_link_created(self, data: Dict[str, Any]):
        """Handle link created event - update link metadata cache"""
        link_id = data.get("linkId")
        short_code = data.get("shortCode")
        logger.debug(f"Link created: {short_code} ({link_id})")
        # Could update local cache or pre-populate analytics tables

    async def _handle_link_updated(self, data: Dict[str, Any]):
        """Handle link updated event"""
        link_id = data.get("linkId")
        short_code = data.get("shortCode")
        logger.debug(f"Link updated: {short_code} ({link_id})")

    async def _handle_link_deleted(self, data: Dict[str, Any]):
        """Handle link deleted event"""
        link_id = data.get("linkId")
        short_code = data.get("shortCode")
        logger.debug(f"Link deleted: {short_code} ({link_id})")
        # Could archive or mark analytics data


# Singleton instance
rabbitmq_consumer: Optional[RabbitMQConsumer] = None


def get_rabbitmq_consumer() -> RabbitMQConsumer:
    global rabbitmq_consumer
    if rabbitmq_consumer is None:
        rabbitmq_consumer = RabbitMQConsumer()
    return rabbitmq_consumer
