import json
import logging
from typing import Optional

from aiokafka import AIOKafkaConsumer
from clickhouse_driver import Client

from app.core.config import settings

logger = logging.getLogger(__name__)


class ClickConsumer:
    def __init__(self):
        self.consumer: Optional[AIOKafkaConsumer] = None
        self.running = False
        self.clickhouse = Client(
            host=settings.CLICKHOUSE_HOST,
            port=settings.CLICKHOUSE_PORT,
            database=settings.CLICKHOUSE_DATABASE,
            user=settings.CLICKHOUSE_USER,
            password=settings.CLICKHOUSE_PASSWORD,
        )

    async def start(self):
        self.consumer = AIOKafkaConsumer(
            settings.KAFKA_CLICK_TOPIC,
            bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
            group_id=settings.KAFKA_CONSUMER_GROUP,
            value_deserializer=lambda m: json.loads(m.decode("utf-8")),
        )

        await self.consumer.start()
        self.running = True
        logger.info("Click consumer started")

        try:
            async for msg in self.consumer:
                await self.process_click(msg.value)
        except Exception as e:
            logger.error(f"Consumer error: {e}")
        finally:
            await self.stop()

    async def stop(self):
        self.running = False
        if self.consumer:
            await self.consumer.stop()
            logger.info("Click consumer stopped")

    async def process_click(self, click_data: dict):
        try:
            # Insert into ClickHouse
            self.clickhouse.execute(
                """
                INSERT INTO clicks (
                    id, link_id, short_code, timestamp, ip, user_agent,
                    referer, country, region, city, device, browser, os
                ) VALUES
                """,
                [(
                    click_data.get("id"),
                    click_data.get("link_id"),
                    click_data.get("short_code"),
                    click_data.get("timestamp"),
                    click_data.get("ip"),
                    click_data.get("user_agent"),
                    click_data.get("referer", ""),
                    click_data.get("country", ""),
                    click_data.get("region", ""),
                    click_data.get("city", ""),
                    click_data.get("device", ""),
                    click_data.get("browser", ""),
                    click_data.get("os", ""),
                )]
            )
            logger.debug(f"Processed click: {click_data.get('id')}")
        except Exception as e:
            logger.error(f"Failed to process click: {e}")
