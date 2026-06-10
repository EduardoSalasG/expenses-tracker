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
- `TELEGRAM_BOT_TOKEN`: Telegram bot HTTP API token.
- `TELEGRAM_BOT_API_BASE_URL`: Telegram API base URL (`https://api.telegram.org`).
- `TELEGRAM_WEBHOOK_SECRET_TOKEN`: optional secret expected in `x-telegram-bot-api-secret-token` for webhook hardening.
- `RESEND_API_KEY`: Resend API key used to send email magic links.
- `RESEND_API_BASE_URL`: Resend REST API base URL (`https://api.resend.com`).
- `RESEND_FROM_EMAIL`: verified sender used for magic-link emails.
- `MESSAGE_INTERPRETER_PROVIDER`: `deterministic`, `github-models`, or `openai-compatible`.
- `MESSAGE_INTERPRETER_API_KEY`: API key for the selected LLM provider. For GitHub Models, use a GitHub token with Models access. Leave empty to fall back to deterministic parsing.
- `MESSAGE_INTERPRETER_BASE_URL`: chat completions base URL. GitHub Models uses `https://models.github.ai/inference`.
- `MESSAGE_INTERPRETER_MODEL`: model name. For the planned GitHub Models setup, use `deepseek/DeepSeek-V3-0324`.
- `MESSAGE_INTERPRETER_TEMPERATURE`: low value recommended for structured financial extraction.
- `OTP_DEBUG_RESPONSE_ENABLED`: when `true` outside production, `POST /auth/otp/request` includes `debugCode` in the JSON response for local testing.
- `FRONTEND_ORIGIN`: allowed CORS origin. Supports comma-separated values for localhost, tunnels, and Netlify. Telegram `/start` link generation uses the last public URL from this list.
- `TELEGRAM_BOT_USERNAME`: bot username without the leading `@`. Required for generating Telegram registration deep links from the web.
- `LEGACY_BUDGETS_ENDPOINTS_ENABLED`: keeps deprecated `GET/PUT /budgets/monthly` aliases enabled (`true` by default). Set to `false` to enforce `/budgets` only.

## Database

Run SQL files from `database/migrations` in order, then optional seeds from `database/seeds`.

```bash
pnpm db:migrate
pnpm db:seed
```

Behavior summary:

- `pnpm db:migrate` is the required step for any new environment and loads schema + default system catalogs.
- `pnpm db:seed` is optional and only loads local/demo users plus their default categories.
- Starting the backend against an empty production database does not auto-run demo seed data.

Query choices and index rationale are documented in `database/query-analysis.md`. Use `EXPLAIN (ANALYZE, BUFFERS)` before changing report or dashboard queries.

## Docker

The backend image is built from `backend/Dockerfile`.

For normal development, run the backend locally and keep only PostgreSQL in Docker. Use the backend image when validating the production-style container.

```bash
docker compose up --build backend
```

The container expects `DATABASE_URL`, `JWT_SECRET`, Telegram configuration, and `FRONTEND_ORIGIN`.

## Architecture

- `domain`: framework-free business types and value objects, grouped by auth, categories, finance, messaging, users, and tenancy.
- `application/ports`: repository, provider, and service contracts used by use cases.
- `application/use-cases`: application services grouped by workflow: auth, finance, profile, provider-neutral inbound messaging, and report delivery.
- `application/services`: reusable application/domain-policy helpers such as reporting calculations and messaging draft handling.
- `infrastructure`: PostgreSQL repositories, messaging provider adapters (`infrastructure/messaging-providers`), token, OTP, LLM interpreter, and logging adapters.
- `interfaces/http/routes`: Express route registration by feature.
- `interfaces/http/controllers`: provider-specific HTTP parsing and response handling.
- `interfaces/http/messaging-providers`: provider-specific webhook payload extraction.
- `interfaces/http/services`: provider-neutral interface workflows, such as inbound messaging orchestration.
- `interfaces/http/middleware`: auth, Meta signature verification, webhook logging, and error handling.
- `interfaces/http/schemas.ts`: Zod HTTP request contracts.
- `interfaces/http/openapi.ts`: Swagger/OpenAPI contract.

`interfaces/http/app.ts` is intentionally only the Express composition root for middleware, Swagger, health checks, and route registration.

Messaging is abstracted at the application layer through `MessagingProvider`, `MessagingMessageAuditRepository`, and `MessagingPendingDraftRepository`. Infrastructure composes concrete adapters through `ChannelMessagingRouter`, so use cases route outbound messages by channel without coupling to any specific provider API. Provider-specific webhook extraction/signature verification stays in HTTP adapters, then adapters forward provider-neutral `InboundTextMessage` events to `InboundMessagingService`.

Telegram routes are available at `POST /webhooks/telegram` and support:

- Normal text updates as primary inbound input.
- Help commands: `/commands` and `/help` return the available bot commands, an example for each one, and the type of reply the bot will send.
- Account linking command: `/link +569XXXXXXXX` (or `/vincular +569XXXXXXXX`) to bind a Telegram chat id to a previously registered user phone.
- Optional webhook secret verification via `x-telegram-bot-api-secret-token` when `TELEGRAM_WEBHOOK_SECRET_TOKEN` is configured.

## Health Endpoints

- `GET /health`: backward-compatible health endpoint.
- `GET /health/live`: liveness probe.
- `GET /health/ready`: readiness probe (checks DB connectivity when PostgreSQL repositories are enabled).

## Auth API

Primary authentication is web-native. Telegram is optional and can be linked during or after web login.

`POST /auth/register` creates a user with phone number + password and immediately returns access/refresh tokens. Required registration fields are `firstName`, `lastName`, `preferredName`, `countryOfResidence`, and `preferredCurrency`. `email` is optional. If `telegramChatId` is present, the backend links that Telegram chat automatically after registration.

`POST /auth/login` signs in with phone number + password and returns access/refresh tokens. If `telegramChatId` is present, the backend links that Telegram chat automatically after successful login.

`POST /auth/magic-link/request` sends a one-time login email through Resend for an existing user with an email on file. The request only needs the phone number. The response returns whether the email was sent, when the link expires, and a masked version of the destination email.

`POST /auth/magic-link/consume` exchanges a one-time email token for access/refresh tokens. Tokens expire after 15 minutes and are single-use.

`POST /auth/otp/request` sends a Telegram OTP and returns `requiresRegistration`. This is now a fallback flow for Telegram-linked users rather than the primary way into the web app.

For local troubleshooting only, set `OTP_DEBUG_RESPONSE_ENABLED=true` and restart the backend. The OTP response will include `debugCode`; this is blocked by convention in production because the container only enables it when `NODE_ENV !== 'production'`.

`POST /auth/otp/verify` verifies the code and returns an access token plus refresh token. Existing users are not overwritten during login. New users must provide `firstName`, `lastName`, `preferredName`, `email`, `countryOfResidence`, and `preferredCurrency`; the backend creates the profile, seeds default categories, and sends a Telegram greeting after OTP verification. The greeting uses `preferredName` and explains natural-language examples for expenses, incomes, reports, and budget questions. `preferredName` is the name the app should use when communicating with the user.

`POST /auth/refresh` accepts a refresh token and returns a renewed access token, refresh token, and current user snapshot.

`POST /auth/telegram/registration-link` is an optional convenience flow. It accepts only the phone number and returns a deep link to the Telegram bot. After the user taps `/start`, the bot sends back a login link token that resumes registration or links Telegram in the web app without asking for the Telegram chat id manually.

`POST /auth/telegram/consume-link-token` supports the Telegram deep-link login flow:

- If the Telegram chat is already linked to a user, the endpoint returns `linkedUser: true` plus access token, refresh token, and user snapshot. The frontend should create the session immediately and skip OTP.
- If the chat is not linked yet, the endpoint returns `linkedUser: false`, `telegramChatId`, and optionally the registered phone number if it came from a web registration intent. The frontend can then continue with standard web login or registration while silently attaching the Telegram chat.

## Expense API

`GET /expenses` lists tenant-scoped expenses with optional `from`, `to`, `categoryId`, `currency`, `paymentMethodKind`, and `limit` query parameters. Use it for history screens and filtered views.

`POST /expenses` creates manual expenses. Telegram-created expenses use the same persistence model after parsing and validation, but always use the user's preferred currency instead of treating currency as message input.

`PUT /expenses/:expenseId` updates a manual expense. The web app uses it to edit date, concept, category/subcategory, payment method, and amount from the expense history.

## Income API

`GET /incomes` lists tenant-scoped incomes with optional `from`, `to`, `currency`, and `limit` query parameters.

`POST /incomes` creates income records such as salary, refunds, and other personal money-in events.

`PUT /incomes/:incomeId` updates date, amount, currency, and concept for an existing income record.

## Budget API

`GET /budgets` lists tenant-scoped permanent budgets (reused every month).

`PUT /budgets` creates or updates a permanent category budget. Budgets can target a whole category or an optional subcategory.

Canonical endpoint is `/budgets`. Legacy compatibility aliases `GET/PUT /budgets/monthly` are deprecated and controlled by `LEGACY_BUDGETS_ENDPOINTS_ENABLED`.

## Report API

`GET /reports?from=<iso>&to=<iso>` returns tenant-scoped expenses and incomes for the period, totals by currency, and category spend variation vs the previous period of equal duration.

`expenseVariationByCategory` includes:
- `categoryId`
- `categoryName`
- `currency`
- `currentTotal`
- `previousTotal`
- `delta`
- `deltaPercent` (null when previous total is 0)

Additional aggregate endpoints:

- `GET /reports/expenses/yearly-monthly?year=YYYY`: expense totals grouped by month and currency.
- `GET /reports/expenses/monthly-daily?month=YYYY-MM`: expense totals grouped by day and currency for a month.
- `GET /reports/expenses/weekly-daily?weekStart=YYYY-MM-DD`: expense totals grouped by day and currency for a week window.
- `GET /reports/incomes/yearly-monthly?year=YYYY`: income totals grouped by month and currency.
- `GET /reports/incomes/monthly-daily?month=YYYY-MM`: income totals grouped by day and currency for a month.
- `GET /reports/expenses/category-totals?from=<iso>&to=<iso>`: totals by category/subcategory/currency for any period.

## Category API

`GET /categories` lists tenant-scoped categories and subcategories. Root categories have no `parentId`.

`POST /categories` creates a root category when `parentId` is omitted, or a subcategory when `parentId` is provided.

## Payment Catalog API

The app now uses parameterized payment catalogs. System defaults are global, and tenants can add their own options.

`GET /banks` lists global default banks plus tenant-specific custom banks.

`POST /banks` creates a tenant-specific bank option.

`GET /payment-method-options` lists global default payment methods plus tenant-specific custom methods.

`POST /payment-method-options` creates a tenant-specific payment method option. Supported kinds are `cash`, `transfer`, and `card`; `cardType` is optional and only valid for `card`.

## Profile and Report Preferences

`GET /me` returns the authenticated user profile and report preferences.

`PUT /me` updates the authenticated user's first name, last name, preferred name, email, country of residence, and preferred currency.

`PUT /report-preferences` updates the selected Telegram report frequencies: `daily`, `weekly`, `monthly`, and `yearly`.

## Swagger

Start the backend and open:

```text
http://localhost:3000/api/docs
```

When running through Docker Compose, the backend is exposed at the same URL.

Every public endpoint must include request/response schemas, status codes, auth requirements, and error examples.

## Messaging Webhook

The active messaging webhook is Telegram only:

```text
POST /webhooks/telegram
```

Inbound text is interpreted through the `MessageInterpreterPort`. The default deterministic interpreter supports basic expense, income, report, and budget-status intents. Set `MESSAGE_INTERPRETER_PROVIDER=github-models` with a GitHub token, `MESSAGE_INTERPRETER_BASE_URL=https://models.github.ai/inference`, and `MESSAGE_INTERPRETER_MODEL=deepseek/DeepSeek-V3-0324` to use GitHub Models. Use `openai-compatible` for another chat completions provider with the same request shape. The provider only proposes structured JSON; the backend still validates required fields, tenant scope, categories, and persistence rules before saving or replying.

Natural Telegram examples:

```text
Ingreso de sueldo 1200000 Bci transferencia
20.000 clases de bachata bsoul mayo, transferencia desde bci
25.000 polera paris, tdc bci
```

For Telegram-created movements, currency comes from `users.preferred_currency`. The backend ignores hallucinated or ambiguous currency values returned by the interpreter and formats CLP replies as `$20.000`.

Expense category assignment uses the tenant category tree. The LLM receives root categories with their subcategories and should return category/subcategory names from that list. The backend also applies deterministic fallback matching for common phrases such as groceries, restaurants, Uber, rent, medicines, phone, gifts, and dance classes.

Category persistence is normalized server-side:
- `categoryId` is always stored as the root category id.
- `subcategoryId` is stored only when applicable.
- If an incoming request mistakenly sends a subcategory in `categoryId`, backend rewrites it to canonical root+subcategory format.

Successful Telegram replies always address the user by `preferredName`. Message language follows `users.preferred_language` (`es` or `en`) for OTP, onboarding greeting, save/update confirmations, duplicate confirmations, clarifications, budget status, and report summaries. Saved expense replies include amount, concept, and the most precise category path available, for example `Food > Groceries`.

Users can also correct recent movements by chat. The correction message may reference a previous confirmation copied into the new message. The interpreter extracts the requested changes and the referenced movement, then the backend searches recent tenant-scoped expenses/incomes before applying changes. If the reference is not clear enough, the backend asks for more context instead of updating a guessed movement.

Supported correction fields:
- Expense: amount, concept, category/subcategory.
- Income: amount, concept.

Example:

```text
Cambia la categoría de este gasto a restaurantes

Monto: $14.000.
Concepto: Hamburguesas.
Categoría: Education.
```

If the message is incomplete, the backend stores a pending draft for 30 minutes. The user can reply with only the missing detail:

```text
20.000 clases de bachata bsoul mayo
transferencia desde bci
```

The second message completes and saves the draft. Reply `cancelar` to discard a pending movement.

Smoke test the configured interpreter without going through Meta:

```bash
pnpm --filter @expenses-tracker/backend interpreter:smoke --allow-smoke "salary 1200000 monthly job"
pnpm --filter @expenses-tracker/backend interpreter:smoke --allow-smoke "how much did I spend this month?"
```

The interpreter smoke command is intentionally manual-only. It requires `--allow-smoke`, does not call the webhook, does not write to PostgreSQL, and does not send Telegram messages.

Inbound Telegram messages use the provider update/message id as idempotency key. The backend reserves that id before creating an expense, so delivery retries or duplicate webhook deliveries return `duplicate_ignored` and do not create a second expense.

If the user sends the same text again with a different provider message id within two minutes, the backend does not reject it permanently. It asks whether the movement should be saved anyway or discarded. Reply `guardar` to create the second movement, or `descartar`/`cancelar` to discard it. This protects against accidental double taps while still allowing legitimate repeated expenses.

## Telegram Webhook

Configure Telegram webhook callback URL:

```text
POST /webhooks/telegram
```

Recommended setup uses `setWebhook` with `secret_token` matching `TELEGRAM_WEBHOOK_SECRET_TOKEN`.

Linking flow example:

```text
/link +56982439041
```

Help command example:

```text
/commands
```

After linking, Telegram messages are processed with the same finance workflow (save expense/income, report/budget questions, draft confirmations, update movement corrections) and responses use `preferredName` + `preferredLanguage`.

Telegram webhook setup uses Bot API `setWebhook` and `getWebhookInfo`. Use `/start` from the bot chat to receive an auto-generated login link. Already linked users are signed in directly from that link; unlinked users can keep using the web without Telegram or link the chat from `/link +<phone>`.
For web-first registration, the bot deep link also supports `/start <registration-token>`, which converts the pending phone registration into a Telegram login link tied to that chat.

## Report Delivery

Send due reports manually by frequency:

```bash
pnpm --filter @expenses-tracker/backend reports:send-due monthly
```

Accepted frequencies are `daily`, `weekly`, `monthly`, and `yearly`. The command finds users whose `report_preferences` include the selected frequency, generates the matching period report, and sends a Telegram summary. In production this command can be scheduled by cron, a worker container, or an external scheduler.

Scheduled report delivery is idempotent by user/frequency/period. The backend reserves a dispatch row before sending and skips already-sent periods. Failed sends are marked as `failed` and do not block future retries for that same period.

Docker Compose exposes a one-shot `report-worker` job profile for production-style scheduling:

```bash
pnpm reports:docker:daily
pnpm reports:docker:weekly
pnpm reports:docker:monthly
pnpm reports:docker:yearly
```

The worker exits after one batch. Schedule these commands from cron or the deployment platform instead of running an always-on loop.

## Logging

Use the shared Winston logger adapter. Do not log OTP values, JWTs, Telegram bot tokens, or full authorization headers.

## Tests

```bash
pnpm --filter @expenses-tracker/backend test
```

PostgreSQL integration repository tests (requires a migrated local DB and `DATABASE_URL`):

```powershell
$env:RUN_DB_INTEGRATION_TESTS='true'
pnpm --filter @expenses-tracker/backend test
```
