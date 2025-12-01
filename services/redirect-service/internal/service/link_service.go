package service

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/go-redis/redis/v8"

	"github.com/lnkday/redirect-service/internal/config"
	"github.com/lnkday/redirect-service/internal/model"
)

type LinkService struct {
	redis      *redis.Client
	httpClient *http.Client
	cfg        *config.Config
}

func NewLinkService(cfg *config.Config) (*LinkService, error) {
	// Connect to Redis
	opt, err := redis.ParseURL(cfg.RedisURL)
	if err != nil {
		return nil, fmt.Errorf("failed to parse redis URL: %w", err)
	}

	rdb := redis.NewClient(opt)
	if err := rdb.Ping(context.Background()).Err(); err != nil {
		return nil, fmt.Errorf("failed to connect to redis: %w", err)
	}

	return &LinkService{
		redis: rdb,
		httpClient: &http.Client{
			Timeout: 5 * time.Second,
		},
		cfg: cfg,
	}, nil
}

func (s *LinkService) Close() {
	s.redis.Close()
}

func (s *LinkService) GetByShortCode(ctx context.Context, code string) (*model.Link, error) {
	// Try cache first
	cacheKey := fmt.Sprintf("link:%s", code)
	cached, err := s.redis.Get(ctx, cacheKey).Result()
	if err == nil {
		var link model.Link
		if err := json.Unmarshal([]byte(cached), &link); err == nil {
			return &link, nil
		}
	}

	// Call link-service internal API
	url := fmt.Sprintf("%s/api/v1/links/internal/code/%s", s.cfg.LinkServiceURL, code)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("x-internal-api-key", s.cfg.InternalAPIKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to call link-service: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return nil, nil
	}

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("link-service returned status %d: %s", resp.StatusCode, string(body))
	}

	var link model.Link
	if err := json.NewDecoder(resp.Body).Decode(&link); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	// Cache the result
	if data, err := json.Marshal(link); err == nil {
		s.redis.Set(ctx, cacheKey, data, time.Duration(s.cfg.CacheTTL)*time.Second)
	}

	return &link, nil
}

func (s *LinkService) IncrementClicks(ctx context.Context, linkID string) error {
	// Call link-service internal API
	url := fmt.Sprintf("%s/api/v1/links/internal/clicks/%s", s.cfg.LinkServiceURL, linkID)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("x-internal-api-key", s.cfg.InternalAPIKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to call link-service: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusCreated {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("link-service returned status %d: %s", resp.StatusCode, string(body))
	}

	return nil
}

func (s *LinkService) InvalidateCache(ctx context.Context, code string) error {
	cacheKey := fmt.Sprintf("link:%s", code)
	return s.redis.Del(ctx, cacheKey).Err()
}
