"""BigQuery connector for data streams."""

import json
import logging
import time
from typing import List, Dict, Any, Optional
from datetime import datetime

from app.models.data_stream import (
    DestinationConfig,
    TestConnectionResult,
    SchemaConfig,
)
from .base import BaseConnector

logger = logging.getLogger(__name__)


class BigQueryConnector(BaseConnector):
    """Connector for Google BigQuery."""

    def __init__(self, config: DestinationConfig, schema: Optional[SchemaConfig] = None):
        super().__init__(config, schema)
        self.client = None
        self.table_ref = None

    async def connect(self) -> None:
        """Establish connection to BigQuery."""
        try:
            from google.cloud import bigquery
            from google.oauth2 import service_account

            bq_config = self.config.bigquery
            if not bq_config:
                raise ValueError("BigQuery configuration is required")

            # Create credentials
            if bq_config.credentials_json:
                credentials_info = json.loads(bq_config.credentials_json)
                credentials = service_account.Credentials.from_service_account_info(
                    credentials_info
                )
                self.client = bigquery.Client(
                    project=bq_config.project_id,
                    credentials=credentials,
                )
            elif bq_config.credentials_path:
                credentials = service_account.Credentials.from_service_account_file(
                    bq_config.credentials_path
                )
                self.client = bigquery.Client(
                    project=bq_config.project_id,
                    credentials=credentials,
                )
            else:
                # Use default credentials
                self.client = bigquery.Client(project=bq_config.project_id)

            # Get table reference
            self.table_ref = self.client.dataset(bq_config.dataset_id).table(
                bq_config.table_id
            )

            self._is_connected = True
            logger.info(f"Connected to BigQuery: {bq_config.project_id}")

        except ImportError:
            logger.error("google-cloud-bigquery not installed")
            raise
        except Exception as e:
            logger.error(f"Failed to connect to BigQuery: {e}")
            raise

    async def disconnect(self) -> None:
        """Close the BigQuery connection."""
        if self.client:
            self.client.close()
            self.client = None
            self.table_ref = None
            self._is_connected = False
            logger.info("Disconnected from BigQuery")

    async def send(self, events: List[Dict[str, Any]]) -> int:
        """Send events to BigQuery."""
        if not self._is_connected or not self.client:
            await self.connect()

        try:
            # Transform events
            rows = [self._transform_event(event) for event in events]

            # Insert rows
            errors = self.client.insert_rows_json(self.table_ref, rows)

            if errors:
                logger.error(f"BigQuery insert errors: {errors}")
                return len(events) - len(errors)

            return len(events)

        except Exception as e:
            logger.error(f"Failed to send events to BigQuery: {e}")
            raise

    async def test_connection(self) -> TestConnectionResult:
        """Test BigQuery connection."""
        start_time = time.time()

        try:
            await self.connect()

            # Try to access the table
            bq_config = self.config.bigquery
            query = f"""
                SELECT COUNT(*) as count
                FROM `{bq_config.project_id}.{bq_config.dataset_id}.INFORMATION_SCHEMA.TABLES`
                WHERE table_name = '{bq_config.table_id}'
            """
            result = self.client.query(query).result()
            row = list(result)[0]
            table_exists = row.count > 0

            latency = (time.time() - start_time) * 1000

            return TestConnectionResult(
                success=True,
                message="Connection successful" if table_exists else "Connected, but table doesn't exist",
                latency_ms=latency,
                details={
                    "project_id": bq_config.project_id,
                    "dataset_id": bq_config.dataset_id,
                    "table_id": bq_config.table_id,
                    "table_exists": table_exists,
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
            from google.cloud import bigquery

            if not self._is_connected:
                await self.connect()

            bq_config = self.config.bigquery

            # Define default schema for click events
            default_schema = [
                bigquery.SchemaField("event_id", "STRING", mode="REQUIRED"),
                bigquery.SchemaField("link_id", "STRING", mode="NULLABLE"),
                bigquery.SchemaField("short_code", "STRING", mode="NULLABLE"),
                bigquery.SchemaField("team_id", "STRING", mode="NULLABLE"),
                bigquery.SchemaField("timestamp", "TIMESTAMP", mode="REQUIRED"),
                bigquery.SchemaField("ip", "STRING", mode="NULLABLE"),
                bigquery.SchemaField("country", "STRING", mode="NULLABLE"),
                bigquery.SchemaField("region", "STRING", mode="NULLABLE"),
                bigquery.SchemaField("city", "STRING", mode="NULLABLE"),
                bigquery.SchemaField("device_type", "STRING", mode="NULLABLE"),
                bigquery.SchemaField("browser", "STRING", mode="NULLABLE"),
                bigquery.SchemaField("os", "STRING", mode="NULLABLE"),
                bigquery.SchemaField("referrer", "STRING", mode="NULLABLE"),
                bigquery.SchemaField("utm_source", "STRING", mode="NULLABLE"),
                bigquery.SchemaField("utm_medium", "STRING", mode="NULLABLE"),
                bigquery.SchemaField("utm_campaign", "STRING", mode="NULLABLE"),
            ]

            table = bigquery.Table(self.table_ref, schema=default_schema)
            table.time_partitioning = bigquery.TimePartitioning(
                type_=bigquery.TimePartitioningType.DAY,
                field="timestamp",
            )

            self.client.create_table(table, exists_ok=True)
            logger.info(f"Table {bq_config.table_id} created or already exists")
            return True

        except Exception as e:
            logger.error(f"Failed to create table: {e}")
            return False
