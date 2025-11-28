"""Snowflake connector for data streams."""

import json
import logging
import time
from datetime import datetime
from typing import List, Dict, Any, Optional

from app.models.data_stream import (
    DestinationConfig,
    TestConnectionResult,
    SchemaConfig,
)
from .base import BaseConnector

logger = logging.getLogger(__name__)


class SnowflakeConnector(BaseConnector):
    """Connector for Snowflake data warehouse."""

    def __init__(self, config: DestinationConfig, schema: Optional[SchemaConfig] = None):
        super().__init__(config, schema)
        self.connection = None
        self.cursor = None

    async def connect(self) -> None:
        """Establish connection to Snowflake."""
        try:
            import snowflake.connector

            sf_config = self.config.snowflake
            if not sf_config:
                raise ValueError("Snowflake configuration is required")

            self.connection = snowflake.connector.connect(
                account=sf_config.account,
                user=sf_config.user,
                password=sf_config.password,
                database=sf_config.database,
                schema=sf_config.schema_name,
                warehouse=sf_config.warehouse,
                role=sf_config.role if sf_config.role else None,
            )
            self.cursor = self.connection.cursor()
            self._is_connected = True
            logger.info(f"Connected to Snowflake: {sf_config.account}")

        except ImportError:
            logger.error("snowflake-connector-python not installed")
            raise
        except Exception as e:
            logger.error(f"Failed to connect to Snowflake: {e}")
            raise

    async def disconnect(self) -> None:
        """Close the Snowflake connection."""
        if self.cursor:
            self.cursor.close()
            self.cursor = None
        if self.connection:
            self.connection.close()
            self.connection = None
        self._is_connected = False
        logger.info("Disconnected from Snowflake")

    async def send(self, events: List[Dict[str, Any]]) -> int:
        """Send events to Snowflake."""
        if not self._is_connected or not self.cursor:
            await self.connect()

        sf_config = self.config.snowflake
        if not sf_config or not events:
            return 0

        try:
            # Transform events
            transformed = [self._transform_event(event) for event in events]

            # Get column names from first event
            columns = list(transformed[0].keys())

            # Prepare insert statement
            placeholders = ", ".join(["%s"] * len(columns))
            insert_sql = f"""
                INSERT INTO {sf_config.table_name} ({', '.join(columns)})
                VALUES ({placeholders})
            """

            # Convert to list of tuples
            rows = [
                tuple(self._serialize_value(row.get(col)) for col in columns)
                for row in transformed
            ]

            # Execute batch insert
            self.cursor.executemany(insert_sql, rows)
            self.connection.commit()

            logger.info(f"Inserted {len(events)} rows to Snowflake table {sf_config.table_name}")
            return len(events)

        except Exception as e:
            logger.error(f"Failed to send events to Snowflake: {e}")
            if self.connection:
                self.connection.rollback()
            raise

    async def test_connection(self) -> TestConnectionResult:
        """Test Snowflake connection."""
        start_time = time.time()

        try:
            await self.connect()

            sf_config = self.config.snowflake

            # Test query
            self.cursor.execute("SELECT CURRENT_VERSION()")
            version = self.cursor.fetchone()[0]

            # Check if table exists
            self.cursor.execute(f"""
                SELECT COUNT(*)
                FROM INFORMATION_SCHEMA.TABLES
                WHERE TABLE_SCHEMA = '{sf_config.schema_name}'
                AND TABLE_NAME = '{sf_config.table_name.upper()}'
            """)
            table_exists = self.cursor.fetchone()[0] > 0

            latency = (time.time() - start_time) * 1000

            return TestConnectionResult(
                success=True,
                message="Connection successful" if table_exists else "Connected, but table doesn't exist",
                latency_ms=latency,
                details={
                    "account": sf_config.account,
                    "database": sf_config.database,
                    "schema": sf_config.schema_name,
                    "table": sf_config.table_name,
                    "table_exists": table_exists,
                    "version": version,
                },
            )

        except Exception as e:
            latency = (time.time() - start_time) * 1000
            return TestConnectionResult(
                success=False,
                message=f"Connection failed: {str(e)}",
                latency_ms=latency,
            )
        finally:
            await self.disconnect()

    async def create_table_if_not_exists(self) -> bool:
        """Create the destination table if it doesn't exist."""
        try:
            if not self._is_connected:
                await self.connect()

            sf_config = self.config.snowflake

            # Default schema for click events
            create_sql = f"""
                CREATE TABLE IF NOT EXISTS {sf_config.table_name} (
                    event_id VARCHAR(36) NOT NULL,
                    link_id VARCHAR(36),
                    short_code VARCHAR(100),
                    team_id VARCHAR(36),
                    timestamp TIMESTAMP_NTZ NOT NULL,
                    ip VARCHAR(45),
                    country VARCHAR(2),
                    region VARCHAR(100),
                    city VARCHAR(100),
                    device_type VARCHAR(50),
                    browser VARCHAR(100),
                    os VARCHAR(100),
                    referrer VARCHAR(2000),
                    utm_source VARCHAR(200),
                    utm_medium VARCHAR(200),
                    utm_campaign VARCHAR(200),
                    utm_term VARCHAR(200),
                    utm_content VARCHAR(200),
                    user_agent VARCHAR(1000),
                    is_bot BOOLEAN,
                    is_unique BOOLEAN,
                    metadata VARIANT,
                    created_at TIMESTAMP_NTZ DEFAULT CURRENT_TIMESTAMP()
                )
            """

            self.cursor.execute(create_sql)
            self.connection.commit()

            logger.info(f"Table {sf_config.table_name} created or already exists")
            return True

        except Exception as e:
            logger.error(f"Failed to create table: {e}")
            return False

    def _serialize_value(self, value: Any) -> Any:
        """Serialize value for Snowflake insertion."""
        if value is None:
            return None
        if isinstance(value, datetime):
            return value.isoformat()
        if isinstance(value, (dict, list)):
            return json.dumps(value)
        if isinstance(value, bool):
            return value
        return value

    async def stream_to_stage(
        self,
        events: List[Dict[str, Any]],
        stage_name: str,
    ) -> int:
        """Stream events to a Snowflake internal stage for bulk loading."""
        if not self._is_connected:
            await self.connect()

        try:
            import io
            import gzip

            # Convert events to NDJSON
            content = "\n".join(json.dumps(e, default=str) for e in events)
            compressed = gzip.compress(content.encode("utf-8"))

            # Create a file-like object
            file_stream = io.BytesIO(compressed)

            # Upload to stage
            timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S%f")
            file_name = f"events_{timestamp}.json.gz"

            self.cursor.execute(f"PUT file://{file_name} @{stage_name}")

            logger.info(f"Uploaded {len(events)} events to stage {stage_name}")
            return len(events)

        except Exception as e:
            logger.error(f"Failed to stream to stage: {e}")
            raise
