"""S3 connector for data streams."""

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


class S3Connector(BaseConnector):
    """Connector for Amazon S3 and S3-compatible storage."""

    def __init__(
        self,
        config: DestinationConfig,
        schema: Optional[SchemaConfig] = None,
        partitioning: Optional[PartitioningConfig] = None,
    ):
        super().__init__(config, schema)
        self.client = None
        self.partitioning = partitioning or PartitioningConfig()

    async def connect(self) -> None:
        """Establish connection to S3."""
        try:
            import boto3
            from botocore.config import Config

            s3_config = self.config.s3
            if not s3_config:
                raise ValueError("S3 configuration is required")

            # Create S3 client
            client_kwargs = {
                "region_name": s3_config.region,
            }

            if s3_config.endpoint_url:
                client_kwargs["endpoint_url"] = s3_config.endpoint_url

            if s3_config.access_key_id and s3_config.secret_access_key:
                client_kwargs["aws_access_key_id"] = s3_config.access_key_id
                client_kwargs["aws_secret_access_key"] = s3_config.secret_access_key

            self.client = boto3.client("s3", **client_kwargs)
            self._is_connected = True
            logger.info(f"Connected to S3: {s3_config.bucket}")

        except ImportError:
            logger.error("boto3 not installed")
            raise
        except Exception as e:
            logger.error(f"Failed to connect to S3: {e}")
            raise

    async def disconnect(self) -> None:
        """Close the S3 connection."""
        self.client = None
        self._is_connected = False
        logger.info("Disconnected from S3")

    async def send(self, events: List[Dict[str, Any]]) -> int:
        """Send events to S3."""
        if not self._is_connected or not self.client:
            await self.connect()

        s3_config = self.config.s3
        if not s3_config:
            raise ValueError("S3 configuration is required")

        try:
            # Transform events
            transformed_events = [self._transform_event(event) for event in events]

            # Generate file content
            content, content_type = self._generate_file_content(
                transformed_events,
                s3_config.file_format,
                s3_config.compression,
            )

            # Generate S3 key with partitioning
            key = self._generate_key(s3_config.prefix, s3_config.file_format)

            # Upload to S3
            self.client.put_object(
                Bucket=s3_config.bucket,
                Key=key,
                Body=content,
                ContentType=content_type,
            )

            logger.info(f"Uploaded {len(events)} events to s3://{s3_config.bucket}/{key}")
            return len(events)

        except Exception as e:
            logger.error(f"Failed to send events to S3: {e}")
            raise

    def _generate_key(self, prefix: str, file_format: FileFormat) -> str:
        """Generate S3 key with partitioning."""
        now = datetime.utcnow()
        timestamp = now.strftime("%Y%m%d%H%M%S%f")

        if self.partitioning.enabled:
            partition_path = self.partitioning.pattern
            partition_path = partition_path.replace("{YYYY}", now.strftime("%Y"))
            partition_path = partition_path.replace("{MM}", now.strftime("%m"))
            partition_path = partition_path.replace("{DD}", now.strftime("%d"))
            partition_path = partition_path.replace("{HH}", now.strftime("%H"))

            key = f"{prefix}/{partition_path}/events_{timestamp}.{file_format.value}"
        else:
            key = f"{prefix}/events_{timestamp}.{file_format.value}"

        return key.lstrip("/")

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
                # Fallback to JSON
                logger.warning("pyarrow not installed, falling back to JSON")
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
        """Test S3 connection."""
        start_time = time.time()

        try:
            await self.connect()

            s3_config = self.config.s3

            # Try to list bucket (head bucket)
            self.client.head_bucket(Bucket=s3_config.bucket)

            latency = (time.time() - start_time) * 1000

            return TestConnectionResult(
                success=True,
                message="Connection successful",
                latency_ms=latency,
                details={
                    "bucket": s3_config.bucket,
                    "prefix": s3_config.prefix,
                    "region": s3_config.region,
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
