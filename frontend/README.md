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
http://localhost:4300
```

In local development, Angular proxies `/api` requests to `http://localhost:3100`
and removes the `/api` prefix before forwarding to Express.

The local dev server is configured with `--host 0.0.0.0` and `--disable-host-check`
so ngrok hosts can reach port `4300` without Vite rejecting the forwarded `Host`
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

- `/`: Spanish public landing page for logged-out visitors. It presents web tracking, optional Telegram capture, shared accounts, and budgets with a clear registration path.
- `/en`: English public landing page. It has the same public CTAs and content structure as `/`, but a stable localized URL for sharing and search discovery.
- `/login`: web-native login/registration. Existing users choose password login or email magic link. New users register in two steps: first lead capture (`name + email`), then full account data. When opened from a Telegram link token and the chat is already linked, the frontend signs the user in directly without OTP. If the token is not linked yet, the frontend keeps the hidden `telegramChatId` and attaches it automatically after web login/registration.
- `/dashboard`: current-month totals, currency cash-flow chart, category expense chart, budget progress, and recent expenses.
- `/expenses`: manual expense creation and editing from a modal, with inline category, subcategory, bank, and payment-method creation directly from the related selects; also includes filtered history, delete, auto-refresh after save, and visible active-account context.
- `/incomes`: income capture, filtered history, edit, delete, totals by currency, auto-refresh after save, and visible active-account context.
- `/budgets`: permanent budget planner (reused month to month) with category/subcategory limits, spending progress, remaining amounts, inline category/subcategory creation, inline updates, and visible active-account context.
- `/categories`: main category and subcategory management with default/custom labels and visible active-account context.
- `/settings`: a settings hub. On mobile, choose an area and use `Volver` to return to the hub; on desktop, use the contextual section selector. Areas include profile, reports, banks and payment methods, shared accounts, Telegram, and session.
- `/terms` and `/privacy`: public legal pages linked from the landing footer.

## Public Landing Locale and Search Discovery

The public landing has stable language routes:

- `/` is Spanish.
- `/en` is English.

Its language selector navigates between those routes, so the chosen language remains explicit in the URL. The production build prerenders both pages and publishes canonical, alternate-language, Open Graph and Twitter metadata in the initial HTML. The public site URL is centralized in `src/environments/public-site.ts`; the prebuild generator derives `public/robots.txt` and `public/sitemap.xml` from it.

`robots.txt` disallows authenticated routes, while the sitemap lists only `/` and `/en`. Netlify serves the static English landing and discovery resources before its SPA fallback. After an authorized production deploy, check the two landing pages, `robots.txt`, and `sitemap.xml` over HTTP before closing the release.

Other public pages may still use the existing public-context locale behavior where applicable; they are not search-localized routes.

### Local verification

Run `pnpm --filter @expenses-tracker/frontend build --configuration production` and then `node frontend/node_modules/@playwright/test/cli.js test e2e/landing-prerender-output.spec.ts --config frontend/playwright.config.ts`. This validates the generated HTML, canonical URLs and discovery assets without production credentials.

`netlify dev --offline --filter @expenses-tracker/frontend` additionally validates redirect delivery when the local Node runtime meets the Netlify Angular runtime requirement. Netlify is pinned to Node `22.22.0` in `netlify.toml`; a local Node `22.13.1` can resolve that file but cannot start its Angular runtime preview. This local-tooling limitation does not alter the production configuration and must not be treated as public deployment evidence.

## Session Behavior

The frontend stores the access token and refresh token after web login, web registration, OTP verification, or Telegram link-token auto-login. Authenticated API calls include the access token; if the backend returns `401`, the interceptor calls `POST /auth/refresh`, stores the renewed tokens, and retries the original request once.

Telegram is optional. Users can register and use the full web app without connecting Telegram. If they choose to connect it later, the frontend can consume Telegram link tokens and silently attach the chat after a successful web login or registration.
Shared-account invitations can be opened from the web even before login. If the visitor is not authenticated, the auth guard preserves the invitation token and the login flow accepts it after the session is created.
If Telegram is not configured yet, the dashboard shows a dismissible banner that opens the setup modal and deep-links the user to the bot.

## UI Conventions

- Angular Material supplies form fields, buttons, nav, cards, tables, and progress indicators.
- Tailwind supplies layout, spacing, and responsive utilities.
- Shared page headers and `page-panel` cards provide the default page rhythm for dashboard and form-heavy views.
- First-run onboarding tours are shown once per module and stored client-side so they do not repeat on every session.
- On mobile, the fixed navigation keeps `Inicio`, `Gastos`, and `Ingresos` visible; `Más` exposes Presupuestos, Categorías, and Configuración without crowding the primary actions.
- Expense and income histories switch from desktop tables to compact movement cards on mobile. Amount and concept lead each card; date, category, payment method, and author are presented as concise visual metadata. In shared accounts, the list explicitly indicates that it contains movements from every member.
- CLP amounts are displayed in Chilean currency format, for example `$20.000`.
- Keep consumer workflows simple and direct; avoid business accounting terminology.

## Tests

```bash
pnpm --filter @expenses-tracker/frontend test
```

Update this README whenever routes, env vars, workflows, or UI conventions change.
