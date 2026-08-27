# Product Features

This is the current product scope, grouped by user-facing capability rather than implementation layer.

## Personal Finance

- Create, edit, delete, filter, and review expenses and incomes.
- Organize movements with system categories, subcategories, banks, and payment methods.
- Add account-specific categories, banks, and payment methods without leaving a movement form.
- Keep a permanent monthly budget by category or subcategory and review remaining budget.
- Track purchases in installments and see future charges for multi-installment purchases.
- Review monthly and annual dashboards, category and subcategory breakdowns, variations, cash flow, and recent history.

## Accounts and Sharing

- Every person has one personal financial account.
- Create shared accounts, invite members by email, and switch the active account from the web.
- Members can see every movement in a shared account, including who registered it.
- Shared accounts reuse the system catalog and allow their own custom categories and payment catalog entries.
- Record who paid a shared expense, allocate equal or custom amounts, review balances, record settlements, and see settlement history.

## Access and Messaging

- Register on the web in two short steps; the first step preserves a registration lead.
- Sign in with password or a one-time email magic link.
- Use the web fully without Telegram. Telegram is optional for fast capture and questions.
- Link Telegram from settings, use account commands, record expenses/incomes, ask for spending and budget status, and correct recent movements by chat.
- Use provider-neutral message interpretation with deterministic fallback or an OpenRouter/OpenAI-compatible model. Backend validation remains authoritative before data is saved.

## Experience, Language, and Safety

- Spanish and English public experience, with automatic public locale default and manual selection.
- Responsive desktop and mobile layouts, dark mode, first-run onboarding, accessible form labels, and compact mobile movement history.
- JWT access/refresh sessions, protected routes, tenant and financial-account authorization, webhook verification, duplicate-message handling, liveness/readiness probes, and audit logging.

## Delivery and Data Operations

- Swagger at `/api/docs` and an importable Postman collection under `docs/postman`.
- PostgreSQL migrations for upgrades, bootstrap for empty databases, optional demo seed, one-time account backfill, and tenant/full data export-import utilities.
- Netlify deploys the frontend from `main`; the backend is packaged as a Docker image for Oracle, behind Nginx with health checks.

## Planned Evolution

- Shared-account alerts and richer settlement views.
- Percentage/saved split rules.
- More account-level reporting and recurring workflows.
