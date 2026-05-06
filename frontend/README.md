# Frontend

Angular dashboard for the consumer expenses tracker.

## Stack

- Angular standalone components
- Angular Material
- Tailwind CSS
- WhatsApp OTP login with access-token refresh

## Setup

```bash
pnpm install
pnpm dev:db
pnpm dev:backend
pnpm --filter @expenses-tracker/frontend start
```

The app runs at:

```text
http://localhost:4200
```

## Docker

The frontend image is built from `frontend/Dockerfile` and served by Nginx.

For normal development, run Angular locally for hot reloads and keep only PostgreSQL in Docker. Use the frontend image when validating the production-style container.

```bash
docker compose up --build frontend
```

## Environment

Edit `src/environments/environment.ts` for local development:

- `apiBaseUrl`: backend API base URL.

The Docker frontend uses `/api`, which Nginx proxies to the backend container.

## Routes

- `/login`: WhatsApp OTP login.
- `/dashboard`: current-month totals, currency cash-flow chart, category expense chart, budget progress, and recent expenses.
- `/expenses`: manual expense creation, card/cash details, filtered expense history, and auto-refresh after save.
- `/incomes`: income capture, filtered income history, totals by currency, and auto-refresh after save.
- `/budgets`: monthly budget planner with category/subcategory limits, spending progress, remaining amounts, and inline updates.
- `/categories`: main category and subcategory management with default/custom labels.
- `/settings`: profile editing, WhatsApp report preferences, and session logout.

## Session Behavior

The frontend stores the access token and refresh token after OTP verification. Authenticated API calls include the access token; if the backend returns `401`, the interceptor calls `POST /auth/refresh`, stores the renewed tokens, and retries the original request once.

## UI Conventions

- Angular Material supplies form fields, buttons, nav, cards, tables, and progress indicators.
- Tailwind supplies layout, spacing, and responsive utilities.
- Keep consumer workflows simple and direct; avoid business accounting terminology.

## Tests

```bash
pnpm --filter @expenses-tracker/frontend test
```

Update this README whenever routes, env vars, workflows, or UI conventions change.
