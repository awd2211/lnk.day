package service

import (
	"encoding/json"
	"log"
	"time"

	"github.com/google/uuid"
	amqp "github.com/rabbitmq/amqp091-go"

	"github.com/lnkday/redirect-service/internal/config"
	"github.com/lnkday/redirect-service/internal/model"
)

const (
	// Exchange names
	ClickEventsExchange = "click.events"
	LinkEventsExchange  = "link.events"

	// Routing keys
	ClickRecordedKey = "click.recorded"
	ClickBatchKey    = "click.batch"
)

// ClickEventMessage represents a click event message for RabbitMQ
type ClickEventMessage struct {
	ID        string                 `json:"id"`
	Type      string                 `json:"type"`
	Timestamp string                 `json:"timestamp"`
	Source    string                 `json:"source"`
	Data      ClickEventData         `json:"data"`
}

type ClickEventData struct {
	LinkID      string `json:"linkId"`
	ShortCode   string `json:"shortCode"`
	Timestamp   string `json:"timestamp"`
	IP          string `json:"ip,omitempty"`
	UserAgent   string `json:"userAgent,omitempty"`
	Referer     string `json:"referer,omitempty"`
	Country     string `json:"country,omitempty"`
	City        string `json:"city,omitempty"`
	Device      string `json:"device,omitempty"`
	Browser     string `json:"browser,omitempty"`
	OS          string `json:"os,omitempty"`
	IsBot       bool   `json:"isBot,omitempty"`
}

type RabbitMQService struct {
	cfg        *config.Config
	connection *amqp.Connection
	channel    *amqp.Channel
	connected  bool
}

func NewRabbitMQService(cfg *config.Config) *RabbitMQService {
	svc := &RabbitMQService{cfg: cfg}

	if cfg.RabbitMQURL != "" {
		if err := svc.connect(); err != nil {
			log.Printf("Warning: Failed to connect to RabbitMQ: %v. Service will continue without messaging.", err)
		}
	}

	return svc
}

func (s *RabbitMQService) connect() error {
	var err error

	// Connect to RabbitMQ
	s.connection, err = amqp.Dial(s.cfg.RabbitMQURL)
	if err != nil {
		return err
	}

	// Create channel
	s.channel, err = s.connection.Channel()
	if err != nil {
		s.connection.Close()
		return err
	}

	// Declare exchanges
	err = s.channel.ExchangeDeclare(
		ClickEventsExchange, // name
		"topic",             // type
		true,                // durable
		false,               // auto-deleted
		false,               // internal
		false,               // no-wait
		nil,                 // arguments
	)
	if err != nil {
		s.Close()
		return err
	}

	s.connected = true
	log.Println("RabbitMQ connected and exchanges configured")

	// Handle connection close
	go s.handleReconnect()

	return nil
}

func (s *RabbitMQService) handleReconnect() {
	closeNotify := s.connection.NotifyClose(make(chan *amqp.Error))

	for err := range closeNotify {
		log.Printf("RabbitMQ connection closed: %v. Attempting to reconnect...", err)
		s.connected = false

		for i := 0; i < 10; i++ {
			time.Sleep(time.Duration(i+1) * time.Second)
			if err := s.connect(); err == nil {
				log.Println("RabbitMQ reconnected successfully")
				return
			}
			log.Printf("RabbitMQ reconnection attempt %d failed", i+1)
		}
		log.Println("Failed to reconnect to RabbitMQ after 10 attempts")
	}
}

func (s *RabbitMQService) Close() {
	if s.channel != nil {
		s.channel.Close()
	}
	if s.connection != nil {
		s.connection.Close()
	}
	s.connected = false
}

func (s *RabbitMQService) IsConnected() bool {
	return s.connected
}

func (s *RabbitMQService) PublishClickEvent(event *model.ClickEvent) error {
	if !s.connected {
		return nil
	}

	isBot := event.Device == "bot"

	msg := ClickEventMessage{
		ID:        uuid.New().String(),
		Type:      "click.recorded",
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Source:    "redirect-service",
		Data: ClickEventData{
			LinkID:    event.LinkID,
			ShortCode: event.ShortCode,
			Timestamp: event.Timestamp.Format(time.RFC3339),
			IP:        event.IP,
			UserAgent: event.UserAgent,
			Referer:   event.Referer,
			Country:   event.Country,
			City:      event.City,
			Device:    event.Device,
			Browser:   event.Browser,
			OS:        event.OS,
			IsBot:     isBot,
		},
	}

	body, err := json.Marshal(msg)
	if err != nil {
		return err
	}

	err = s.channel.Publish(
		ClickEventsExchange, // exchange
		ClickRecordedKey,    // routing key
		false,               // mandatory
		false,               // immediate
		amqp.Publishing{
			ContentType:  "application/json",
			DeliveryMode: amqp.Persistent,
			MessageId:    msg.ID,
			Timestamp:    time.Now(),
			Body:         body,
		},
	)

	if err != nil {
		log.Printf("Failed to publish click event: %v", err)
		return err
	}

	return nil
}

func (s *RabbitMQService) PublishClickBatch(events []*model.ClickEvent) error {
	if !s.connected || len(events) == 0 {
		return nil
	}

	clickData := make([]ClickEventData, len(events))
	for i, event := range events {
		isBot := event.Device == "bot"
		clickData[i] = ClickEventData{
			LinkID:    event.LinkID,
			ShortCode: event.ShortCode,
			Timestamp: event.Timestamp.Format(time.RFC3339),
			IP:        event.IP,
			UserAgent: event.UserAgent,
			Referer:   event.Referer,
			Country:   event.Country,
			City:      event.City,
			Device:    event.Device,
			Browser:   event.Browser,
			OS:        event.OS,
			IsBot:     isBot,
		}
	}

	msg := struct {
		ID        string           `json:"id"`
		Type      string           `json:"type"`
		Timestamp string           `json:"timestamp"`
		Source    string           `json:"source"`
		Data      struct {
			Clicks []ClickEventData `json:"clicks"`
		} `json:"data"`
	}{
		ID:        uuid.New().String(),
		Type:      "click.batch",
		Timestamp: time.Now().UTC().Format(time.RFC3339),
		Source:    "redirect-service",
	}
	msg.Data.Clicks = clickData

	body, err := json.Marshal(msg)
	if err != nil {
		return err
	}

	err = s.channel.Publish(
		ClickEventsExchange, // exchange
		ClickBatchKey,       // routing key
		false,               // mandatory
		false,               // immediate
		amqp.Publishing{
			ContentType:  "application/json",
			DeliveryMode: amqp.Persistent,
			MessageId:    msg.ID,
			Timestamp:    time.Now(),
			Body:         body,
		},
	)

	if err != nil {
		log.Printf("Failed to publish click batch: %v", err)
		return err
	}

	log.Printf("Published batch of %d click events", len(events))
	return nil
}
