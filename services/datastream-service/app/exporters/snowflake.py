import json
from datetime import datetime
from typing import Any, Dict, List, Optional
import logging

from clickhouse_driver import Client

from app.core.config import settings
from .base import BaseExporter, ExportFormat, ExportResult

logger = logging.getLogger(__name__)


class SnowflakeExporter(BaseExporter):
    def __init__(self):
        super().__init__("snowflake")
        self.connection = None
        self.cursor = None
        self.clickhouse = Client(
            host=settings.CLICKHOUSE_HOST,
            port=settings.CLICKHOUSE_PORT,
            database=settings.CLICKHOUSE_DATABASE,
            user=settings.CLICKHOUSE_USER,
            password=settings.CLICKHOUSE_PASSWORD,
        )

    async def connect(self) -> bool:
        if not settings.SNOWFLAKE_ACCOUNT:
            self.logger.warning("Snowflake account not configured")
            return False

        try:
            import snowflake.connector

            self.connection = snowflake.connector.connect(
                account=settings.SNOWFLAKE_ACCOUNT,
                user=settings.SNOWFLAKE_USER,
                password=settings.SNOWFLAKE_PASSWORD,
                database=settings.SNOWFLAKE_DATABASE,
                schema=settings.SNOWFLAKE_SCHEMA,
                warehouse=settings.SNOWFLAKE_WAREHOUSE,
            )
            self.cursor = self.connection.cursor()
            self.logger.info("Connected to Snowflake")
            return True
        except Exception as e:
            self.logger.error(f"Failed to connect to Snowflake: {e}")
            return False

    async def disconnect(self) -> None:
        if self.cursor:
            self.cursor.close()
            self.cursor = None
        if self.connection:
            self.connection.close()
            self.connection = None
            self.logger.info("Disconnected from Snowflake")

    async def export(
        self,
        data: List[Dict[str, Any]],
        table_name: str,
        format: ExportFormat = ExportFormat.JSON,
    ) -> ExportResult:
        started_at = datetime.utcnow()

        if not self.connection:
            await self.connect()

        if not self.connection:
            return ExportResult(
                success=False,
                destination=f"snowflake://{settings.SNOWFLAKE_ACCOUNT}/{settings.SNOWFLAKE_DATABASE}/{table_name}",
                records_exported=0,
                bytes_written=0,
                started_at=started_at,
                completed_at=datetime.utcnow(),
                error="Snowflake connection not established",
            )

        try:
            # Create table if not exists
            if data:
                create_sql = self._generate_create_table(table_name, data[0])
                self.cursor.execute(create_sql)

            # Prepare insert statement
            if data:
                columns = list(data[0].keys())
                placeholders = ", ".join(["%s"] * len(columns))
                insert_sql = f"INSERT INTO {table_name} ({', '.join(columns)}) VALUES ({placeholders})"

                # Convert data to tuples
                rows = [tuple(self._serialize_value(row.get(col)) for col in columns) for row in data]

                # Batch insert
                self.cursor.executemany(insert_sql, rows)
                self.connection.commit()

            bytes_written = sum(len(json.dumps(row)) for row in data)

            result = ExportResult(
                success=True,
                destination=f"snowflake://{settings.SNOWFLAKE_ACCOUNT}/{settings.SNOWFLAKE_DATABASE}/{table_name}",
                records_exported=len(data),
                bytes_written=bytes_written,
                started_at=started_at,
                completed_at=datetime.utcnow(),
            )
            self._log_export_complete(result)
            return result

        except Exception as e:
            self.logger.error(f"Snowflake export failed: {e}")
            if self.connection:
                self.connection.rollback()
            return ExportResult(
                success=False,
                destination=f"snowflake://{table_name}",
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

    def _generate_create_table(self, table_name: str, sample: Dict[str, Any]) -> str:
        type_mapping = {
            str: "VARCHAR",
            int: "NUMBER",
            float: "FLOAT",
            bool: "BOOLEAN",
            datetime: "TIMESTAMP_NTZ",
            type(None): "VARCHAR",
        }

        columns = []
        for key, value in sample.items():
            sf_type = type_mapping.get(type(value), "VARCHAR")
            columns.append(f"{key} {sf_type}")

        return f"CREATE TABLE IF NOT EXISTS {table_name} ({', '.join(columns)})"

    def _serialize_value(self, value: Any) -> Any:
        if isinstance(value, datetime):
            return value.isoformat()
        if isinstance(value, (dict, list)):
            return json.dumps(value)
        return value

    async def create_stage(self, stage_name: str, s3_path: Optional[str] = None) -> bool:
        """Create a Snowflake stage for bulk loading"""
        if not self.cursor:
            await self.connect()

        try:
            if s3_path and settings.S3_ACCESS_KEY:
                # External S3 stage
                self.cursor.execute(f"""
                    CREATE OR REPLACE STAGE {stage_name}
                    URL = '{s3_path}'
                    CREDENTIALS = (
                        AWS_KEY_ID = '{settings.S3_ACCESS_KEY}'
                        AWS_SECRET_KEY = '{settings.S3_SECRET_KEY}'
                    )
                    FILE_FORMAT = (TYPE = 'JSON')
                """)
            else:
                # Internal stage
                self.cursor.execute(f"CREATE OR REPLACE STAGE {stage_name}")

            self.logger.info(f"Created Snowflake stage: {stage_name}")
            return True
        except Exception as e:
            self.logger.error(f"Failed to create stage: {e}")
            return False

    async def bulk_load_from_stage(
        self,
        table_name: str,
        stage_name: str,
        file_pattern: str = "*.json",
    ) -> ExportResult:
        """Load data from a Snowflake stage into a table"""
        started_at = datetime.utcnow()

        if not self.cursor:
            await self.connect()

        try:
            # Copy into table from stage
            self.cursor.execute(f"""
                COPY INTO {table_name}
                FROM @{stage_name}/{file_pattern}
                FILE_FORMAT = (TYPE = 'JSON')
                MATCH_BY_COLUMN_NAME = CASE_INSENSITIVE
            """)

            result = self.cursor.fetchone()
            rows_loaded = result[0] if result else 0

            return ExportResult(
                success=True,
                destination=f"snowflake://{table_name}",
                records_exported=rows_loaded,
                bytes_written=0,
                started_at=started_at,
                completed_at=datetime.utcnow(),
            )
        except Exception as e:
            self.logger.error(f"Bulk load failed: {e}")
            return ExportResult(
                success=False,
                destination=f"snowflake://{table_name}",
                records_exported=0,
                bytes_written=0,
                started_at=started_at,
                completed_at=datetime.utcnow(),
                error=str(e),
            )
