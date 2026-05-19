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

GitHub Actions runs on pushes and pull requests to `dev` and `main`:

- backend tests
- backend build
- frontend tests in headless Chrome
- frontend build
- Docker Compose config validation

Linting is intentionally not part of CI yet because ESLint and Angular lint configuration are not finalized in this MVP.

## Gitflow

Use `main` as the production branch. Netlify and Render should deploy from `main` only.

Use `dev` as the integration branch for active development. Normal work should branch from `dev`, merge back into `dev`, and then promote to `main` through a pull request when the app is ready to deploy.

Recommended flow:

```bash
git checkout dev
git pull
git checkout -b feature/<short-name>
git push -u origin feature/<short-name>
```

Promotion flow:

```bash
git checkout main
git pull
git merge dev
git push origin main
```

## Report Worker

The report worker is a one-shot job. It sends one batch for one frequency and exits. This avoids duplicate sends from a long-running loop.

Dispatches are idempotent by `(channel, frequency, period_from, period_to, user_id)` through `report_dispatches`. Re-running the same one-shot job for the same period skips already-sent users, and failed sends are recorded as `failed` for later retries.

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

For GitHub Models, configure:

```text
MESSAGE_INTERPRETER_PROVIDER=github-models
MESSAGE_INTERPRETER_API_KEY=<github-token-with-models-access>
MESSAGE_INTERPRETER_BASE_URL=https://models.github.ai/inference
MESSAGE_INTERPRETER_MODEL=deepseek/DeepSeek-V3-0324
```

Interpreter smoke check:

```bash
pnpm --filter @expenses-tracker/backend interpreter:smoke --allow-smoke "20.000 clases de bachata, transferencia bci"
```

This command is local-only and does not touch the webhook, database, or WhatsApp provider. It requires `--allow-smoke` so it cannot run accidentally from copied commands or automation.

## Smoke Checks

After starting services:

```bash
curl http://localhost:3000/health
curl http://localhost:3000/health/live
curl http://localhost:3000/health/ready
curl http://localhost:3000/api/docs
```

Frontend:

```text
http://localhost:4200/login
```

## Production Hardening Notes

- Use `GET /health/live` for container liveness.
- Use `GET /health/ready` for readiness; it verifies DB connectivity when PostgreSQL mode is enabled.
- Report worker exits with `exitCode=1` when one or more deliveries fail. Configure scheduler/platform alerts on non-zero exit status.

## Bilingual QA (es/en)

Run this checklist before promoting `dev` to `main`:

- Set user language to `es` in settings and verify:
  - OTP message in Spanish.
  - Registration greeting in Spanish.
  - WhatsApp expense/income save confirmations in Spanish.
  - Duplicate detection confirmation flow in Spanish.
  - Report and budget status responses in Spanish.
- Set user language to `en` and repeat the same checks in English.
- Verify frontend labels on `dashboard`, `expenses`, `incomes`, `budgets`, `categories`, and `settings` in both languages.
