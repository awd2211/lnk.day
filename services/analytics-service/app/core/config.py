from pydantic_settings import BaseSettings


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

    # Celery
    CELERY_BROKER_URL: str = "redis://localhost:60031/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:60031/0"

    class Config:
        env_file = ".env"


settings = Settings()
