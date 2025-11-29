# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

lnk.day is an enterprise link management platform (Bitly alternative) with microservices architecture. The project uses a monorepo structure managed by pnpm and Turborepo.

## Common Commands

```bash
# Install dependencies
pnpm install

# Start all services in development mode
pnpm dev

# Build all packages and services
pnpm build

# Run linting
pnpm lint

# Run tests
pnpm test

# Format code
pnpm format

# Start infrastructure (databases, cache, etc.)
docker compose up -d
```

### Service-specific commands

```bash
# Run a single NestJS service
cd services/link-service && pnpm dev

# Run a single frontend app
cd frontend/user-portal && pnpm dev

# Run tests for a specific service
cd services/user-service && pnpm test
```

### Non-Node.js services

```bash
# Redirect service (Go)
cd services/redirect-service && go run cmd/main.go

# Analytics service (Python)
cd services/analytics-service && source venv/bin/activate && uvicorn app.main:app --host 0.0.0.0 --port 60050
```

### PM2 commands (production-like)

```bash
# Start all services with PM2
pm2 start /path/to/service/dist/main.js --name service-name

# List running services
pm2 list

# View logs
pm2 logs service-name

# Restart service
pm2 restart service-name

# Save PM2 configuration
pm2 save
```

## Architecture

### Monorepo Structure

```
lnk.day/
├── frontend/           # React apps (Vite + TypeScript)
│   ├── user-portal/        # User-facing app → api-gateway
│   └── console-dashboard/  # Admin console → console-service
├── services/           # Backend microservices
│   ├── api-gateway/        # Unified entry for user-portal
│   ├── user-service/       # Auth, users, teams
│   ├── link-service/       # Link CRUD, folders, templates
│   ├── campaign-service/   # Marketing campaigns, goals
│   ├── qr-service/         # QR code generation
│   ├── page-service/       # Landing pages, bio-links
│   ├── deeplink-service/   # Mobile deep links
│   ├── notification-service/ # Email, SMS, webhooks
│   ├── console-service/    # Admin APIs
│   ├── domain-service/     # Custom domain management
│   ├── webhook-service/    # Webhook automation (Make, n8n, etc.)
│   ├── integration-service/ # Third-party integrations (Zapier, HubSpot, Salesforce, Shopify)
│   ├── redirect-service/   # Go - high-perf redirects
│   ├── analytics-service/  # Python - ClickHouse analytics
│   └── datastream-service/ # Data export
├── packages/           # Shared packages
│   ├── shared-types/       # TypeScript types
│   ├── eslint-config/      # Shared ESLint config
│   └── tsconfig/           # Shared TypeScript config
└── docker/             # Docker configs
```

### API Routing Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       Frontend Apps                          │
├─────────────────────────────┬───────────────────────────────┤
│     user-portal (60010)     │   console-dashboard (60011)   │
└──────────────┬──────────────┴───────────────┬───────────────┘
               │                              │
               ▼                              ▼
┌──────────────────────────┐    ┌─────────────────────────────┐
│   api-gateway (60000)    │    │   console-service (60009)   │
│   Unified user API       │    │   Admin APIs                │
└──────────────┬───────────┘    └─────────────────────────────┘
               │
    ┌──────────┼──────────┬───────────┬───────────┐
    ▼          ▼          ▼           ▼           ▼
 user-svc   link-svc  campaign-svc  qr-svc   page-svc ...
```

### Tech Stack by Service Type

- **Frontend**: React 18 + TypeScript + Vite + shadcn/ui + Tailwind CSS + TanStack Query
- **NestJS Services**: TypeScript + TypeORM + PostgreSQL + Redis
- **Redirect Service**: Go + Fiber + Redis (optimized for <100ms latency)
- **Analytics Service**: Python + FastAPI + ClickHouse

### Service Ports (all 60000+)

| Service | Port | Tech |
|---------|------|------|
| api-gateway | 60000 | NestJS |
| datastream-service | 60001 | Python |
| user-service | 60002 | NestJS |
| link-service | 60003 | NestJS |
| campaign-service | 60004 | NestJS |
| qr-service | 60005 | NestJS |
| page-service | 60007 | NestJS |
| deeplink-service | 60008 | NestJS |
| console-service | 60009 | NestJS |
| user-portal | 60010 | Vite |
| console-dashboard | 60011 | Vite |
| domain-service | 60014 | NestJS |
| webhook-service | 60017 | NestJS |
| integration-service | 60016 | NestJS |
| notification-service | 60020 | NestJS |
| analytics-service | 60050 | FastAPI |
| redirect-service | 60080 | Go |

### Infrastructure Ports (docker-compose)

| Service | Port | Credentials |
|---------|------|-------------|
| PostgreSQL | 60030 | postgres/postgres |
| Redis | 60031 | - |
| ClickHouse TCP | 60032 | - |
| Kafka | 60033 | - |
| ClickHouse HTTP | 60034 | - |
| Meilisearch | 60035 | meilisearch-master-key-change-in-production |
| RabbitMQ AMQP | 60036 | rabbit/rabbit123 |
| RabbitMQ Management | 60037 | rabbit/rabbit123 |
| Prometheus | 60040 | - |
| Grafana | 60041 | admin/admin123 |
| Loki | 60042 | - |
| Jaeger UI | 60044 | - |
| MinIO API | 60006 | minio/minio123 |
| MinIO Console | 60007 | minio/minio123 |

### Cross-Service Communication

- **Synchronous**: REST APIs via api-gateway
- **Asynchronous**: RabbitMQ for event-driven messaging
- **Shared types**: `@lnk/shared-types` package

### RabbitMQ Exchanges & Queues

- `click.events` - Click tracking events
- `link.events` - Link CRUD events
- `notification.events` - Notification triggers

## Development Guidelines

- Use Chinese for user-facing communication (per user preference)
- NestJS services follow modular structure: `src/modules/{feature}/{feature}.module.ts`
- All services use workspace dependencies: `@lnk/shared-types`, `@lnk/eslint-config`, `@lnk/tsconfig`
- Environment variables are defined in `.env` (copy from `.env.example`)
- All ports should be in the 60000+ range for consistency
