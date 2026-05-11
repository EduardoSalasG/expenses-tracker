# Architecture

The system follows clean architecture and hexagonal boundaries.

## Backend Layers

- Domain: entities, domain types, and value objects with no framework dependencies.
- Application: use cases, application services, and ports.
- Infrastructure: PostgreSQL repositories, messaging providers such as WhatsApp Cloud API, JWT, OTP storage, provider-agnostic message interpretation, logging.
- Interfaces: Express route modules, controllers, middleware, Zod schemas, Swagger/OpenAPI.

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
      process-whatsapp-expense.use-case.ts
      send-due-reports.use-case.ts
      profile.use-cases.ts
  infrastructure/
    repositories/
      postgres.ts
      in-memory.ts
    container.ts
    database.ts
    token.service.ts
    whatsapp.provider.ts
    message-interpreter.provider.ts
  interfaces/
    http/
      app.ts
      controllers/
      routes/
      middleware/
      schemas.ts
      openapi.ts
```

`interfaces/http/app.ts` only composes Express middleware, Swagger, health checks, and route registration. Route modules bind URLs to controllers. Controllers parse HTTP input and call application use cases. Application use cases coordinate domain/application rules through ports. Infrastructure adapters implement those ports.

## Tenancy

MVP tenancy is one tenant per user. Each tenant-scoped table has `tenant_id`, and authenticated requests use the tenant id from the JWT.

## Messaging Providers

Application use cases depend on provider-neutral messaging ports: `MessagingProvider`, `MessagingMessageAuditRepository`, and `MessagingPendingDraftRepository`. WhatsApp is the first adapter and owns WhatsApp-specific webhook parsing/signature verification. A future Telegram adapter should translate Telegram updates into the same inbound finance-message use case and implement the same outbound `MessagingProvider` contract.

## WhatsApp Sender Access

Development and test environments must use Meta's verified recipient/test number controls so only approved registered users can message the app number. In production, WhatsApp may still deliver inbound webhooks for anyone who messages the business number, so the backend keeps a defensive registered-user check and returns `200 OK` without parsing, saving, or replying to unregistered senders.

## WhatsApp Idempotency

Inbound provider messages reserve their external message id in `messaging_messages.provider_message_id` before parsing or creating an expense. The database unique partial index is scoped by `channel` and rejects repeated webhook deliveries for the same provider id, and the use case returns `duplicate_ignored` without creating another expense.

## WhatsApp Clarifications

When a registered user sends an incomplete finance message, the backend stores one active `messaging_pending_drafts` row for that tenant/user/channel. The next provider reply can add missing fields such as payment method, confirm the draft, or cancel it. Drafts expire after 30 minutes.

## Currency

MVP uses the user's preferred currency as tenant-level parametrization for WhatsApp-created expenses and incomes. WhatsApp messages do not choose currency per movement. Manual screens may still expose currency fields while the UI is being tightened, but the product direction is one working currency per consumer tenant. Cross-currency conversion is intentionally out of scope.

## Documentation Contract

Swagger, READMEs, diagrams, and query analysis are part of the definition of done.

## Docker Images

Each runtime boundary has its own image:

- Backend API: `backend/Dockerfile`
- Frontend web app: `frontend/Dockerfile`
- PostgreSQL database with migrations and seeds: `database/Dockerfile`
