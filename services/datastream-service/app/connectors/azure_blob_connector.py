"""Azure Blob Storage connector for data streams."""

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


class AzureBlobConnector(BaseConnector):
    """Connector for Azure Blob Storage."""

    def __init__(
        self,
        config: DestinationConfig,
        schema: Optional[SchemaConfig] = None,
        partitioning: Optional[PartitioningConfig] = None,
    ):
        super().__init__(config, schema)
        self.blob_service_client = None
        self.container_client = None
        self.partitioning = partitioning or PartitioningConfig()

    async def connect(self) -> None:
        """Establish connection to Azure Blob Storage."""
        try:
            from azure.storage.blob import BlobServiceClient

            azure_config = self.config.azure_blob
            if not azure_config:
                raise ValueError("Azure Blob configuration is required")

            # Create client using connection string or account key
            if azure_config.connection_string:
                self.blob_service_client = BlobServiceClient.from_connection_string(
                    azure_config.connection_string
                )
            else:
                account_url = f"https://{azure_config.account_name}.blob.core.windows.net"
                self.blob_service_client = BlobServiceClient(
                    account_url=account_url,
                    credential=azure_config.account_key,
                )

            self.container_client = self.blob_service_client.get_container_client(
                azure_config.container_name
            )

            self._is_connected = True
            logger.info(f"Connected to Azure Blob: {azure_config.container_name}")

        except ImportError:
            logger.error("azure-storage-blob not installed")
            raise
        except Exception as e:
            logger.error(f"Failed to connect to Azure Blob: {e}")
            raise

    async def disconnect(self) -> None:
        """Close the Azure Blob connection."""
        self.container_client = None
        self.blob_service_client = None
        self._is_connected = False
        logger.info("Disconnected from Azure Blob")

    async def send(self, events: List[Dict[str, Any]]) -> int:
        """Send events to Azure Blob Storage."""
        if not self._is_connected or not self.container_client:
            await self.connect()

        azure_config = self.config.azure_blob
        if not azure_config or not events:
            return 0

        try:
            # Transform events
            transformed_events = [self._transform_event(event) for event in events]

            # Generate file content
            content, content_type = self._generate_file_content(
                transformed_events,
                azure_config.file_format,
                azure_config.compression,
            )

            # Generate blob name with partitioning
            blob_name = self._generate_blob_name(
                azure_config.prefix,
                azure_config.file_format,
            )

            # Upload to Azure Blob
            blob_client = self.container_client.get_blob_client(blob_name)
            blob_client.upload_blob(
                content,
                overwrite=True,
                content_settings={
                    "content_type": content_type,
                },
            )

            logger.info(
                f"Uploaded {len(events)} events to azure://{azure_config.container_name}/{blob_name}"
            )
            return len(events)

        except Exception as e:
            logger.error(f"Failed to send events to Azure Blob: {e}")
            raise

    def _generate_blob_name(self, prefix: str, file_format: FileFormat) -> str:
        """Generate blob name with partitioning."""
        now = datetime.utcnow()
        timestamp = now.strftime("%Y%m%d%H%M%S%f")

        if self.partitioning.enabled:
            partition_path = self.partitioning.pattern
            partition_path = partition_path.replace("{YYYY}", now.strftime("%Y"))
            partition_path = partition_path.replace("{MM}", now.strftime("%m"))
            partition_path = partition_path.replace("{DD}", now.strftime("%d"))
            partition_path = partition_path.replace("{HH}", now.strftime("%H"))

            blob_name = f"{prefix}/{partition_path}/events_{timestamp}.{file_format.value}"
        else:
            blob_name = f"{prefix}/events_{timestamp}.{file_format.value}"

        return blob_name.lstrip("/")

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
        """Test Azure Blob connection."""
        start_time = time.time()

        try:
            await self.connect()

            azure_config = self.config.azure_blob

            # Check if container exists
            exists = self.container_client.exists()

            latency = (time.time() - start_time) * 1000

            if not exists:
                return TestConnectionResult(
                    success=False,
                    message=f"Container '{azure_config.container_name}' does not exist",
                    latency_ms=latency,
                )

            return TestConnectionResult(
                success=True,
                message="Connection successful",
                latency_ms=latency,
                details={
                    "account_name": azure_config.account_name,
                    "container_name": azure_config.container_name,
                    "prefix": azure_config.prefix,
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

    async def list_blobs(self, prefix: str = "") -> List[str]:
        """List blobs in the container with the given prefix."""
        if not self._is_connected:
            await self.connect()

        azure_config = self.config.azure_blob
        full_prefix = f"{azure_config.prefix}/{prefix}".strip("/")

        blobs = []
        for blob in self.container_client.list_blobs(name_starts_with=full_prefix):
            blobs.append(blob.name)

        return blobs

    async def delete_blob(self, blob_name: str) -> bool:
        """Delete a blob from the container."""
        if not self._is_connected:
            await self.connect()

        try:
            blob_client = self.container_client.get_blob_client(blob_name)
            blob_client.delete_blob()
            return True
        except Exception as e:
            logger.error(f"Failed to delete blob {blob_name}: {e}")
            return False
