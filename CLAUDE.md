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
# Redirect service (Go) - runs on port 8080
cd services/redirect-service && go run cmd/main.go

# Analytics service (Python)
cd services/analytics-service && uvicorn app.main:app --reload
```

## Architecture

### Monorepo Structure

```
lnk.day/
├── frontend/           # React apps (Vite + TypeScript)
│   ├── user-portal/        # Main user-facing app (port 60010)
│   └── console-dashboard/  # Admin console
├── services/           # Backend microservices
│   ├── user-service/       # NestJS - auth, users, teams
│   ├── link-service/       # NestJS - link CRUD
│   ├── campaign-service/   # NestJS - marketing campaigns
│   ├── qr-service/         # NestJS - QR code generation
│   ├── page-service/       # NestJS - landing pages
│   ├── deeplink-service/   # NestJS - mobile deep links
│   ├── notification-service/ # NestJS - email/notifications
│   ├── console-service/    # NestJS - admin APIs
│   ├── redirect-service/   # Go (Fiber) - high-perf redirects
│   ├── analytics-service/  # Python (FastAPI) - ClickHouse analytics
│   └── datastream-service/ # Data export to BigQuery/S3/etc
├── packages/           # Shared packages
│   ├── shared-types/       # TypeScript types shared across services
│   ├── eslint-config/      # Shared ESLint configuration
│   └── tsconfig/           # Shared TypeScript configuration
└── docker/             # Docker configs for infrastructure
```

### Tech Stack by Service Type

- **Frontend**: React 18 + TypeScript + Vite + shadcn/ui + Tailwind CSS + TanStack Query
- **NestJS Services**: TypeScript + TypeORM + PostgreSQL + Redis
- **Redirect Service**: Go + Fiber + Redis (optimized for <100ms latency)
- **Analytics Service**: Python + FastAPI + ClickHouse + Celery

### Service Ports

| Service | Port | Tech |
|---------|------|------|
| api-gateway | 3000 | NestJS |
| user-service | 60002 | NestJS |
| link-service | 60003 | NestJS |
| campaign-service | 60004 | NestJS |
| qr-service | 60005 | NestJS |
| page-service | 60007 | NestJS |
| deeplink-service | 60008 | NestJS |
| console-service | 60009 | NestJS |
| user-portal | 60010 | Vite |
| domain-service | 60014 | NestJS |
| notification-service | 60020 | NestJS |
| redirect-service | 8080 | Go |
| analytics-service | 8000 | FastAPI |

### Infrastructure (docker-compose)

| Service | Port |
|---------|------|
| PostgreSQL | 5432 |
| Redis | 6379 |
| ClickHouse | 8123 (HTTP), 9000 (TCP) |
| MinIO | 9100 (API), 9101 (Console) |
| RabbitMQ | 5672 (AMQP), 15672 (Management) |
| Meilisearch | 7700 |

### Cross-Service Communication

- REST APIs for synchronous communication
- RabbitMQ for async messaging between services
- Shared types via `@lnk/shared-types` package

## Development Guidelines

- Use Chinese for user-facing communication (per user preference)
- NestJS services follow modular structure: `src/modules/{feature}/{feature}.module.ts`
- All services use workspace dependencies: `@lnk/shared-types`, `@lnk/eslint-config`, `@lnk/tsconfig`
- Environment variables are defined in `.env` (copy from `.env.example`)
