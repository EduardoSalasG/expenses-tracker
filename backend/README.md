# Backend

Express API for the Expenses Tracker MVP.

## Stack

- Node.js + TypeScript
- Express
- Zod validation
- Winston logging
- PostgreSQL
- Swagger/OpenAPI at `/api/docs`
- Clean/hexagonal architecture

## Setup

```bash
pnpm install
cp backend/.env.example backend/.env
pnpm dev:db
pnpm --filter @expenses-tracker/backend dev
```

## Environment

- `PORT`: API port.
- `DATABASE_URL`: PostgreSQL connection string. For the Docker database from the host, use `postgres://expenses:expenses@localhost:5433/expenses_tracker`.
- `JWT_SECRET`: signing secret for access and refresh tokens.
- `WHATSAPP_VERIFY_TOKEN`: Meta webhook verification token.
- `WHATSAPP_APP_SECRET`: Meta app secret used to verify `x-hub-signature-256` webhook signatures.
- `WHATSAPP_ACCESS_TOKEN`: Meta API token.
- `WHATSAPP_PHONE_NUMBER_ID`: Meta sender phone number id.
- `WHATSAPP_BUSINESS_ACCOUNT_ID`: WhatsApp Business Account id from API Setup.
- `WHATSAPP_TEST_RECIPIENT_PHONE`: approved recipient number for local send tests.
- `MESSAGE_INTERPRETER_PROVIDER`: `deterministic`, `github-models`, or `openai-compatible`.
- `MESSAGE_INTERPRETER_API_KEY`: API key for the selected LLM provider. For GitHub Models, use a GitHub token with Models access. Leave empty to fall back to deterministic parsing.
- `MESSAGE_INTERPRETER_BASE_URL`: chat completions base URL. GitHub Models uses `https://models.github.ai/inference`.
- `MESSAGE_INTERPRETER_MODEL`: model name. For the planned GitHub Models setup, use `deepseek/DeepSeek-V3-0324`.
- `MESSAGE_INTERPRETER_TEMPERATURE`: low value recommended for structured financial extraction.
- `FRONTEND_ORIGIN`: allowed CORS origin.

## Database

Run SQL files from `database/migrations` in order, then optional seeds from `database/seeds`.

```bash
pnpm db:migrate
pnpm db:seed
```

Query choices and index rationale are documented in `database/query-analysis.md`. Use `EXPLAIN (ANALYZE, BUFFERS)` before changing report or dashboard queries.

## Docker

The backend image is built from `backend/Dockerfile`.

For normal development, run the backend locally and keep only PostgreSQL in Docker. Use the backend image when validating the production-style container.

```bash
docker compose up --build backend
```

The container expects `DATABASE_URL`, `JWT_SECRET`, WhatsApp configuration, and `FRONTEND_ORIGIN`.

## Architecture

- `domain`: entities and value types.
- `application`: use cases and ports.
- `infrastructure`: PostgreSQL, WhatsApp, token, OTP, and logging adapters.
- `interfaces/http`: Express controllers, middleware, schemas, and OpenAPI.

## Auth API

`POST /auth/otp/request` sends a WhatsApp OTP to a registered/test-approved phone number.

`POST /auth/otp/verify` verifies the code, upserts the user, seeds default categories, and returns an access token plus refresh token.

`POST /auth/refresh` accepts a refresh token and returns a renewed access token, refresh token, and current user snapshot.

## Expense API

`GET /expenses` lists tenant-scoped expenses with optional `from`, `to`, `categoryId`, `currency`, `paymentMethodKind`, and `limit` query parameters. Use it for history screens and filtered views.

`POST /expenses` creates manual expenses. WhatsApp-created expenses use the same persistence model after parsing and validation.

## Income API

`GET /incomes` lists tenant-scoped incomes with optional `from`, `to`, `currency`, and `limit` query parameters.

`POST /incomes` creates income records such as salary, refunds, and other personal money-in events.

## Budget API

`GET /budgets/monthly?month=YYYY-MM` lists tenant-scoped budgets for a month.

`PUT /budgets/monthly` creates or updates a monthly category budget. Budgets can target a whole category or an optional subcategory.

## Category API

`GET /categories` lists tenant-scoped categories and subcategories. Root categories have no `parentId`.

`POST /categories` creates a root category when `parentId` is omitted, or a subcategory when `parentId` is provided.

## Profile and Report Preferences

`GET /me` returns the authenticated user profile and report preferences.

`PUT /me` updates the authenticated user's name, email, country of residence, and preferred currency.

`PUT /report-preferences` updates the selected WhatsApp report frequencies: `daily`, `weekly`, `monthly`, and `yearly`.

## Swagger

Start the backend and open:

```text
http://localhost:3000/api/docs
```

When running through Docker Compose, the backend is exposed at the same URL.

Every public endpoint must include request/response schemas, status codes, auth requirements, and error examples.

## WhatsApp Webhook

Configure the Meta webhook callback URL:

```text
POST /webhooks/whatsapp
GET /webhooks/whatsapp
```

`GET` verifies the webhook. `POST` processes inbound WhatsApp messages and replies with a saved/clarification message.

Only registered users should be able to message the app number. In development, enforce this in Meta by adding only registered phone numbers to the test recipient list. The backend also ignores unregistered senders defensively and does not parse, save, or reply to their messages.

Inbound text is interpreted through the `MessageInterpreterPort`. The default deterministic interpreter supports basic expense, income, report, and budget-status intents. Set `MESSAGE_INTERPRETER_PROVIDER=github-models` with a GitHub token, `MESSAGE_INTERPRETER_BASE_URL=https://models.github.ai/inference`, and `MESSAGE_INTERPRETER_MODEL=deepseek/DeepSeek-V3-0324` to use GitHub Models. Use `openai-compatible` for another chat completions provider with the same request shape. The provider only proposes structured JSON; the backend still validates required fields, tenant scope, categories, and persistence rules before saving or replying.

When `WHATSAPP_APP_SECRET` is configured, inbound webhook requests must include a valid `x-hub-signature-256` header generated by Meta.

Inbound messages use the Meta `messages[].id` value as an idempotency key. The backend reserves that id before creating an expense, so Meta retries or duplicate webhook deliveries return `duplicate_ignored` and do not create a second expense.

## WhatsApp Test Send

After adding `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, and an approved recipient number:

```bash
pnpm --filter @expenses-tracker/backend whatsapp:send-test
```

Or pass the recipient and message explicitly:

```bash
pnpm --filter @expenses-tracker/backend whatsapp:send-test +56912345678 "Testing Expenses Tracker"
```

Meta test numbers only send to recipients selected in the API Setup "Para" field.

The Meta test phone number is not an inbox you can open. Messages sent to that number are delivered to your configured webhook.

Register the approved recipient as a local app user before inbound webhook testing:

```bash
pnpm --filter @expenses-tracker/backend db:register-test-user
```

Or pass explicit data:

```bash
pnpm --filter @expenses-tracker/backend db:register-test-user +56982439041 "Test User" test@example.com Chile CLP
```

Inspect recent inbound webhook audits:

```bash
pnpm --filter @expenses-tracker/backend whatsapp:audit
```

Meta's webhook field tester sends a direct `{ field, value }` sample body. Real WhatsApp delivery sends `entry[].changes[]`. The backend accepts both shapes for local/console testing.

## Report Delivery

Send due reports manually by frequency:

```bash
pnpm --filter @expenses-tracker/backend reports:send-due monthly
```

Accepted frequencies are `daily`, `weekly`, `monthly`, and `yearly`. The command finds users whose `report_preferences` include the selected frequency, generates the matching period report, and sends a WhatsApp summary. In production this command can be scheduled by cron, a worker container, or an external scheduler.

Docker Compose exposes a one-shot `report-worker` job profile for production-style scheduling:

```bash
pnpm reports:docker:daily
pnpm reports:docker:weekly
pnpm reports:docker:monthly
pnpm reports:docker:yearly
```

The worker exits after one batch. Schedule these commands from cron or the deployment platform instead of running an always-on loop.

## Logging

Use the shared Winston logger adapter. Do not log OTP values, JWTs, WhatsApp access tokens, or full authorization headers.

## Tests

```bash
pnpm --filter @expenses-tracker/backend test
```
