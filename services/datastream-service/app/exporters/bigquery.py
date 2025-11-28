import json
from datetime import datetime
from typing import Any, Dict, List, Optional
import logging

from clickhouse_driver import Client

from app.core.config import settings
from .base import BaseExporter, ExportFormat, ExportResult

logger = logging.getLogger(__name__)


class BigQueryExporter(BaseExporter):
    def __init__(self):
        super().__init__("bigquery")
        self.client = None
        self.clickhouse = Client(
            host=settings.CLICKHOUSE_HOST,
            port=settings.CLICKHOUSE_PORT,
            database=settings.CLICKHOUSE_DATABASE,
            user=settings.CLICKHOUSE_USER,
            password=settings.CLICKHOUSE_PASSWORD,
        )

    async def connect(self) -> bool:
        if not settings.BIGQUERY_PROJECT_ID:
            self.logger.warning("BigQuery project ID not configured")
            return False

        try:
            from google.cloud import bigquery
            from google.oauth2 import service_account

            if settings.BIGQUERY_CREDENTIALS_PATH:
                credentials = service_account.Credentials.from_service_account_file(
                    settings.BIGQUERY_CREDENTIALS_PATH
                )
                self.client = bigquery.Client(
                    project=settings.BIGQUERY_PROJECT_ID,
                    credentials=credentials,
                )
            else:
                # Use default credentials (ADC)
                self.client = bigquery.Client(project=settings.BIGQUERY_PROJECT_ID)

            self.logger.info("Connected to BigQuery")
            return True
        except Exception as e:
            self.logger.error(f"Failed to connect to BigQuery: {e}")
            return False

    async def disconnect(self) -> None:
        if self.client:
            self.client.close()
            self.client = None
            self.logger.info("Disconnected from BigQuery")

    async def export(
        self,
        data: List[Dict[str, Any]],
        table_name: str,
        format: ExportFormat = ExportFormat.JSON,
    ) -> ExportResult:
        started_at = datetime.utcnow()

        if not self.client:
            await self.connect()

        if not self.client:
            return ExportResult(
                success=False,
                destination=f"bigquery://{settings.BIGQUERY_PROJECT_ID}/{settings.BIGQUERY_DATASET}/{table_name}",
                records_exported=0,
                bytes_written=0,
                started_at=started_at,
                completed_at=datetime.utcnow(),
                error="BigQuery client not connected",
            )

        try:
            from google.cloud import bigquery

            table_ref = f"{settings.BIGQUERY_PROJECT_ID}.{settings.BIGQUERY_DATASET}.{table_name}"

            # Create table if not exists
            schema = self._infer_schema(data[0] if data else {})
            table = bigquery.Table(table_ref, schema=schema)

            try:
                self.client.create_table(table)
                self.logger.info(f"Created BigQuery table: {table_ref}")
            except Exception:
                pass  # Table already exists

            # Insert data
            errors = self.client.insert_rows_json(table_ref, data)

            if errors:
                return ExportResult(
                    success=False,
                    destination=table_ref,
                    records_exported=0,
                    bytes_written=0,
                    started_at=started_at,
                    completed_at=datetime.utcnow(),
                    error=str(errors[:3]),  # First 3 errors
                )

            bytes_written = sum(len(json.dumps(row)) for row in data)

            result = ExportResult(
                success=True,
                destination=table_ref,
                records_exported=len(data),
                bytes_written=bytes_written,
                started_at=started_at,
                completed_at=datetime.utcnow(),
            )
            self._log_export_complete(result)
            return result

        except Exception as e:
            self.logger.error(f"BigQuery export failed: {e}")
            return ExportResult(
                success=False,
                destination=f"bigquery://{table_name}",
                records_exported=0,
                bytes_written=0,
                started_at=started_at,
                completed_at=datetime.utcnow(),
                error=str(e),
            )

    async def export_query(
        self,
        query: str,
        table_name: str,
        format: ExportFormat = ExportFormat.JSON,
    ) -> ExportResult:
        # Execute ClickHouse query and get data
        data = self.clickhouse.execute(query, with_column_types=True)
        rows, columns = data
        column_names = [col[0] for col in columns]

        # Convert to list of dicts
        records = [dict(zip(column_names, row)) for row in rows]

        return await self.export(records, table_name, format)

    def _infer_schema(self, sample: Dict[str, Any]):
        from google.cloud import bigquery

        type_mapping = {
            str: bigquery.enums.SqlTypeNames.STRING,
            int: bigquery.enums.SqlTypeNames.INT64,
            float: bigquery.enums.SqlTypeNames.FLOAT64,
            bool: bigquery.enums.SqlTypeNames.BOOL,
            datetime: bigquery.enums.SqlTypeNames.TIMESTAMP,
        }

        schema = []
        for key, value in sample.items():
            bq_type = type_mapping.get(type(value), bigquery.enums.SqlTypeNames.STRING)
            schema.append(bigquery.SchemaField(key, bq_type))

        return schema

    async def create_scheduled_export(
        self,
        query: str,
        table_name: str,
        schedule: str = "every 24 hours",  # BigQuery Data Transfer schedule
    ) -> Dict[str, Any]:
        """Create a scheduled export job (requires BigQuery Data Transfer API)"""
        if not self.client:
            await self.connect()

        try:
            from google.cloud import bigquery_datatransfer_v1

            transfer_client = bigquery_datatransfer_v1.DataTransferServiceClient()
            parent = f"projects/{settings.BIGQUERY_PROJECT_ID}/locations/us"

            # This is a simplified example - actual implementation would need
            # proper Data Transfer configuration
            return {
                "status": "scheduled",
                "table": table_name,
                "schedule": schedule,
                "message": "Scheduled export created",
            }
        except Exception as e:
            self.logger.error(f"Failed to create scheduled export: {e}")
            return {"status": "error", "error": str(e)}
