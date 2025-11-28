"""Base connector interface for data streams."""

from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from datetime import datetime
import logging

from app.models.data_stream import (
    DestinationConfig,
    TestConnectionResult,
    SchemaConfig,
)

logger = logging.getLogger(__name__)


class BaseConnector(ABC):
    """Base class for all data stream connectors."""

    def __init__(self, config: DestinationConfig, schema: Optional[SchemaConfig] = None):
        self.config = config
        self.schema = schema
        self._is_connected = False

    @abstractmethod
    async def connect(self) -> None:
        """Establish connection to the destination."""
        pass

    @abstractmethod
    async def disconnect(self) -> None:
        """Close the connection."""
        pass

    @abstractmethod
    async def send(self, events: List[Dict[str, Any]]) -> int:
        """
        Send events to the destination.
        Returns the number of successfully sent events.
        """
        pass

    @abstractmethod
    async def test_connection(self) -> TestConnectionResult:
        """Test the connection to the destination."""
        pass

    async def send_batch(
        self,
        events: List[Dict[str, Any]],
        batch_size: int = 1000,
    ) -> Dict[str, int]:
        """
        Send events in batches.
        Returns a dict with 'sent' and 'failed' counts.
        """
        sent = 0
        failed = 0

        for i in range(0, len(events), batch_size):
            batch = events[i:i + batch_size]
            try:
                count = await self.send(batch)
                sent += count
                failed += len(batch) - count
            except Exception as e:
                logger.error(f"Failed to send batch: {e}")
                failed += len(batch)

        return {"sent": sent, "failed": failed}

    def _transform_event(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Transform event based on schema configuration."""
        if not self.schema or self.schema.mode == "auto":
            return event

        # Apply custom schema transformations
        transformed = {}
        for field in self.schema.fields:
            if field.name in event:
                transformed[field.name] = self._cast_value(
                    event[field.name],
                    field.type
                )
        return transformed

    def _cast_value(self, value: Any, target_type: str) -> Any:
        """Cast value to target type."""
        if value is None:
            return None

        type_mapping = {
            "STRING": str,
            "INT64": int,
            "FLOAT64": float,
            "BOOLEAN": bool,
            "TIMESTAMP": lambda v: datetime.fromisoformat(v) if isinstance(v, str) else v,
        }

        cast_func = type_mapping.get(target_type.upper())
        if cast_func:
            try:
                return cast_func(value)
            except (ValueError, TypeError):
                return value
        return value

    @property
    def is_connected(self) -> bool:
        return self._is_connected
