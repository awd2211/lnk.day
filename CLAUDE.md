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

# Type check a service
cd services/link-service && npx tsc --noEmit
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
# Start a service with PM2 (use environment variables)
DB_HOST=localhost DB_PORT=60030 DB_USER=postgres DB_PASSWORD=postgres DB_NAME=lnk_links PORT=60003 pm2 start services/link-service/dist/main.js --name link-service

# List running services
pm2 list

# View logs
pm2 logs service-name

# Restart service
pm2 restart service-name
```

## Architecture

### Monorepo Structure

```
lnk.day/
├── frontend/           # React apps (Vite + TypeScript)
│   ├── user-portal/        # User-facing app → api-gateway (60010)
│   └── console-dashboard/  # Admin console → console-service (60011)
├── services/           # Backend microservices
│   ├── api-gateway/        # Unified entry for user-portal
│   ├── user-service/       # Auth, users, teams, quota, billing
│   ├── link-service/       # Link CRUD, folders, templates, redirect-rules
│   ├── campaign-service/   # Marketing campaigns, goals
│   ├── qr-service/         # QR code generation
│   ├── page-service/       # Landing pages, bio-links, comments
│   ├── deeplink-service/   # Mobile deep links
│   ├── notification-service/ # Email, SMS, webhooks, Slack, Teams
│   ├── console-service/    # Admin APIs (proxy to other services)
│   ├── domain-service/     # Custom domain management
│   ├── webhook-service/    # Webhook automation
│   ├── integration-service/ # Third-party integrations (Zapier, HubSpot, etc.)
│   ├── redirect-service/   # Go - high-perf redirects (60080)
│   ├── analytics-service/  # Python - ClickHouse analytics (60050)
│   └── datastream-service/ # Data export (60001)
├── packages/           # Shared packages
│   ├── nestjs-common/      # Guards, decorators, auth, permissions, RabbitMQ
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
│   Unified user API       │    │   Admin APIs + proxy        │
└──────────────┬───────────┘    └─────────────────────────────┘
               │
    ┌──────────┼──────────┬───────────┬───────────┐
    ▼          ▼          ▼           ▼           ▼
 user-svc   link-svc  campaign-svc  qr-svc   page-svc ...
```

### Service Ports (all 60000+)

| Service | Port | Database |
|---------|------|----------|
| api-gateway | 60000 | lnk_gateway |
| user-service | 60002 | lnk_users |
| link-service | 60003 | lnk_links |
| campaign-service | 60004 | lnk_campaigns |
| qr-service | 60005 | lnk_qr |
| page-service | 60007 | lnk_pages |
| deeplink-service | 60008 | lnk_deeplinks |
| console-service | 60009 | lnk_console |
| domain-service | 60014 | lnk_domains |
| integration-service | 60016 | lnk_integrations |
| webhook-service | 60017 | lnk_webhooks |
| notification-service | 60020 | lnk_notifications |
| analytics-service | 60050 | ClickHouse |
| redirect-service | 60080 | Redis only |

### Infrastructure Ports

| Service | Port | Credentials |
|---------|------|-------------|
| PostgreSQL | 60030 | postgres/postgres |
| Redis | 60031 | - |
| ClickHouse TCP | 60032 | - |
| ClickHouse HTTP | 60034 | - |
| Meilisearch | 60035 | meilisearch-master-key-change-in-production |
| RabbitMQ AMQP | 60036 | rabbit/rabbit123 |
| RabbitMQ Management | 60037 | rabbit/rabbit123 |
| MinIO API | 60006 | minio/minio123 |

## Authentication & Authorization

### Guard Stack (order matters)

Controllers use this guard chain: `@UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)`

1. **JwtAuthGuard**: Validates JWT token, attaches `request.user`
2. **ScopeGuard**: Validates user can access the team, sets `request.scopedTeamId`
3. **PermissionGuard**: Checks user has required permissions

### Key Decorators (from `@lnk/nestjs-common`)

```typescript
// Parameter decorators
@CurrentUser() user: AuthenticatedUser    // Get authenticated user
@ScopedTeamId() teamId: string            // Get validated team ID (from ScopeGuard)

// Permission decorators
@RequirePermissions(Permission.LINKS_VIEW)  // Require specific permission
@OwnerOnly()                                // Only team OWNER role
@AdminOnly()                                // Only platform admins
@Public()                                   // Skip auth entirely
```

### JWT Payload Structure

```typescript
{
  sub: string;           // User ID
  email: string;
  type: 'user' | 'admin';
  scope: {
    level: 'platform' | 'team' | 'personal';
    teamId?: string;     // Required for team/personal scope
  };
  role: string;          // OWNER | ADMIN | MEMBER | VIEWER (or admin roles)
  permissions: string[]; // ['links:view', 'links:create', ...]
}
```

### Permission System

- User permissions: `resource:action` format (e.g., `links:view`, `settings:edit`)
- Admin permissions: `admin:resource:action` format (e.g., `admin:users:view`)
- Team OWNER bypasses permission checks for non-admin permissions
- Platform SUPER_ADMIN has all permissions

## API Gateway Proxy

The api-gateway (`services/api-gateway/src/modules/proxy/proxy.service.ts`) routes requests:

- `/api/auth/*`, `/api/users/*`, `/api/teams/*`, `/api/quota/*` → user-service (60002)
- `/api/links/*`, `/api/folders/*` → link-service (60003)
- `/api/campaigns/*` → campaign-service (60004)
- `/api/qr/*` → qr-service (60005)
- `/api/pages/*`, `/api/bio-links/*`, `/api/comments/*` → page-service (60007)
- `/api/analytics/*` → analytics-service (60050)

Path transformation: `/api/links/123` → `http://localhost:60003/api/v1/links/123`

## NestJS Service Structure

```
services/{service-name}/
├── src/
│   ├── main.ts              # Bootstrap with URI versioning (/api/v1)
│   ├── app.module.ts        # Root module
│   └── modules/
│       └── {feature}/
│           ├── {feature}.module.ts
│           ├── {feature}.controller.ts
│           ├── {feature}.service.ts
│           ├── dto/
│           │   ├── create-{feature}.dto.ts
│           │   └── update-{feature}.dto.ts
│           └── entities/
│               └── {feature}.entity.ts
```

### Entity Pattern

All entities use TypeORM with common fields:
- `id`: UUID primary key
- `teamId`: Owner team reference
- `createdAt`, `updatedAt`: Timestamps

## Frontend Structure

```
frontend/{app}/
├── src/
│   ├── App.tsx              # Main app with React Router
│   ├── lib/api.ts           # Axios instance with auth interceptor
│   ├── hooks/               # TanStack Query hooks (useLinks, useTeams, etc.)
│   ├── pages/               # Page components
│   └── components/          # Reusable UI components (shadcn/ui)
```

### API Client Pattern

```typescript
// hooks/useLinks.ts
export function useLinks() {
  return useQuery({
    queryKey: ['links'],
    queryFn: () => api.get('/api/v1/links').then(r => r.data),
  });
}
```

## Cross-Service Communication

- **Synchronous**: REST via api-gateway with circuit breaker
- **Asynchronous**: RabbitMQ exchanges (`click.events`, `link.events`, `notification.events`)
- **Internal calls**: Services use `x-internal-api-key` header for service-to-service auth

## Development Guidelines

- Use Chinese for user-facing communication
- All services use workspace dependencies: `@lnk/nestjs-common`, `@lnk/shared-types`
- Environment variables in `.env` (copy from `.env.example`)
- All ports in 60000+ range
- Entity fields use camelCase in TypeScript, snake_case in database
