# Frontend

Angular dashboard for the consumer expenses tracker.

## Stack

- Angular standalone components
- Angular Material
- Tailwind CSS
- Web-native login/registration with optional Telegram linking

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

The local dev server is configured with `--host 0.0.0.0` and `--disable-host-check`
so ngrok hosts can reach port `4200` without Vite rejecting the forwarded `Host`
header. Restart `pnpm dev:frontend` after changing these settings.

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

- `/`: public landing page for logged-out visitors. The header exposes login for existing users, while the rest of the page is optimized for registration/conversion.
- `/login`: web-native login/registration. Existing users choose password login or email magic link. New users register in two steps: first lead capture (`name + email`), then full account data. When opened from a Telegram link token and the chat is already linked, the frontend signs the user in directly without OTP. If the token is not linked yet, the frontend keeps the hidden `telegramChatId` and attaches it automatically after web login/registration.
- `/dashboard`: current-month totals, currency cash-flow chart, category expense chart, budget progress, and recent expenses.
- `/expenses`: manual expense creation, inline category/bank/payment-method creation from the modal, filtered history, edit, delete, and auto-refresh after save.
- `/incomes`: income capture, filtered history, edit, delete, totals by currency, and auto-refresh after save.
- `/budgets`: permanent budget planner (reused month to month) with category/subcategory limits, spending progress, remaining amounts, and inline updates.
- `/categories`: main category and subcategory management with default/custom labels.
- `/settings`: profile editing including first name, last name, preferred name, Telegram report preferences, and session logout.
- `/terms` and `/privacy`: public legal pages linked from the landing footer.

## Session Behavior

The frontend stores the access token and refresh token after web login, web registration, OTP verification, or Telegram link-token auto-login. Authenticated API calls include the access token; if the backend returns `401`, the interceptor calls `POST /auth/refresh`, stores the renewed tokens, and retries the original request once.

Telegram is optional. Users can register and use the full web app without connecting Telegram. If they choose to connect it later, the frontend can consume Telegram link tokens and silently attach the chat after a successful web login or registration.
If Telegram is not configured yet, the dashboard shows a dismissible banner that opens the setup modal and deep-links the user to the bot.

## UI Conventions

- Angular Material supplies form fields, buttons, nav, cards, tables, and progress indicators.
- Tailwind supplies layout, spacing, and responsive utilities.
- Shared page headers and `page-panel` cards provide the default page rhythm for dashboard and form-heavy views.
- First-run onboarding tours are shown once per module and stored client-side so they do not repeat on every session.
- CLP amounts are displayed in Chilean currency format, for example `$20.000`.
- Keep consumer workflows simple and direct; avoid business accounting terminology.

## Tests

```bash
pnpm --filter @expenses-tracker/frontend test
```

Update this README whenever routes, env vars, workflows, or UI conventions change.
