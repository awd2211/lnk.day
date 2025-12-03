package service

import (
	"context"
	"encoding/json"
	"log"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"

	"github.com/lnkday/redirect-service/internal/config"
)

const (
	linkEventsExchange        = "link.events"
	cacheInvalidationQueue    = "link.cache.invalidation"
)

// LinkEvent matches the format published by link-service
type LinkEvent struct {
	ID        string                 `json:"id"`
	Type      string                 `json:"type"`
	Timestamp string                 `json:"timestamp"`
	Source    string                 `json:"source"`
	Data      LinkEventData          `json:"data"`
}

type LinkEventData struct {
	LinkID       string                 `json:"linkId"`
	ShortCode    string                 `json:"shortCode"`
	OriginalUrl  string                 `json:"originalUrl,omitempty"`
	UserID       string                 `json:"userId,omitempty"`
	TeamID       string                 `json:"teamId,omitempty"`
	CampaignID   string                 `json:"campaignId,omitempty"`
	Changes      map[string]interface{} `json:"changes,omitempty"`
	OldShortCode string                 `json:"oldShortCode,omitempty"`
}

type CacheInvalidationService struct {
	conn        *amqp.Connection
	channel     *amqp.Channel
	linkService *LinkService
	cfg         *config.Config
	done        chan bool
}

func NewCacheInvalidationService(cfg *config.Config, linkService *LinkService) (*CacheInvalidationService, error) {
	conn, err := amqp.Dial(cfg.RabbitMQURL)
	if err != nil {
		return nil, err
	}

	ch, err := conn.Channel()
	if err != nil {
		conn.Close()
		return nil, err
	}

	// Declare exchange
	err = ch.ExchangeDeclare(
		linkEventsExchange,
		"topic",
		true,  // durable
		false, // auto-deleted
		false, // internal
		false, // no-wait
		nil,
	)
	if err != nil {
		ch.Close()
		conn.Close()
		return nil, err
	}

	// Declare queue
	_, err = ch.QueueDeclare(
		cacheInvalidationQueue,
		true,  // durable
		false, // delete when unused
		false, // exclusive
		false, // no-wait
		nil,
	)
	if err != nil {
		ch.Close()
		conn.Close()
		return nil, err
	}

	// Bind queue to exchange
	routingKeys := []string{"link.created", "link.updated", "link.deleted"}
	for _, key := range routingKeys {
		err = ch.QueueBind(
			cacheInvalidationQueue,
			key,
			linkEventsExchange,
			false,
			nil,
		)
		if err != nil {
			ch.Close()
			conn.Close()
			return nil, err
		}
	}

	return &CacheInvalidationService{
		conn:        conn,
		channel:     ch,
		linkService: linkService,
		cfg:         cfg,
		done:        make(chan bool),
	}, nil
}

func (s *CacheInvalidationService) Start(ctx context.Context) error {
	msgs, err := s.channel.Consume(
		cacheInvalidationQueue,
		"redirect-service", // consumer tag
		false,              // auto-ack
		false,              // exclusive
		false,              // no-local
		false,              // no-wait
		nil,
	)
	if err != nil {
		return err
	}

	log.Println("Cache invalidation consumer started")

	go func() {
		for {
			select {
			case <-ctx.Done():
				return
			case <-s.done:
				return
			case msg, ok := <-msgs:
				if !ok {
					log.Println("RabbitMQ channel closed")
					return
				}
				s.handleMessage(msg)
			}
		}
	}()

	return nil
}

func (s *CacheInvalidationService) handleMessage(msg amqp.Delivery) {
	var event LinkEvent
	if err := json.Unmarshal(msg.Body, &event); err != nil {
		log.Printf("Failed to unmarshal event: %v", err)
		msg.Nack(false, false)
		return
	}

	shortCode := event.Data.ShortCode
	log.Printf("Received event: %s for shortCode: %s", event.Type, shortCode)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Invalidate cache for the short code
	if err := s.linkService.InvalidateCache(ctx, shortCode); err != nil {
		log.Printf("Failed to invalidate cache for %s: %v", shortCode, err)
		msg.Nack(false, true) // requeue
		return
	}

	// Also invalidate old short code if it changed (for update events)
	if event.Data.OldShortCode != "" && event.Data.OldShortCode != shortCode {
		if err := s.linkService.InvalidateCache(ctx, event.Data.OldShortCode); err != nil {
			log.Printf("Failed to invalidate cache for old code %s: %v", event.Data.OldShortCode, err)
		}
	}

	// Check changes for short code updates
	if event.Data.Changes != nil {
		if oldCode, ok := event.Data.Changes["oldShortCode"].(string); ok && oldCode != "" && oldCode != shortCode {
			if err := s.linkService.InvalidateCache(ctx, oldCode); err != nil {
				log.Printf("Failed to invalidate cache for changed code %s: %v", oldCode, err)
			}
		}
	}

	log.Printf("Cache invalidated for shortCode: %s", shortCode)
	msg.Ack(false)
}

func (s *CacheInvalidationService) Close() {
	close(s.done)
	if s.channel != nil {
		s.channel.Close()
	}
	if s.conn != nil {
		s.conn.Close()
	}
}
