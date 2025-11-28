"""Data Stream Service for managing custom data streams."""

import asyncio
import json
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
from uuid import uuid4

import redis.asyncio as redis
from clickhouse_driver import Client as ClickHouseClient

from app.core.config import settings
from app.models.data_stream import (
    DataStream,
    DataStreamCreate,
    DataStreamUpdate,
    StreamStatus,
    StreamStats,
    BackfillRequest,
    BackfillJob,
    TestConnectionResult,
    DestinationType,
)
from app.connectors import (
    BaseConnector,
    BigQueryConnector,
    S3Connector,
    KafkaConnector,
    HTTPConnector,
    SnowflakeConnector,
    AzureBlobConnector,
    GCSConnector,
)

logger = logging.getLogger(__name__)


class StreamService:
    """Service for managing data streams."""

    def __init__(self):
        self.redis: Optional[redis.Redis] = None
        self.clickhouse: Optional[ClickHouseClient] = None
        self._stream_tasks: Dict[str, asyncio.Task] = {}
        self._connectors: Dict[str, BaseConnector] = {}

    async def initialize(self):
        """Initialize service connections."""
        self.redis = redis.from_url(settings.REDIS_URL)
        self.clickhouse = ClickHouseClient(
            host=settings.CLICKHOUSE_HOST,
            port=settings.CLICKHOUSE_PORT,
            database=settings.CLICKHOUSE_DATABASE,
            user=settings.CLICKHOUSE_USER,
            password=settings.CLICKHOUSE_PASSWORD,
        )
        logger.info("StreamService initialized")

    async def shutdown(self):
        """Shutdown service and stop all streams."""
        # Stop all stream tasks
        for stream_id, task in self._stream_tasks.items():
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass

        # Disconnect all connectors
        for connector in self._connectors.values():
            try:
                await connector.disconnect()
            except Exception as e:
                logger.error(f"Error disconnecting connector: {e}")

        if self.redis:
            await self.redis.close()

        logger.info("StreamService shutdown complete")

    # ========== CRUD Operations ==========

    async def create_stream(self, create_data: DataStreamCreate) -> DataStream:
        """Create a new data stream."""
        stream_id = str(uuid4())
        now = datetime.utcnow()

        stream = DataStream(
            id=stream_id,
            name=create_data.name,
            description=create_data.description,
            team_id=create_data.team_id,
            destination=create_data.destination,
            schema=create_data.schema,
            filters=create_data.filters,
            partitioning=create_data.partitioning,
            delivery=create_data.delivery,
            status=StreamStatus.ACTIVE,
            created_at=now,
            updated_at=now,
        )

        # Store in Redis
        await self.redis.hset(
            f"stream:{stream_id}",
            mapping={"data": stream.model_dump_json()},
        )

        # Add to team's stream list
        await self.redis.sadd(f"team:{create_data.team_id}:streams", stream_id)

        # Start the stream processor
        await self._start_stream(stream)

        logger.info(f"Created stream: {stream_id}")
        return stream

    async def get_stream(self, stream_id: str) -> Optional[DataStream]:
        """Get a stream by ID."""
        data = await self.redis.hget(f"stream:{stream_id}", "data")
        if data:
            return DataStream.model_validate_json(data)
        return None

    async def list_streams(self, team_id: str) -> List[DataStream]:
        """List all streams for a team."""
        stream_ids = await self.redis.smembers(f"team:{team_id}:streams")
        streams = []

        for stream_id in stream_ids:
            stream = await self.get_stream(stream_id)
            if stream and stream.status != StreamStatus.DELETED:
                streams.append(stream)

        return streams

    async def update_stream(
        self,
        stream_id: str,
        update_data: DataStreamUpdate,
    ) -> Optional[DataStream]:
        """Update a data stream."""
        stream = await self.get_stream(stream_id)
        if not stream:
            return None

        # Apply updates
        update_dict = update_data.model_dump(exclude_unset=True)
        for key, value in update_dict.items():
            if value is not None:
                setattr(stream, key, value)

        stream.updated_at = datetime.utcnow()

        # Save to Redis
        await self.redis.hset(
            f"stream:{stream_id}",
            mapping={"data": stream.model_dump_json()},
        )

        # Restart stream if needed
        if stream.status == StreamStatus.ACTIVE:
            await self._stop_stream(stream_id)
            await self._start_stream(stream)

        logger.info(f"Updated stream: {stream_id}")
        return stream

    async def delete_stream(self, stream_id: str) -> bool:
        """Delete a data stream."""
        stream = await self.get_stream(stream_id)
        if not stream:
            return False

        # Stop the stream
        await self._stop_stream(stream_id)

        # Mark as deleted
        stream.status = StreamStatus.DELETED
        stream.updated_at = datetime.utcnow()

        await self.redis.hset(
            f"stream:{stream_id}",
            mapping={"data": stream.model_dump_json()},
        )

        logger.info(f"Deleted stream: {stream_id}")
        return True

    # ========== Stream Processing ==========

    async def _start_stream(self, stream: DataStream) -> None:
        """Start processing a stream."""
        if stream.id in self._stream_tasks:
            return

        # Create connector
        connector = self._create_connector(stream)
        self._connectors[stream.id] = connector

        # Start processing task
        task = asyncio.create_task(
            self._process_stream(stream, connector)
        )
        self._stream_tasks[stream.id] = task

        logger.info(f"Started stream: {stream.id}")

    async def _stop_stream(self, stream_id: str) -> None:
        """Stop processing a stream."""
        # Cancel task
        if stream_id in self._stream_tasks:
            self._stream_tasks[stream_id].cancel()
            try:
                await self._stream_tasks[stream_id]
            except asyncio.CancelledError:
                pass
            del self._stream_tasks[stream_id]

        # Disconnect connector
        if stream_id in self._connectors:
            await self._connectors[stream_id].disconnect()
            del self._connectors[stream_id]

        logger.info(f"Stopped stream: {stream_id}")

    def _create_connector(self, stream: DataStream) -> BaseConnector:
        """Create a connector for the stream destination."""
        dest_type = stream.destination.type

        if dest_type == DestinationType.BIGQUERY:
            return BigQueryConnector(stream.destination, stream.schema)
        elif dest_type == DestinationType.S3:
            return S3Connector(stream.destination, stream.schema, stream.partitioning)
        elif dest_type == DestinationType.KAFKA:
            return KafkaConnector(stream.destination, stream.schema)
        elif dest_type == DestinationType.HTTP:
            return HTTPConnector(stream.destination, stream.schema)
        elif dest_type == DestinationType.SNOWFLAKE:
            return SnowflakeConnector(stream.destination, stream.schema)
        elif dest_type == DestinationType.AZURE_BLOB:
            return AzureBlobConnector(stream.destination, stream.schema, stream.partitioning)
        elif dest_type == DestinationType.GCS:
            return GCSConnector(stream.destination, stream.schema, stream.partitioning)
        else:
            raise ValueError(f"Unsupported destination type: {dest_type}")

    async def _process_stream(
        self,
        stream: DataStream,
        connector: BaseConnector,
    ) -> None:
        """Process events for a stream."""
        batch_buffer: List[Dict[str, Any]] = []
        last_flush = datetime.utcnow()

        try:
            await connector.connect()

            while True:
                # Get events from queue
                event_data = await self.redis.lpop(f"stream:{stream.id}:events")

                if event_data:
                    event = json.loads(event_data)
                    if self._matches_filters(event, stream.filters):
                        batch_buffer.append(event)

                # Check if we should flush
                should_flush = (
                    len(batch_buffer) >= stream.delivery.batch_size or
                    (datetime.utcnow() - last_flush).total_seconds() >=
                    stream.delivery.batch_interval_seconds
                )

                if should_flush and batch_buffer:
                    try:
                        result = await connector.send_batch(
                            batch_buffer,
                            stream.delivery.batch_size,
                        )
                        await self._update_stats(
                            stream.id,
                            result["sent"],
                            result["failed"],
                        )
                        batch_buffer = []
                        last_flush = datetime.utcnow()

                    except Exception as e:
                        logger.error(f"Error sending batch: {e}")
                        await self._update_stream_error(stream.id, str(e))

                # Small delay to prevent busy loop
                await asyncio.sleep(0.1)

        except asyncio.CancelledError:
            # Flush remaining events
            if batch_buffer:
                try:
                    await connector.send_batch(batch_buffer, len(batch_buffer))
                except Exception as e:
                    logger.error(f"Error flushing final batch: {e}")
            raise

        except Exception as e:
            logger.error(f"Stream processing error: {e}")
            await self._update_stream_error(stream.id, str(e))

    def _matches_filters(self, event: Dict[str, Any], filters) -> bool:
        """Check if event matches stream filters."""
        # Team filter
        if filters.team_ids and event.get("team_id") not in filters.team_ids:
            return False

        # Link filter
        if filters.link_ids and event.get("link_id") not in filters.link_ids:
            return False

        # Campaign filter
        if filters.campaign_ids and event.get("campaign_id") not in filters.campaign_ids:
            return False

        # Country filter
        if filters.countries and event.get("country") not in filters.countries:
            return False

        # Device filter
        if filters.devices and event.get("device_type") not in filters.devices:
            return False

        # Bot filter
        if filters.exclude_bots and event.get("is_bot", False):
            return False

        return True

    async def _update_stats(
        self,
        stream_id: str,
        sent: int,
        failed: int,
    ) -> None:
        """Update stream statistics."""
        await self.redis.hincrby(f"stream:{stream_id}:stats", "events_sent", sent)
        await self.redis.hincrby(f"stream:{stream_id}:stats", "events_failed", failed)
        await self.redis.hset(
            f"stream:{stream_id}:stats",
            "last_event_at",
            datetime.utcnow().isoformat(),
        )

    async def _update_stream_error(self, stream_id: str, error: str) -> None:
        """Update stream with error status."""
        stream = await self.get_stream(stream_id)
        if stream:
            stream.status = StreamStatus.ERROR
            stream.error_message = error
            stream.updated_at = datetime.utcnow()

            await self.redis.hset(
                f"stream:{stream_id}",
                mapping={"data": stream.model_dump_json()},
            )

    # ========== Event Publishing ==========

    async def publish_event(self, event: Dict[str, Any]) -> None:
        """Publish an event to all matching streams."""
        team_id = event.get("team_id")
        if not team_id:
            return

        # Get all active streams for the team
        stream_ids = await self.redis.smembers(f"team:{team_id}:streams")

        for stream_id in stream_ids:
            stream = await self.get_stream(stream_id)
            if stream and stream.status == StreamStatus.ACTIVE:
                # Add to stream's event queue
                await self.redis.rpush(
                    f"stream:{stream_id}:events",
                    json.dumps(event, default=str),
                )

    # ========== Connection Testing ==========

    async def test_connection(self, stream_id: str) -> TestConnectionResult:
        """Test connection for a stream."""
        stream = await self.get_stream(stream_id)
        if not stream:
            return TestConnectionResult(
                success=False,
                message="Stream not found",
            )

        connector = self._create_connector(stream)
        result = await connector.test_connection()
        return result

    # ========== Statistics ==========

    async def get_stats(self, stream_id: str) -> Optional[StreamStats]:
        """Get statistics for a stream."""
        stats_data = await self.redis.hgetall(f"stream:{stream_id}:stats")
        if not stats_data:
            return None

        return StreamStats(
            stream_id=stream_id,
            events_sent=int(stats_data.get("events_sent", 0)),
            events_failed=int(stats_data.get("events_failed", 0)),
            bytes_sent=int(stats_data.get("bytes_sent", 0)),
            last_event_at=datetime.fromisoformat(stats_data["last_event_at"])
            if stats_data.get("last_event_at")
            else None,
            last_error_at=datetime.fromisoformat(stats_data["last_error_at"])
            if stats_data.get("last_error_at")
            else None,
            last_error_message=stats_data.get("last_error_message"),
            avg_latency_ms=float(stats_data.get("avg_latency_ms", 0)),
            period_start=datetime.utcnow(),
            period_end=datetime.utcnow(),
        )

    # ========== Backfill ==========

    async def create_backfill(
        self,
        stream_id: str,
        request: BackfillRequest,
    ) -> BackfillJob:
        """Create a backfill job for historical data."""
        stream = await self.get_stream(stream_id)
        if not stream:
            raise ValueError("Stream not found")

        job_id = str(uuid4())
        now = datetime.utcnow()

        job = BackfillJob(
            id=job_id,
            stream_id=stream_id,
            status="pending",
            progress=0,
            total_events=0,
            processed_events=0,
            start_date=request.start_date,
            end_date=request.end_date,
            created_at=now,
        )

        # Store job
        await self.redis.hset(
            f"backfill:{job_id}",
            mapping={"data": job.model_dump_json()},
        )

        # Start backfill task
        asyncio.create_task(self._process_backfill(job, stream, request.filters))

        return job

    async def get_backfill_job(self, job_id: str) -> Optional[BackfillJob]:
        """Get a backfill job by ID."""
        data = await self.redis.hget(f"backfill:{job_id}", "data")
        if data:
            return BackfillJob.model_validate_json(data)
        return None

    async def _process_backfill(
        self,
        job: BackfillJob,
        stream: DataStream,
        filters: Optional[Any] = None,
    ) -> None:
        """Process a backfill job."""
        try:
            # Update job status
            job.status = "processing"
            job.started_at = datetime.utcnow()
            await self.redis.hset(
                f"backfill:{job.id}",
                mapping={"data": job.model_dump_json()},
            )

            # Query historical data from ClickHouse
            connector = self._create_connector(stream)
            await connector.connect()

            # Build query
            query = f"""
                SELECT *
                FROM clicks
                WHERE timestamp >= '{job.start_date.isoformat()}'
                AND timestamp <= '{job.end_date.isoformat()}'
            """

            if stream.filters.team_ids:
                team_ids = "','".join(stream.filters.team_ids)
                query += f" AND team_id IN ('{team_ids}')"

            if stream.filters.link_ids:
                link_ids = "','".join(stream.filters.link_ids)
                query += f" AND link_id IN ('{link_ids}')"

            query += " ORDER BY timestamp"

            # Execute query and stream results
            result = self.clickhouse.execute(query, with_column_types=True)
            columns = [col[0] for col in result[1]]
            rows = result[0]

            job.total_events = len(rows)

            # Process in batches
            batch_size = stream.delivery.batch_size
            for i in range(0, len(rows), batch_size):
                batch = rows[i:i + batch_size]
                events = [dict(zip(columns, row)) for row in batch]

                await connector.send(events)

                job.processed_events += len(batch)
                job.progress = int((job.processed_events / job.total_events) * 100)

                await self.redis.hset(
                    f"backfill:{job.id}",
                    mapping={"data": job.model_dump_json()},
                )

            # Complete
            job.status = "completed"
            job.progress = 100
            job.completed_at = datetime.utcnow()

            await connector.disconnect()

        except Exception as e:
            job.status = "failed"
            job.error_message = str(e)
            logger.error(f"Backfill job {job.id} failed: {e}")

        finally:
            await self.redis.hset(
                f"backfill:{job.id}",
                mapping={"data": job.model_dump_json()},
            )


# Singleton instance
stream_service = StreamService()
