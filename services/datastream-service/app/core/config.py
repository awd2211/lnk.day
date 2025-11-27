from pydantic_settings import BaseSettings


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

    class Config:
        env_file = ".env"


settings = Settings()
