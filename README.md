# Expenses Tracker

Consumer expenses tracker with WhatsApp-first capture, PostgreSQL persistence, an Express API, and an Angular dashboard.

WhatsApp expense capture is intended for registered users only. In development, use Meta's test recipient allowlist so unregistered numbers cannot interact with the app number; the backend also ignores unregistered sender numbers defensively.

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
- [Flow Diagrams](docs/diagrams/flows.md)
- [Database Query Analysis](database/query-analysis.md)
