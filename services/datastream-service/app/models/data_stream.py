"""Data Stream models for Custom Data Streams API."""

from datetime import datetime
from enum import Enum
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


class DestinationType(str, Enum):
    BIGQUERY = "bigquery"
    REDSHIFT = "redshift"
    SNOWFLAKE = "snowflake"
    S3 = "s3"
    GCS = "gcs"
    AZURE_BLOB = "azure_blob"
    KAFKA = "kafka"
    HTTP = "http"


class DeliveryMode(str, Enum):
    REALTIME = "realtime"
    BATCH = "batch"


class FileFormat(str, Enum):
    JSON = "json"
    NDJSON = "ndjson"
    PARQUET = "parquet"
    CSV = "csv"
    AVRO = "avro"


class CompressionType(str, Enum):
    NONE = "none"
    GZIP = "gzip"
    SNAPPY = "snappy"
    LZ4 = "lz4"


class StreamStatus(str, Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    ERROR = "error"
    DELETED = "deleted"


class SchemaField(BaseModel):
    name: str
    type: str  # STRING, INT64, FLOAT64, TIMESTAMP, BOOLEAN, etc.
    mode: str = "NULLABLE"  # NULLABLE, REQUIRED, REPEATED
    description: Optional[str] = None


class SchemaConfig(BaseModel):
    mode: str = "auto"  # auto | custom
    fields: List[SchemaField] = []


# Destination-specific configurations

class BigQueryConfig(BaseModel):
    project_id: str
    dataset_id: str
    table_id: str
    credentials_json: Optional[str] = None  # Base64 encoded or path
    credentials_path: Optional[str] = None


class RedshiftConfig(BaseModel):
    host: str
    port: int = 5439
    database: str
    schema_name: str = "public"
    table_name: str
    username: str
    password: str
    iam_role: Optional[str] = None


class SnowflakeConfig(BaseModel):
    account: str
    warehouse: str
    database: str
    schema_name: str
    table_name: str
    user: str
    password: Optional[str] = None
    private_key: Optional[str] = None
    role: Optional[str] = None


class S3Config(BaseModel):
    bucket: str
    prefix: str = ""
    region: str = "us-east-1"
    access_key_id: Optional[str] = None
    secret_access_key: Optional[str] = None
    role_arn: Optional[str] = None
    endpoint_url: Optional[str] = None  # For MinIO or S3-compatible
    file_format: FileFormat = FileFormat.PARQUET
    compression: CompressionType = CompressionType.GZIP


class GCSConfig(BaseModel):
    bucket_name: str
    prefix: str = ""
    project_id: str
    credentials_json: Optional[str] = None
    credentials_path: Optional[str] = None
    file_format: FileFormat = FileFormat.PARQUET
    compression: CompressionType = CompressionType.GZIP


class AzureBlobConfig(BaseModel):
    account_name: str
    container_name: str
    prefix: str = ""
    account_key: Optional[str] = None
    sas_token: Optional[str] = None
    connection_string: Optional[str] = None
    file_format: FileFormat = FileFormat.PARQUET
    compression: CompressionType = CompressionType.GZIP


class KafkaConfig(BaseModel):
    bootstrap_servers: str
    topic: str
    security_protocol: str = "PLAINTEXT"
    sasl_mechanism: Optional[str] = None
    sasl_username: Optional[str] = None
    sasl_password: Optional[str] = None


class HTTPConfig(BaseModel):
    url: str
    method: str = "POST"
    headers: Dict[str, str] = {}
    auth_type: Optional[str] = None  # none, basic, bearer, api_key
    auth_value: Optional[str] = None
    timeout_seconds: int = 30
    retry_count: int = 3


class DestinationConfig(BaseModel):
    type: DestinationType
    bigquery: Optional[BigQueryConfig] = None
    redshift: Optional[RedshiftConfig] = None
    snowflake: Optional[SnowflakeConfig] = None
    s3: Optional[S3Config] = None
    gcs: Optional[GCSConfig] = None
    azure_blob: Optional[AzureBlobConfig] = None
    kafka: Optional[KafkaConfig] = None
    http: Optional[HTTPConfig] = None


class StreamFilters(BaseModel):
    team_ids: List[str] = []
    link_ids: List[str] = []
    link_tags: List[str] = []
    campaign_ids: List[str] = []
    countries: List[str] = []
    devices: List[str] = []
    exclude_bots: bool = True


class PartitioningConfig(BaseModel):
    enabled: bool = True
    pattern: str = "year={YYYY}/month={MM}/day={DD}/hour={HH}"


class DeliveryConfig(BaseModel):
    mode: DeliveryMode = DeliveryMode.BATCH
    batch_size: int = 1000
    batch_interval_seconds: int = 60
    max_retries: int = 3
    retry_backoff_seconds: int = 30


class DataStreamCreate(BaseModel):
    name: str
    description: Optional[str] = None
    team_id: str
    destination: DestinationConfig
    schema: SchemaConfig = Field(default_factory=SchemaConfig)
    filters: StreamFilters = Field(default_factory=StreamFilters)
    partitioning: PartitioningConfig = Field(default_factory=PartitioningConfig)
    delivery: DeliveryConfig = Field(default_factory=DeliveryConfig)


class DataStreamUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    destination: Optional[DestinationConfig] = None
    schema: Optional[SchemaConfig] = None
    filters: Optional[StreamFilters] = None
    partitioning: Optional[PartitioningConfig] = None
    delivery: Optional[DeliveryConfig] = None
    status: Optional[StreamStatus] = None


class DataStream(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    team_id: str
    destination: DestinationConfig
    schema: SchemaConfig
    filters: StreamFilters
    partitioning: PartitioningConfig
    delivery: DeliveryConfig
    status: StreamStatus = StreamStatus.ACTIVE
    created_at: datetime
    updated_at: datetime
    last_sync_at: Optional[datetime] = None
    error_message: Optional[str] = None


class StreamStats(BaseModel):
    stream_id: str
    events_sent: int = 0
    events_failed: int = 0
    bytes_sent: int = 0
    last_event_at: Optional[datetime] = None
    last_error_at: Optional[datetime] = None
    last_error_message: Optional[str] = None
    avg_latency_ms: float = 0
    period_start: datetime
    period_end: datetime


class BackfillRequest(BaseModel):
    start_date: datetime
    end_date: datetime
    filters: Optional[StreamFilters] = None


class BackfillJob(BaseModel):
    id: str
    stream_id: str
    status: str  # pending, processing, completed, failed
    progress: int = 0
    total_events: int = 0
    processed_events: int = 0
    start_date: datetime
    end_date: datetime
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None


class TestConnectionResult(BaseModel):
    success: bool
    message: str
    latency_ms: Optional[float] = None
    details: Dict[str, Any] = {}
