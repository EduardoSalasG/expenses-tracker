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

In local development, Angular proxies `/api` requests to `http://localhost:3000`
and removes the `/api` prefix before forwarding to Express.

## Docker

The frontend image is built from `frontend/Dockerfile` and served by Nginx.

For normal development, run Angular locally for hot reloads and keep only PostgreSQL in Docker. Use the frontend image when validating the production-style container.

```bash
docker compose up --build frontend
```

## Environment

Edit `src/environments/environment.ts` for local development:

- `apiBaseUrl`: frontend-facing API base URL. Keep it as `/api` for local
  development and Docker.

Local Angular and the Docker frontend both use `/api`; Angular uses
`proxy.conf.json`, and Docker uses Nginx.

## Routes

- `/login`: WhatsApp OTP login. Existing users enter only phone number and OTP. Unknown phone numbers must complete name, last name, preferred name, email, country, and preferred currency before OTP verification creates the profile.
- `/dashboard`: current-month totals, currency cash-flow chart, category expense chart, budget progress, and recent expenses.
- `/expenses`: manual expense creation, cash/transfer/card details, filtered expense history, and auto-refresh after save.
- `/incomes`: income capture, filtered income history, totals by currency, and auto-refresh after save.
- `/budgets`: monthly budget planner with category/subcategory limits, spending progress, remaining amounts, and inline updates.
- `/categories`: main category and subcategory management with default/custom labels.
- `/settings`: profile editing including first name, last name, preferred name, WhatsApp report preferences, and session logout.

## Session Behavior

The frontend stores the access token and refresh token after OTP verification. Authenticated API calls include the access token; if the backend returns `401`, the interceptor calls `POST /auth/refresh`, stores the renewed tokens, and retries the original request once.

## UI Conventions

- Angular Material supplies form fields, buttons, nav, cards, tables, and progress indicators.
- Tailwind supplies layout, spacing, and responsive utilities.
- Shared page headers and `page-panel` cards provide the default page rhythm for dashboard and form-heavy views.
- CLP amounts are displayed in Chilean currency format, for example `$20.000`.
- Keep consumer workflows simple and direct; avoid business accounting terminology.

## Tests

```bash
pnpm --filter @expenses-tracker/frontend test
```

Update this README whenever routes, env vars, workflows, or UI conventions change.
