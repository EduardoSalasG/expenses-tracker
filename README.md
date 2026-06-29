# Expenses Tracker

Consumer expenses tracker with web-first access, optional Telegram capture, PostgreSQL persistence, an Express API, and an Angular dashboard.

Telegram expense capture is intended for registered users only and works as an optional convenience channel. The web app is fully usable without Telegram.

Linked Telegram users can also correct recent expenses and incomes by chat, including amount, concept, and expense category/subcategory changes.
When the backend cannot identify an expense category with enough confidence, it does not default silently. Instead, it asks the user to specify the category/subcategory, handles ambiguous matches such as duplicated subcategory names, and can create a new category or subcategory through the same chat flow.

Telegram messages are interpreted through a provider-agnostic `MessageInterpreterPort`. The default parser is deterministic; GitHub Models with `deepseek/DeepSeek-V3-0324` or any OpenAI-compatible chat completions provider can be configured without changing application use cases.

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

Apply database migrations and optional demo seed data against `backend/.env`:

```bash
pnpm db:bootstrap
pnpm db:seed
```

Notes:

- `pnpm db:migrate` applies incremental schema/data migrations to an existing environment.
- `pnpm db:bootstrap` is the canonical command for a brand-new database. It runs migrations and then ensures the system-owned default category catalog exists.
- `pnpm db:seed` is optional and only creates local demo/admin users plus tenant copies of the default categories.
- Real business data should be moved with `pnpm db:export:tenant` / `pnpm db:import:data` for one user tenant, or `pnpm db:export:data` for a full database dump.
- Expense forms support inline creation of missing categories, subcategories, banks, and payment methods. Budget forms support inline category/subcategory creation in the same flow.

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
Docker Compose loads `backend/.env` for Telegram credentials, while overriding `DATABASE_URL` inside the container to use the internal `database:5432` host.

## Production Deploy (Render + Netlify)

Backend/API and scheduled workers are configured in `render.yaml`. Frontend static hosting and SPA/API redirects are configured in `netlify.toml`.

Before going live:

1. Create Render services from `render.yaml` and set secret env vars (`JWT_SECRET`, Telegram keys, interpreter keys if used).
2. Point Netlify site to this repository and keep `netlify.toml` as build config.
3. Update the `netlify.toml` `/api/*` redirect target to your real Render backend URL if it differs from `https://expenses-tracker-api.onrender.com`.
4. Set `FRONTEND_ORIGIN` in Render backend to your Netlify domain.

For temporary Netlify -> local backend testing, point `netlify.toml` `/api/*` to your public dev tunnel backend URL and include the Netlify domain in backend `FRONTEND_ORIGIN`.

Release flow:

1. Work on `dev`.
2. Merge `dev` into `main` only when production-ready.
3. Let Netlify and Render auto-deploy from `main`.

## Registration and Access

- Logged-out visitors land on `/`, a public landing page focused on registration and feature discovery.
- The public surface (`/`, `/login`, `/terms`, `/privacy`) defaults to English for visitors whose request IP resolves to the United States; otherwise it defaults to Spanish.
- The landing navbar includes a manual `ES / EN` selector. Manual choice overrides automatic public locale detection for later visits on that browser.
- The landing header keeps a single login action for existing users.
- New users can create an account directly from the web with phone number + password.
- Existing users can also request a one-time email magic link if their account has an email configured.
- Telegram linking is optional and can happen later from a Telegram deep link without asking for `chat_id` manually.
- Returning Telegram-linked users can open the web from the bot and sign in directly from the link token without OTP.

## Telegram Testing

Configure webhook with Telegram Bot API and verify with `getWebhookInfo`.

Send due Telegram reports manually:

```bash
pnpm --filter @expenses-tracker/backend reports:send-due monthly
```

Run production-style report jobs through Docker Compose:

```bash
pnpm reports:docker:monthly
```

The report worker is one-shot by design. Use cron or a platform scheduler to invoke the daily, weekly, monthly, or yearly command at the desired time.

See:

- [Backend README](backend/README.md)
- [Frontend README](frontend/README.md)
- [Database README](database/README.md)
- [Architecture](docs/architecture.md)
- [Operations](docs/operations.md)
- [Release Checklist](docs/release-checklist.md)
- [QA Evidence 2026-06-11](docs/qa-evidence-2026-06-11.md)
- [Release Evidence 2026-06-11](docs/release-evidence-2026-06-11.md)
- [Swagger Audit 2026-06-11](docs/swagger-audit-2026-06-11.md)
- [Post-Deploy QA Template](docs/post-deploy-qa-template.md)
- [Flow Diagrams](docs/diagrams/flows.md)
- [Database Query Analysis](database/query-analysis.md)
