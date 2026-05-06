# Operations

This document captures the MVP runbook for local production-style checks and scheduled jobs.

## Local Development

Use Docker for PostgreSQL and run the app processes locally for fast feedback:

```bash
pnpm dev:db
pnpm dev:backend
pnpm dev:frontend
```

## Production-Style Image Check

Build and run the full stack when validating runtime images:

```bash
docker compose up --build
```

The backend and frontend containers are intended for image validation and deployment packaging. Normal development should keep them stopped.

## Continuous Integration

GitHub Actions runs on pushes and pull requests to `main`:

- backend tests
- backend build
- frontend tests in headless Chrome
- frontend build
- Docker Compose config validation

Linting is intentionally not part of CI yet because ESLint and Angular lint configuration are not finalized in this MVP.

## Report Worker

The report worker is a one-shot job. It sends one batch for one frequency and exits. This avoids duplicate sends from a long-running loop.

Local one-shot commands:

```bash
pnpm reports:docker:daily
pnpm reports:docker:weekly
pnpm reports:docker:monthly
pnpm reports:docker:yearly
```

Equivalent Docker Compose form:

```bash
docker compose run --rm -e REPORT_FREQUENCY=monthly report-worker
```

Production scheduling should trigger the one-shot command from cron, a platform scheduler, or CI/orchestration jobs.

Example cron shape:

```cron
5 8 * * * cd /srv/expenses-tracker && docker compose run --rm -e REPORT_FREQUENCY=daily report-worker
10 8 * * MON cd /srv/expenses-tracker && docker compose run --rm -e REPORT_FREQUENCY=weekly report-worker
15 8 1 * * cd /srv/expenses-tracker && docker compose run --rm -e REPORT_FREQUENCY=monthly report-worker
20 8 1 1 * cd /srv/expenses-tracker && docker compose run --rm -e REPORT_FREQUENCY=yearly report-worker
```

## Secrets

Keep `backend/.env` outside Git. Production deployments need:

- `DATABASE_URL`
- `JWT_SECRET`
- `WHATSAPP_VERIFY_TOKEN`
- `WHATSAPP_APP_SECRET`
- `WHATSAPP_ACCESS_TOKEN`
- `WHATSAPP_PHONE_NUMBER_ID`
- `WHATSAPP_BUSINESS_ACCOUNT_ID`
- `MESSAGE_INTERPRETER_PROVIDER`
- `MESSAGE_INTERPRETER_API_KEY`
- `MESSAGE_INTERPRETER_BASE_URL`
- `MESSAGE_INTERPRETER_MODEL`
- `FRONTEND_ORIGIN`

## Smoke Checks

After starting services:

```bash
curl http://localhost:3000/health
curl http://localhost:3000/api/docs
```

Frontend:

```text
http://localhost:4200/login
```
