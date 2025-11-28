"""Google Cloud Storage connector for data streams."""

import io
import json
import logging
import time
from datetime import datetime
from typing import List, Dict, Any, Optional

from app.models.data_stream import (
    DestinationConfig,
    TestConnectionResult,
    SchemaConfig,
    FileFormat,
    CompressionType,
    PartitioningConfig,
)
from .base import BaseConnector

logger = logging.getLogger(__name__)


class GCSConnector(BaseConnector):
    """Connector for Google Cloud Storage."""

    def __init__(
        self,
        config: DestinationConfig,
        schema: Optional[SchemaConfig] = None,
        partitioning: Optional[PartitioningConfig] = None,
    ):
        super().__init__(config, schema)
        self.client = None
        self.bucket = None
        self.partitioning = partitioning or PartitioningConfig()

    async def connect(self) -> None:
        """Establish connection to Google Cloud Storage."""
        try:
            from google.cloud import storage
            from google.oauth2 import service_account

            gcs_config = self.config.gcs
            if not gcs_config:
                raise ValueError("GCS configuration is required")

            # Create credentials
            if gcs_config.credentials_json:
                credentials_info = json.loads(gcs_config.credentials_json)
                credentials = service_account.Credentials.from_service_account_info(
                    credentials_info
                )
                self.client = storage.Client(
                    project=gcs_config.project_id,
                    credentials=credentials,
                )
            elif gcs_config.credentials_path:
                credentials = service_account.Credentials.from_service_account_file(
                    gcs_config.credentials_path
                )
                self.client = storage.Client(
                    project=gcs_config.project_id,
                    credentials=credentials,
                )
            else:
                # Use default credentials
                self.client = storage.Client(project=gcs_config.project_id)

            self.bucket = self.client.bucket(gcs_config.bucket_name)
            self._is_connected = True
            logger.info(f"Connected to GCS: gs://{gcs_config.bucket_name}")

        except ImportError:
            logger.error("google-cloud-storage not installed")
            raise
        except Exception as e:
            logger.error(f"Failed to connect to GCS: {e}")
            raise

    async def disconnect(self) -> None:
        """Close the GCS connection."""
        self.client = None
        self.bucket = None
        self._is_connected = False
        logger.info("Disconnected from GCS")

    async def send(self, events: List[Dict[str, Any]]) -> int:
        """Send events to Google Cloud Storage."""
        if not self._is_connected or not self.bucket:
            await self.connect()

        gcs_config = self.config.gcs
        if not gcs_config or not events:
            return 0

        try:
            # Transform events
            transformed_events = [self._transform_event(event) for event in events]

            # Generate file content
            content, content_type = self._generate_file_content(
                transformed_events,
                gcs_config.file_format,
                gcs_config.compression,
            )

            # Generate object name with partitioning
            object_name = self._generate_object_name(
                gcs_config.prefix,
                gcs_config.file_format,
            )

            # Upload to GCS
            blob = self.bucket.blob(object_name)
            blob.upload_from_string(content, content_type=content_type)

            logger.info(
                f"Uploaded {len(events)} events to gs://{gcs_config.bucket_name}/{object_name}"
            )
            return len(events)

        except Exception as e:
            logger.error(f"Failed to send events to GCS: {e}")
            raise

    def _generate_object_name(self, prefix: str, file_format: FileFormat) -> str:
        """Generate object name with partitioning."""
        now = datetime.utcnow()
        timestamp = now.strftime("%Y%m%d%H%M%S%f")

        if self.partitioning.enabled:
            partition_path = self.partitioning.pattern
            partition_path = partition_path.replace("{YYYY}", now.strftime("%Y"))
            partition_path = partition_path.replace("{MM}", now.strftime("%m"))
            partition_path = partition_path.replace("{DD}", now.strftime("%d"))
            partition_path = partition_path.replace("{HH}", now.strftime("%H"))

            object_name = f"{prefix}/{partition_path}/events_{timestamp}.{file_format.value}"
        else:
            object_name = f"{prefix}/events_{timestamp}.{file_format.value}"

        return object_name.lstrip("/")

    def _generate_file_content(
        self,
        events: List[Dict[str, Any]],
        file_format: FileFormat,
        compression: CompressionType,
    ) -> tuple[bytes, str]:
        """Generate file content based on format and compression."""
        content_type = "application/octet-stream"

        if file_format == FileFormat.JSON:
            content = json.dumps(events, default=str).encode("utf-8")
            content_type = "application/json"

        elif file_format == FileFormat.NDJSON:
            lines = [json.dumps(e, default=str) for e in events]
            content = "\n".join(lines).encode("utf-8")
            content_type = "application/x-ndjson"

        elif file_format == FileFormat.CSV:
            import csv
            output = io.StringIO()
            if events:
                writer = csv.DictWriter(output, fieldnames=events[0].keys())
                writer.writeheader()
                writer.writerows(events)
            content = output.getvalue().encode("utf-8")
            content_type = "text/csv"

        elif file_format == FileFormat.PARQUET:
            try:
                import pyarrow as pa
                import pyarrow.parquet as pq

                table = pa.Table.from_pylist(events)
                buffer = io.BytesIO()
                pq.write_table(table, buffer, compression="snappy")
                content = buffer.getvalue()
                content_type = "application/x-parquet"
            except ImportError:
                logger.warning("pyarrow not installed, falling back to JSON")
                content = json.dumps(events, default=str).encode("utf-8")
                content_type = "application/json"

        elif file_format == FileFormat.AVRO:
            try:
                import fastavro
                from fastavro.schema import parse_schema

                # Simple Avro schema for click events
                schema = {
                    "type": "record",
                    "name": "ClickEvent",
                    "fields": [
                        {"name": field, "type": ["null", "string"], "default": None}
                        for field in events[0].keys()
                    ] if events else []
                }
                parsed_schema = parse_schema(schema)

                buffer = io.BytesIO()
                fastavro.writer(buffer, parsed_schema, events)
                content = buffer.getvalue()
                content_type = "application/avro"
            except ImportError:
                logger.warning("fastavro not installed, falling back to JSON")
                content = json.dumps(events, default=str).encode("utf-8")
                content_type = "application/json"

        else:
            content = json.dumps(events, default=str).encode("utf-8")
            content_type = "application/json"

        # Apply compression
        if compression == CompressionType.GZIP:
            import gzip
            content = gzip.compress(content)
            content_type = "application/gzip"
        elif compression == CompressionType.LZ4:
            try:
                import lz4.frame
                content = lz4.frame.compress(content)
            except ImportError:
                logger.warning("lz4 not installed, skipping compression")

        return content, content_type

    async def test_connection(self) -> TestConnectionResult:
        """Test GCS connection."""
        start_time = time.time()

        try:
            await self.connect()

            gcs_config = self.config.gcs

            # Check if bucket exists and is accessible
            exists = self.bucket.exists()

            latency = (time.time() - start_time) * 1000

            if not exists:
                return TestConnectionResult(
                    success=False,
                    message=f"Bucket '{gcs_config.bucket_name}' does not exist or is not accessible",
                    latency_ms=latency,
                )

            return TestConnectionResult(
                success=True,
                message="Connection successful",
                latency_ms=latency,
                details={
                    "project_id": gcs_config.project_id,
                    "bucket_name": gcs_config.bucket_name,
                    "prefix": gcs_config.prefix,
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

    async def list_objects(self, prefix: str = "", max_results: int = 100) -> List[Dict[str, Any]]:
        """List objects in the bucket with the given prefix."""
        if not self._is_connected:
            await self.connect()

        gcs_config = self.config.gcs
        full_prefix = f"{gcs_config.prefix}/{prefix}".strip("/")

        objects = []
        blobs = self.bucket.list_blobs(prefix=full_prefix, max_results=max_results)

        for blob in blobs:
            objects.append({
                "name": blob.name,
                "size": blob.size,
                "updated": blob.updated.isoformat() if blob.updated else None,
                "content_type": blob.content_type,
            })

        return objects

    async def delete_object(self, object_name: str) -> bool:
        """Delete an object from the bucket."""
        if not self._is_connected:
            await self.connect()

        try:
            blob = self.bucket.blob(object_name)
            blob.delete()
            return True
        except Exception as e:
            logger.error(f"Failed to delete object {object_name}: {e}")
            return False

    async def copy_to_bigquery(
        self,
        object_name: str,
        dataset_id: str,
        table_id: str,
    ) -> bool:
        """Load a GCS object directly into BigQuery."""
        try:
            from google.cloud import bigquery

            gcs_config = self.config.gcs
            uri = f"gs://{gcs_config.bucket_name}/{object_name}"

            bq_client = bigquery.Client(project=gcs_config.project_id)
            table_ref = bq_client.dataset(dataset_id).table(table_id)

            job_config = bigquery.LoadJobConfig(
                source_format=bigquery.SourceFormat.NEWLINE_DELIMITED_JSON,
                autodetect=True,
            )

            load_job = bq_client.load_table_from_uri(
                uri,
                table_ref,
                job_config=job_config,
            )

            load_job.result()  # Wait for completion
            logger.info(f"Loaded {uri} into BigQuery table {dataset_id}.{table_id}")
            return True

        except Exception as e:
            logger.error(f"Failed to load to BigQuery: {e}")
            return False
