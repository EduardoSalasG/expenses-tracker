# Architecture

The system follows clean architecture and hexagonal boundaries.

## Backend Layers

- Domain: entities, domain types, and value objects with no framework dependencies.
- Application: use cases, application services, and ports.
- Infrastructure: PostgreSQL repositories, messaging providers such as Telegram Bot API, JWT, OTP storage, provider-agnostic message interpretation, logging.
- Interfaces: Express route modules, provider-specific controllers/extractors, middleware, Zod schemas, Swagger/OpenAPI.

Dependencies point inward. Controllers call use cases. Use cases depend on ports. Infrastructure implements ports.

## Backend Module Layout

The backend is organized by clean architecture boundaries:

```text
backend/src
  domain/
    auth/
    categories/
    finance/
      money.ts
      payment-method.ts
      types.ts
    messaging/
    users/
    tenancy/
    types.ts
  application/
    ports/
      *.repository.ts
      *.provider.ts
      *.service.ts
    services/
      reporting.service.ts
      messaging-draft.service.ts
    use-cases/
      auth.use-cases.ts
      finance.use-cases.ts
      process-inbound-finance-message.use-case.ts
      send-due-reports.use-case.ts
      profile.use-cases.ts
  infrastructure/
    repositories/
      postgres.ts
      in-memory.ts
    container.ts
    database.ts
    token.service.ts
    messaging-providers/
      telegram.provider.ts
    message-interpreter.provider.ts
  interfaces/
    http/
      app.ts
      controllers/
      messaging-providers/
      routes/
      middleware/
      services/
      schemas.ts
      openapi.ts
```

`interfaces/http/app.ts` only composes Express middleware, Swagger, health checks, and route registration. Route modules bind URLs to controllers. Controllers parse provider-specific HTTP input and delegate provider-neutral orchestration to interface services when a flow is shared across providers. Application use cases coordinate domain/application rules through ports. Infrastructure adapters implement those ports.

## Tenancy

MVP tenancy is one tenant per user. Each tenant-scoped table has `tenant_id`, and authenticated requests use the tenant id from the JWT.

## Messaging Providers

Application use cases depend on provider-neutral messaging ports: `MessagingProvider`, `MessagingMessageAuditRepository`, and `MessagingPendingDraftRepository`. Infrastructure composes concrete providers through `ChannelMessagingRouter`, so use cases can request outbound messaging by channel without knowing provider APIs. Telegram is the active adapter and owns Telegram-specific webhook extraction and optional secret-token verification. The Telegram HTTP controller forwards extracted `InboundTextMessage` batches to `InboundMessagingService`, which invokes the provider-neutral finance-message use case. The same boundary is ready for additional providers such as WhatsApp later, without changing use-case contracts.

## Operational Hardening

- Liveness probe: `GET /health/live`
- Readiness probe: `GET /health/ready` (includes DB check for PostgreSQL mode)
- Graceful shutdown: `SIGINT` and `SIGTERM` close HTTP server and database pool.
- Scheduled report worker now logs batch duration and exits non-zero when there are failed deliveries, so schedulers can alert/retry.

## Telegram Sender Access

Telegram webhook updates may arrive from any chat that can reach the bot, so the backend keeps a defensive registered-user and linked-chat check. Unlinked or unknown chats receive account-link guidance instead of any tenant-scoped financial action.

## Messaging Idempotency

Inbound provider messages reserve their external message id in `messaging_messages.provider_message_id` before parsing or creating an expense. The database unique partial index is scoped by `channel` and rejects repeated webhook deliveries for the same provider id, and the use case returns `duplicate_ignored` without creating another expense.

If a new provider message has a different provider id but repeats the same text from the same sender/channel within two minutes, the backend treats it as a possible user-level duplicate. It stores a pending duplicate confirmation for 30 minutes, asks the user whether to `guardar` or `descartar`, and only creates the second movement after explicit confirmation.

## Messaging Clarifications

When a registered user sends an incomplete finance message, the backend stores one active `messaging_pending_drafts` row for that tenant/user/channel. The next provider reply can add missing fields such as payment method, confirm the draft, or cancel it. Drafts expire after 30 minutes.

## Currency

MVP uses the user's preferred currency as tenant-level parametrization for messaging-created expenses and incomes. Telegram messages do not choose currency per movement. Manual screens may still expose currency fields while the UI is being tightened, but the product direction is one working currency per consumer tenant. Cross-currency conversion is intentionally out of scope.

## Documentation Contract

Swagger, READMEs, diagrams, and query analysis are part of the definition of done.

## Docker Images

Each runtime boundary has its own image:

- Backend API: `backend/Dockerfile`
- Frontend web app: `frontend/Dockerfile`
- PostgreSQL database with migrations and seeds: `database/Dockerfile`
