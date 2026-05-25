# Expenses Tracker

Consumer expenses tracker with WhatsApp-first capture, PostgreSQL persistence, an Express API, and an Angular dashboard.

WhatsApp expense capture is intended for registered users only. In development, use Meta's test recipient allowlist so unregistered numbers cannot interact with the app number; the backend also ignores unregistered sender numbers defensively.

WhatsApp messages are interpreted through a provider-agnostic `MessageInterpreterPort`. The default parser is deterministic; GitHub Models with `deepseek/DeepSeek-V3-0324` or any OpenAI-compatible chat completions provider can be configured without changing application use cases.

## Repository

- `backend`: Express, TypeScript, Zod, Winston, Swagger/OpenAPI, clean architecture layers.
- `frontend`: Angular standalone app, Angular Material, Tailwind.
- `database`: PostgreSQL migrations, seeds, functions, and query analysis notes.
- `docs`: Architecture decisions and Mermaid diagrams.
- `docker-compose.yml`: local Docker stack for database, backend, and frontend. Day-to-day development uses Docker for PostgreSQL only.

## Documentation Rule

Every behavior change must keep documentation aligned:

- API changes update Swagger/OpenAPI and `backend/README.md`.
- Frontend route, workflow, or env changes update `frontend/README.md`.
- Domain, architecture, or persistence changes update `docs/diagrams/flows.md`.
- Database query changes update `database/query-analysis.md` when performance or index usage matters.

## CI

GitHub Actions verifies backend tests/build, frontend tests/build, and Docker Compose config on pushes and pull requests to `main`.

## Quick Start

Install dependencies after network access is available, then run PostgreSQL in Docker:

```bash
pnpm install
pnpm dev:db
```

Run backend and frontend locally for fast reloads:

```bash
pnpm dev:backend
pnpm dev:frontend
```

Apply database migrations and seed data against `backend/.env`:

```bash
pnpm db:migrate
pnpm db:seed
```

## Docker

Each runtime image has its own Dockerfile:

- `backend/Dockerfile`
- `frontend/Dockerfile`
- `database/Dockerfile`

Recommended local development keeps only PostgreSQL in Docker:

```bash
pnpm dev:db
pnpm dev:backend
pnpm dev:frontend
```

Stop Dockerized app containers if they are occupying ports `3000` or `4200`:

```bash
pnpm dev:stop-app-containers
```

Run the full local Docker stack when validating images before publishing:

```bash
docker compose up --build
```

Services:

- Frontend: `http://localhost:4200`
- Backend: `http://localhost:3000`
- Swagger: `http://localhost:3000/api/docs`
- PostgreSQL from host: `postgres://expenses:expenses@localhost:5433/expenses_tracker`

If local backend scripts connect to the Docker database, make sure `backend/.env` uses that same `DATABASE_URL`.
Docker Compose loads `backend/.env` for WhatsApp credentials, while overriding `DATABASE_URL` inside the container to use the internal `database:5432` host.

## Production Deploy (Render + Netlify)

Backend/API and scheduled workers are configured in `render.yaml`. Frontend static hosting and SPA/API redirects are configured in `netlify.toml`.

Before going live:

1. Create Render services from `render.yaml` and set secret env vars (`JWT_SECRET`, WhatsApp keys, interpreter keys if used).
2. Point Netlify site to this repository and keep `netlify.toml` as build config.
3. Update the `netlify.toml` `/api/*` redirect target to your real Render backend URL if it differs from `https://expenses-tracker-api.onrender.com`.
4. Set `FRONTEND_ORIGIN` in Render backend to your Netlify domain.

Release flow:

1. Work on `dev`.
2. Merge `dev` into `main` only when production-ready.
3. Let Netlify and Render auto-deploy from `main`.

## WhatsApp Testing

For Meta API Setup, map the values like this:

- Access token: `WHATSAPP_ACCESS_TOKEN`
- Identificador de numero de telefono: `WHATSAPP_PHONE_NUMBER_ID`
- Identificador de la cuenta de WhatsApp Business: `WHATSAPP_BUSINESS_ACCOUNT_ID`
- Recipient selected in "Para": `WHATSAPP_TEST_RECIPIENT_PHONE`

Then test outbound messaging:

```bash
pnpm --filter @expenses-tracker/backend whatsapp:send-test
```

Send due WhatsApp reports manually:

```bash
pnpm --filter @expenses-tracker/backend reports:send-due monthly
```

Run production-style report jobs through Docker Compose:

```bash
pnpm reports:docker:monthly
```

The report worker is one-shot by design. Use cron or a platform scheduler to invoke the daily, weekly, monthly, or yearly command at the desired time.

Meta's test number is not a visible inbox. Messages sent to it arrive at the webhook URL configured in Meta. Before inbound testing, register the approved recipient number locally:

```bash
pnpm --filter @expenses-tracker/backend db:register-test-user
```

See:

- [Backend README](backend/README.md)
- [Frontend README](frontend/README.md)
- [Database README](database/README.md)
- [Architecture](docs/architecture.md)
- [Operations](docs/operations.md)
- [Release Checklist](docs/release-checklist.md)
- [Flow Diagrams](docs/diagrams/flows.md)
- [Database Query Analysis](database/query-analysis.md)
