package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/joho/godotenv"

	"github.com/lnkday/redirect-service/internal/config"
	"github.com/lnkday/redirect-service/internal/handler"
	"github.com/lnkday/redirect-service/internal/service"
)

// Version information
const Version = "1.0.0"

func main() {
	// Load .env file
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	// Initialize config
	cfg := config.Load()

	// Initialize services
	linkService, err := service.NewLinkService(cfg)
	if err != nil {
		log.Fatalf("Failed to initialize link service: %v", err)
	}
	defer linkService.Close()

	analyticsService := service.NewAnalyticsService(cfg)
	defer analyticsService.Close()

	// Initialize rule service
	ruleService := service.NewRuleService()

	// Initialize cache invalidation service (RabbitMQ consumer)
	cacheInvalidationService, err := service.NewCacheInvalidationService(cfg, linkService)
	if err != nil {
		log.Printf("Warning: Failed to initialize cache invalidation service: %v", err)
		log.Println("Cache invalidation via RabbitMQ will not be available")
	} else {
		defer cacheInvalidationService.Close()
		ctx, cancel := context.WithCancel(context.Background())
		defer cancel()
		if err := cacheInvalidationService.Start(ctx); err != nil {
			log.Printf("Warning: Failed to start cache invalidation service: %v", err)
		}
	}

	// Initialize Fiber app
	app := fiber.New(fiber.Config{
		DisableStartupMessage: true,
		ErrorHandler:          handler.ErrorHandler,
	})

	// Middleware
	app.Use(recover.New())
	app.Use(logger.New(logger.Config{
		Format: "[${time}] ${status} - ${latency} ${method} ${path}\n",
	}))
	app.Use(cors.New())

	// Initialize handlers
	redirectHandler := handler.NewRedirectHandler(linkService, analyticsService, ruleService)

	// Health check
	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{
			"status":    "ok",
			"service":   "redirect-service",
			"version":   Version,
			"timestamp": time.Now().Format(time.RFC3339),
		})
	})

	// Redirect routes
	app.Post("/:code/verify", redirectHandler.VerifyPassword)
	app.Get("/:code", redirectHandler.Redirect)

	// Graceful shutdown
	go func() {
		if err := app.Listen(":" + cfg.Port); err != nil {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	log.Printf("Redirect Service running on port %s", cfg.Port)

	// Wait for interrupt signal
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	log.Println("Shutting down server...")
	if err := app.Shutdown(); err != nil {
		log.Fatalf("Server shutdown failed: %v", err)
	}
}
