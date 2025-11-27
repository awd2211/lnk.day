package config

import (
	"os"
)

type Config struct {
	Port            string
	RedisURL        string
	KafkaBrokers    string
	GeoIPPath       string
	CacheTTL        int
	ClickHouseURL   string
	LinkServiceURL  string
	InternalAPIKey  string
	RabbitMQURL     string
}

func Load() *Config {
	return &Config{
		Port:            getEnv("PORT", "60001"),
		RedisURL:        getEnv("REDIS_URL", "redis://localhost:60031"),
		KafkaBrokers:    getEnv("KAFKA_BROKERS", "localhost:60033"),
		GeoIPPath:       getEnv("GEOIP_PATH", "./GeoLite2-City.mmdb"),
		CacheTTL:        300, // 5 minutes
		ClickHouseURL:   getEnv("CLICKHOUSE_URL", "tcp://localhost:60032"),
		LinkServiceURL:  getEnv("LINK_SERVICE_URL", "http://localhost:60003"),
		InternalAPIKey:  getEnv("INTERNAL_API_KEY", ""),
		RabbitMQURL:     getEnv("RABBITMQ_URL", "amqp://rabbit:rabbit123@localhost:60036"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
