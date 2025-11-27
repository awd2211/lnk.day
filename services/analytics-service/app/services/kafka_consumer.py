import json
import asyncio
import logging
from datetime import datetime
from aiokafka import AIOKafkaConsumer
from app.core.config import settings
from app.core.clickhouse import get_clickhouse_client

logger = logging.getLogger(__name__)


class KafkaClickConsumer:
    def __init__(self):
        self.consumer = None
        self.clickhouse = get_clickhouse_client()
        self.batch = []
        self.batch_size = 100
        self.flush_interval = 5  # seconds

    async def start(self):
        self.consumer = AIOKafkaConsumer(
            "click-events",
            bootstrap_servers=settings.KAFKA_BROKERS,
            group_id="analytics-service",
            value_deserializer=lambda m: json.loads(m.decode("utf-8")),
            auto_offset_reset="earliest",
        )
        await self.consumer.start()
        logger.info("Kafka consumer started")

        # Start background flush task
        asyncio.create_task(self._periodic_flush())

        try:
            async for msg in self.consumer:
                await self._process_message(msg.value)
        finally:
            await self.stop()

    async def stop(self):
        if self.consumer:
            await self.consumer.stop()
            logger.info("Kafka consumer stopped")

    async def _process_message(self, click_event: dict):
        """Process a click event message"""
        self.batch.append(click_event)

        if len(self.batch) >= self.batch_size:
            await self._flush_batch()

    async def _periodic_flush(self):
        """Periodically flush the batch"""
        while True:
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
                    timestamp = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))

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


async def run_consumer():
    consumer = KafkaClickConsumer()
    await consumer.start()
