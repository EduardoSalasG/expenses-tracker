# Architecture

The system follows clean architecture and hexagonal boundaries.

## Backend Layers

- Domain: entities and value types with no framework dependencies.
- Application: use cases and ports.
- Infrastructure: PostgreSQL, WhatsApp Cloud API, JWT, OTP storage, provider-agnostic message interpretation, logging.
- Interfaces: Express controllers, middleware, Zod schemas, Swagger/OpenAPI.

Dependencies point inward. Controllers call use cases. Use cases depend on ports. Infrastructure implements ports.

## Tenancy

MVP tenancy is one tenant per user. Each tenant-scoped table has `tenant_id`, and authenticated requests use the tenant id from the JWT.

## WhatsApp Sender Access

Development and test environments must use Meta's verified recipient/test number controls so only approved registered users can message the app number. In production, WhatsApp may still deliver inbound webhooks for anyone who messages the business number, so the backend keeps a defensive registered-user check and returns `200 OK` without parsing, saving, or replying to unregistered senders.

## WhatsApp Idempotency

Inbound WhatsApp messages reserve Meta's `messages[].id` in `whatsapp_messages.provider_message_id` before parsing or creating an expense. The database unique partial index rejects repeated webhook deliveries for the same provider id, and the use case returns `duplicate_ignored` without creating another expense.

## Currency

MVP uses the user's preferred currency as tenant-level parametrization for WhatsApp-created expenses and incomes. WhatsApp messages do not choose currency per movement. Manual screens may still expose currency fields while the UI is being tightened, but the product direction is one working currency per consumer tenant. Cross-currency conversion is intentionally out of scope.

## Documentation Contract

Swagger, READMEs, diagrams, and query analysis are part of the definition of done.

## Docker Images

Each runtime boundary has its own image:

- Backend API: `backend/Dockerfile`
- Frontend web app: `frontend/Dockerfile`
- PostgreSQL database with migrations and seeds: `database/Dockerfile`
