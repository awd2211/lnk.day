"""HTTP/Webhook connector for data streams."""

import json
import logging
import time
import base64
from typing import List, Dict, Any, Optional

from app.models.data_stream import (
    DestinationConfig,
    TestConnectionResult,
    SchemaConfig,
)
from .base import BaseConnector

logger = logging.getLogger(__name__)


class HTTPConnector(BaseConnector):
    """Connector for HTTP/Webhook endpoints."""

    def __init__(self, config: DestinationConfig, schema: Optional[SchemaConfig] = None):
        super().__init__(config, schema)
        self.session = None

    async def connect(self) -> None:
        """Establish HTTP session."""
        try:
            import aiohttp

            http_config = self.config.http
            if not http_config:
                raise ValueError("HTTP configuration is required")

            timeout = aiohttp.ClientTimeout(total=http_config.timeout_seconds)
            self.session = aiohttp.ClientSession(timeout=timeout)

            self._is_connected = True
            logger.info(f"HTTP connector ready for: {http_config.url}")

        except ImportError:
            logger.error("aiohttp not installed")
            raise
        except Exception as e:
            logger.error(f"Failed to create HTTP session: {e}")
            raise

    async def disconnect(self) -> None:
        """Close the HTTP session."""
        if self.session:
            await self.session.close()
            self.session = None
            self._is_connected = False
            logger.info("HTTP session closed")

    async def send(self, events: List[Dict[str, Any]]) -> int:
        """Send events to HTTP endpoint."""
        if not self._is_connected or not self.session:
            await self.connect()

        http_config = self.config.http
        if not http_config:
            raise ValueError("HTTP configuration is required")

        try:
            # Transform events
            transformed_events = [self._transform_event(event) for event in events]

            # Build headers
            headers = dict(http_config.headers)
            headers["Content-Type"] = "application/json"

            # Add authentication
            if http_config.auth_type == "basic" and http_config.auth_value:
                encoded = base64.b64encode(http_config.auth_value.encode()).decode()
                headers["Authorization"] = f"Basic {encoded}"
            elif http_config.auth_type == "bearer" and http_config.auth_value:
                headers["Authorization"] = f"Bearer {http_config.auth_value}"
            elif http_config.auth_type == "api_key" and http_config.auth_value:
                headers["X-API-Key"] = http_config.auth_value

            # Send request
            payload = {
                "events": transformed_events,
                "count": len(transformed_events),
                "timestamp": time.time(),
            }

            retry_count = 0
            last_error = None

            while retry_count <= http_config.retry_count:
                try:
                    async with self.session.request(
                        method=http_config.method,
                        url=http_config.url,
                        json=payload,
                        headers=headers,
                    ) as response:
                        if response.status >= 200 and response.status < 300:
                            logger.info(
                                f"Sent {len(events)} events to {http_config.url}, "
                                f"status: {response.status}"
                            )
                            return len(events)
                        elif response.status >= 500:
                            # Server error, retry
                            last_error = f"Server error: {response.status}"
                            retry_count += 1
                            continue
                        else:
                            # Client error, don't retry
                            body = await response.text()
                            logger.error(
                                f"HTTP request failed: {response.status}, body: {body}"
                            )
                            return 0

                except Exception as e:
                    last_error = str(e)
                    retry_count += 1

            logger.error(f"Failed to send after {http_config.retry_count} retries: {last_error}")
            return 0

        except Exception as e:
            logger.error(f"Failed to send events to HTTP endpoint: {e}")
            raise

    async def test_connection(self) -> TestConnectionResult:
        """Test HTTP connection."""
        start_time = time.time()

        try:
            import aiohttp

            http_config = self.config.http

            timeout = aiohttp.ClientTimeout(total=10)
            async with aiohttp.ClientSession(timeout=timeout) as session:
                # Send a test request (HEAD or OPTIONS if available)
                headers = dict(http_config.headers)
                if http_config.auth_type == "bearer" and http_config.auth_value:
                    headers["Authorization"] = f"Bearer {http_config.auth_value}"
                elif http_config.auth_type == "api_key" and http_config.auth_value:
                    headers["X-API-Key"] = http_config.auth_value

                async with session.head(http_config.url, headers=headers) as response:
                    latency = (time.time() - start_time) * 1000

                    if response.status >= 200 and response.status < 400:
                        return TestConnectionResult(
                            success=True,
                            message="Connection successful",
                            latency_ms=latency,
                            details={
                                "url": http_config.url,
                                "status_code": response.status,
                            },
                        )
                    else:
                        return TestConnectionResult(
                            success=False,
                            message=f"Server returned status: {response.status}",
                            latency_ms=latency,
                            details={
                                "url": http_config.url,
                                "status_code": response.status,
                            },
                        )

        except Exception as e:
            latency = (time.time() - start_time) * 1000
            return TestConnectionResult(
                success=False,
                message=f"Connection failed: {str(e)}",
                latency_ms=latency,
            )
