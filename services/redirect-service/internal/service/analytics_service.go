package service

import (
	"context"
	"encoding/json"
	"log"
	"net"
	"time"

	"github.com/google/uuid"
	"github.com/mssola/user_agent"
	"github.com/oschwald/geoip2-golang"
	"github.com/segmentio/kafka-go"

	"github.com/lnkday/redirect-service/internal/config"
	"github.com/lnkday/redirect-service/internal/model"
)

type AnalyticsService struct {
	cfg            *config.Config
	geoipDB        *geoip2.Reader
	kafkaWriter    *kafka.Writer
	rabbitmqSvc    *RabbitMQService
}

func NewAnalyticsService(cfg *config.Config) *AnalyticsService {
	svc := &AnalyticsService{cfg: cfg}

	// Initialize GeoIP database
	if cfg.GeoIPPath != "" {
		db, err := geoip2.Open(cfg.GeoIPPath)
		if err != nil {
			log.Printf("Warning: Failed to open GeoIP database: %v", err)
		} else {
			svc.geoipDB = db
		}
	}

	// Initialize RabbitMQ (primary messaging)
	svc.rabbitmqSvc = NewRabbitMQService(cfg)

	// Initialize Kafka writer (fallback/secondary)
	if cfg.KafkaBrokers != "" {
		svc.kafkaWriter = &kafka.Writer{
			Addr:         kafka.TCP(cfg.KafkaBrokers),
			Topic:        "click-events",
			Balancer:     &kafka.LeastBytes{},
			BatchSize:    100,
			BatchTimeout: 10 * time.Millisecond,
			Async:        true,
		}
	}

	return svc
}

func (s *AnalyticsService) Close() {
	if s.geoipDB != nil {
		s.geoipDB.Close()
	}
	if s.rabbitmqSvc != nil {
		s.rabbitmqSvc.Close()
	}
	if s.kafkaWriter != nil {
		s.kafkaWriter.Close()
	}
}

func (s *AnalyticsService) TrackClick(event *model.ClickEvent) {
	// Parse user agent
	ua := user_agent.New(event.UserAgent)

	browserName, browserVersion := ua.Browser()
	event.Browser = browserName + " " + browserVersion
	event.OS = ua.OS()

	if ua.Mobile() {
		event.Device = "mobile"
	} else if ua.Bot() {
		event.Device = "bot"
	} else {
		event.Device = "desktop"
	}

	// Generate ID
	event.ID = uuid.New().String()
	event.Timestamp = time.Now().UTC()

	// Send to RabbitMQ (primary)
	if s.rabbitmqSvc != nil && s.rabbitmqSvc.IsConnected() {
		if err := s.rabbitmqSvc.PublishClickEvent(event); err != nil {
			log.Printf("Failed to publish to RabbitMQ: %v", err)
		}
	}

	// Send to Kafka (secondary/fallback)
	if s.kafkaWriter != nil {
		s.sendToKafka(event)
	}

	// Log if no messaging available
	if (s.rabbitmqSvc == nil || !s.rabbitmqSvc.IsConnected()) && s.kafkaWriter == nil {
		log.Printf("Click tracked (no messaging): link=%s, country=%s, device=%s", event.LinkID, event.Country, event.Device)
	}
}

func (s *AnalyticsService) sendToKafka(event *model.ClickEvent) {
	data, err := json.Marshal(event)
	if err != nil {
		log.Printf("Failed to marshal click event: %v", err)
		return
	}

	err = s.kafkaWriter.WriteMessages(context.Background(),
		kafka.Message{
			Key:   []byte(event.LinkID),
			Value: data,
		},
	)

	if err != nil {
		log.Printf("Failed to send click event to Kafka: %v", err)
	}
}

func (s *AnalyticsService) ParseGeoIP(ip string) (country, region, city string) {
	if s.geoipDB == nil {
		return "Unknown", "", ""
	}

	parsedIP := net.ParseIP(ip)
	if parsedIP == nil {
		return "Unknown", "", ""
	}

	record, err := s.geoipDB.City(parsedIP)
	if err != nil {
		return "Unknown", "", ""
	}

	country = record.Country.IsoCode
	if country == "" {
		country = "Unknown"
	}

	if len(record.Subdivisions) > 0 {
		region = record.Subdivisions[0].Names["en"]
	}

	city = record.City.Names["en"]

	return country, region, city
}
