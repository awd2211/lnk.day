import json
from typing import Optional

from aiokafka import AIOKafkaProducer

from app.core.config import settings


class ClickProducer:
    def __init__(self):
        self.producer: Optional[AIOKafkaProducer] = None

    async def start(self):
        self.producer = AIOKafkaProducer(
            bootstrap_servers=settings.KAFKA_BOOTSTRAP_SERVERS,
            value_serializer=lambda v: json.dumps(v).encode("utf-8"),
        )
        await self.producer.start()

    async def stop(self):
        if self.producer:
            await self.producer.stop()

    async def send_click(self, click_data: dict):
        if self.producer:
            await self.producer.send_and_wait(
                settings.KAFKA_CLICK_TOPIC,
                click_data,
            )
