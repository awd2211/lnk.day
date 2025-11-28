from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    PORT: int = 60020
    DEBUG: bool = False

    # ClickHouse
    CLICKHOUSE_HOST: str = "localhost"
    CLICKHOUSE_PORT: int = 60032
    CLICKHOUSE_DATABASE: str = "lnk_analytics"
    CLICKHOUSE_USER: str = "default"
    CLICKHOUSE_PASSWORD: str = ""

    # Redis
    REDIS_URL: str = "redis://localhost:60031"

    # Kafka
    KAFKA_BROKERS: str = "localhost:60033"

    # RabbitMQ
    RABBITMQ_URL: str = "amqp://rabbit:rabbit123@localhost:60036"

    # Celery
    CELERY_BROKER_URL: str = "redis://localhost:60031/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:60031/0"

    # Security APIs
    GOOGLE_SAFE_BROWSING_API_KEY: Optional[str] = None
    VIRUSTOTAL_API_KEY: Optional[str] = None

    # Data Retention
    DATA_RETENTION_DAYS: int = 365
    TEMP_FILE_RETENTION_HOURS: int = 24

    # Task Scheduler
    SCHEDULER_ENABLED: bool = True
    SCHEDULER_TIMEZONE: str = "UTC"

    # External Services
    LINK_SERVICE_URL: str = "http://localhost:60003"
    NOTIFICATION_SERVICE_URL: str = "http://localhost:60020"

    class Config:
        env_file = ".env"


settings = Settings()
