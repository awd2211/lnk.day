import json
import io
import gzip
from datetime import datetime
from typing import Any, Dict, List, Optional
import logging

from clickhouse_driver import Client

from app.core.config import settings
from .base import BaseExporter, ExportFormat, ExportResult

logger = logging.getLogger(__name__)


class S3Exporter(BaseExporter):
    def __init__(self):
        super().__init__("s3")
        self.client = None
        self.clickhouse = Client(
            host=settings.CLICKHOUSE_HOST,
            port=settings.CLICKHOUSE_PORT,
            database=settings.CLICKHOUSE_DATABASE,
            user=settings.CLICKHOUSE_USER,
            password=settings.CLICKHOUSE_PASSWORD,
        )

    async def connect(self) -> bool:
        try:
            import boto3
            from botocore.config import Config

            config = Config(
                region_name=settings.S3_REGION,
                signature_version="s3v4",
            )

            if settings.S3_ENDPOINT_URL:
                # MinIO or S3-compatible storage
                self.client = boto3.client(
                    "s3",
                    endpoint_url=settings.S3_ENDPOINT_URL,
                    aws_access_key_id=settings.S3_ACCESS_KEY,
                    aws_secret_access_key=settings.S3_SECRET_KEY,
                    config=config,
                )
            else:
                # AWS S3
                self.client = boto3.client(
                    "s3",
                    aws_access_key_id=settings.S3_ACCESS_KEY,
                    aws_secret_access_key=settings.S3_SECRET_KEY,
                    config=config,
                )

            # Verify connection by listing buckets
            self.client.list_buckets()
            self.logger.info("Connected to S3")
            return True
        except Exception as e:
            self.logger.error(f"Failed to connect to S3: {e}")
            return False

    async def disconnect(self) -> None:
        self.client = None
        self.logger.info("Disconnected from S3")

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
                destination=f"s3://{settings.S3_BUCKET}/{table_name}",
                records_exported=0,
                bytes_written=0,
                started_at=started_at,
                completed_at=datetime.utcnow(),
                error="S3 client not connected",
            )

        try:
            # Generate key with timestamp
            timestamp = datetime.utcnow().strftime("%Y/%m/%d/%H%M%S")
            extension = self._get_extension(format)
            key = f"exports/{table_name}/{timestamp}/data.{extension}"

            # Serialize data based on format
            content, content_type = self._serialize_data(data, format)

            # Compress if large
            compress = len(content) > 1024 * 1024  # > 1MB
            if compress:
                content = gzip.compress(content)
                key += ".gz"

            # Upload to S3
            self.client.put_object(
                Bucket=settings.S3_BUCKET,
                Key=key,
                Body=content,
                ContentType=content_type,
                ContentEncoding="gzip" if compress else None,
                Metadata={
                    "records": str(len(data)),
                    "format": format.value,
                    "exported_at": started_at.isoformat(),
                },
            )

            result = ExportResult(
                success=True,
                destination=f"s3://{settings.S3_BUCKET}/{key}",
                records_exported=len(data),
                bytes_written=len(content),
                started_at=started_at,
                completed_at=datetime.utcnow(),
            )
            self._log_export_complete(result)
            return result

        except Exception as e:
            self.logger.error(f"S3 export failed: {e}")
            return ExportResult(
                success=False,
                destination=f"s3://{settings.S3_BUCKET}/{table_name}",
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

    def _serialize_data(self, data: List[Dict[str, Any]], format: ExportFormat) -> tuple:
        if format == ExportFormat.JSON:
            content = json.dumps(data, default=str, indent=2).encode("utf-8")
            return content, "application/json"

        elif format == ExportFormat.CSV:
            import csv

            if not data:
                return b"", "text/csv"

            output = io.StringIO()
            writer = csv.DictWriter(output, fieldnames=data[0].keys())
            writer.writeheader()
            writer.writerows(data)
            return output.getvalue().encode("utf-8"), "text/csv"

        elif format == ExportFormat.PARQUET:
            try:
                import pandas as pd
                import pyarrow as pa
                import pyarrow.parquet as pq

                df = pd.DataFrame(data)
                buffer = io.BytesIO()
                table = pa.Table.from_pandas(df)
                pq.write_table(table, buffer)
                return buffer.getvalue(), "application/octet-stream"
            except ImportError:
                raise ValueError("Parquet export requires pandas and pyarrow")

        elif format == ExportFormat.AVRO:
            try:
                import fastavro

                if not data:
                    return b"", "application/octet-stream"

                # Infer schema from data
                schema = self._infer_avro_schema(data[0])
                buffer = io.BytesIO()
                fastavro.writer(buffer, schema, data)
                return buffer.getvalue(), "application/octet-stream"
            except ImportError:
                raise ValueError("Avro export requires fastavro")

        raise ValueError(f"Unsupported format: {format}")

    def _get_extension(self, format: ExportFormat) -> str:
        return {
            ExportFormat.JSON: "json",
            ExportFormat.CSV: "csv",
            ExportFormat.PARQUET: "parquet",
            ExportFormat.AVRO: "avro",
        }.get(format, "json")

    def _infer_avro_schema(self, sample: Dict[str, Any]) -> Dict:
        type_mapping = {
            str: "string",
            int: "long",
            float: "double",
            bool: "boolean",
            type(None): ["null", "string"],
        }

        fields = []
        for key, value in sample.items():
            avro_type = type_mapping.get(type(value), "string")
            # Make all fields nullable
            if isinstance(avro_type, str):
                avro_type = ["null", avro_type]
            fields.append({"name": key, "type": avro_type})

        return {
            "type": "record",
            "name": "ExportRecord",
            "fields": fields,
        }

    async def list_exports(self, table_name: str, limit: int = 100) -> List[Dict[str, Any]]:
        """List existing exports for a table"""
        if not self.client:
            await self.connect()

        try:
            response = self.client.list_objects_v2(
                Bucket=settings.S3_BUCKET,
                Prefix=f"exports/{table_name}/",
                MaxKeys=limit,
            )

            exports = []
            for obj in response.get("Contents", []):
                exports.append({
                    "key": obj["Key"],
                    "size": obj["Size"],
                    "last_modified": obj["LastModified"].isoformat(),
                    "url": f"s3://{settings.S3_BUCKET}/{obj['Key']}",
                })

            return exports
        except Exception as e:
            self.logger.error(f"Failed to list exports: {e}")
            return []

    async def get_presigned_url(self, key: str, expires_in: int = 3600) -> Optional[str]:
        """Generate a presigned URL for downloading an export"""
        if not self.client:
            await self.connect()

        try:
            url = self.client.generate_presigned_url(
                "get_object",
                Params={"Bucket": settings.S3_BUCKET, "Key": key},
                ExpiresIn=expires_in,
            )
            return url
        except Exception as e:
            self.logger.error(f"Failed to generate presigned URL: {e}")
            return None

    async def delete_export(self, key: str) -> bool:
        """Delete an export file"""
        if not self.client:
            await self.connect()

        try:
            self.client.delete_object(Bucket=settings.S3_BUCKET, Key=key)
            self.logger.info(f"Deleted export: {key}")
            return True
        except Exception as e:
            self.logger.error(f"Failed to delete export: {e}")
            return False
