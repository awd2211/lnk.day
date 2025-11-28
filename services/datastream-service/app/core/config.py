from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    PORT: int = 60021
    DEBUG: bool = False

    # Kafka
    KAFKA_BOOTSTRAP_SERVERS: str = "localhost:60033"
    KAFKA_CLICK_TOPIC: str = "clicks"
    KAFKA_CONSUMER_GROUP: str = "datastream-service"

    # ClickHouse
    CLICKHOUSE_HOST: str = "localhost"
    CLICKHOUSE_PORT: int = 60032
    CLICKHOUSE_DATABASE: str = "lnk_analytics"
    CLICKHOUSE_USER: str = "default"
    CLICKHOUSE_PASSWORD: str = ""

    # Redis
    REDIS_URL: str = "redis://localhost:60031"

    # GeoIP
    GEOIP_PATH: str = "./GeoLite2-City.mmdb"

    # BigQuery
    BIGQUERY_PROJECT_ID: Optional[str] = None
    BIGQUERY_DATASET: str = "lnk_analytics"
    BIGQUERY_CREDENTIALS_PATH: Optional[str] = None  # Path to service account JSON

    # Snowflake
    SNOWFLAKE_ACCOUNT: Optional[str] = None
    SNOWFLAKE_USER: Optional[str] = None
    SNOWFLAKE_PASSWORD: Optional[str] = None
    SNOWFLAKE_DATABASE: str = "LNK_ANALYTICS"
    SNOWFLAKE_SCHEMA: str = "PUBLIC"
    SNOWFLAKE_WAREHOUSE: str = "COMPUTE_WH"

    # S3 / MinIO
    S3_ENDPOINT_URL: Optional[str] = None  # For MinIO or S3-compatible
    S3_ACCESS_KEY: Optional[str] = None
    S3_SECRET_KEY: Optional[str] = None
    S3_BUCKET: str = "lnk-exports"
    S3_REGION: str = "us-east-1"

    class Config:
        env_file = ".env"


settings = Settings()
