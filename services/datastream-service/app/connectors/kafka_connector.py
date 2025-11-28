"""Kafka connector for data streams."""

import json
import logging
import time
from typing import List, Dict, Any, Optional

from app.models.data_stream import (
    DestinationConfig,
    TestConnectionResult,
    SchemaConfig,
)
from .base import BaseConnector

logger = logging.getLogger(__name__)


class KafkaConnector(BaseConnector):
    """Connector for Apache Kafka."""

    def __init__(self, config: DestinationConfig, schema: Optional[SchemaConfig] = None):
        super().__init__(config, schema)
        self.producer = None

    async def connect(self) -> None:
        """Establish connection to Kafka."""
        try:
            from aiokafka import AIOKafkaProducer

            kafka_config = self.config.kafka
            if not kafka_config:
                raise ValueError("Kafka configuration is required")

            producer_kwargs = {
                "bootstrap_servers": kafka_config.bootstrap_servers,
                "value_serializer": lambda v: json.dumps(v, default=str).encode("utf-8"),
            }

            # Add security configuration if provided
            if kafka_config.security_protocol:
                producer_kwargs["security_protocol"] = kafka_config.security_protocol

            if kafka_config.sasl_mechanism:
                producer_kwargs["sasl_mechanism"] = kafka_config.sasl_mechanism
                producer_kwargs["sasl_plain_username"] = kafka_config.sasl_username
                producer_kwargs["sasl_plain_password"] = kafka_config.sasl_password

            self.producer = AIOKafkaProducer(**producer_kwargs)
            await self.producer.start()

            self._is_connected = True
            logger.info(f"Connected to Kafka: {kafka_config.bootstrap_servers}")

        except ImportError:
            logger.error("aiokafka not installed")
            raise
        except Exception as e:
            logger.error(f"Failed to connect to Kafka: {e}")
            raise

    async def disconnect(self) -> None:
        """Close the Kafka connection."""
        if self.producer:
            await self.producer.stop()
            self.producer = None
            self._is_connected = False
            logger.info("Disconnected from Kafka")

    async def send(self, events: List[Dict[str, Any]]) -> int:
        """Send events to Kafka."""
        if not self._is_connected or not self.producer:
            await self.connect()

        kafka_config = self.config.kafka
        if not kafka_config:
            raise ValueError("Kafka configuration is required")

        sent = 0
        try:
            for event in events:
                transformed = self._transform_event(event)
                await self.producer.send_and_wait(
                    kafka_config.topic,
                    transformed,
                )
                sent += 1

            logger.info(f"Sent {sent} events to Kafka topic: {kafka_config.topic}")
            return sent

        except Exception as e:
            logger.error(f"Failed to send events to Kafka: {e}")
            return sent

    async def test_connection(self) -> TestConnectionResult:
        """Test Kafka connection."""
        start_time = time.time()

        try:
            from aiokafka import AIOKafkaProducer

            kafka_config = self.config.kafka

            producer = AIOKafkaProducer(
                bootstrap_servers=kafka_config.bootstrap_servers,
            )
            await producer.start()
            await producer.stop()

            latency = (time.time() - start_time) * 1000

            return TestConnectionResult(
                success=True,
                message="Connection successful",
                latency_ms=latency,
                details={
                    "bootstrap_servers": kafka_config.bootstrap_servers,
                    "topic": kafka_config.topic,
                },
            )

        except Exception as e:
            latency = (time.time() - start_time) * 1000
            return TestConnectionResult(
                success=False,
                message=f"Connection failed: {str(e)}",
                latency_ms=latency,
            )
