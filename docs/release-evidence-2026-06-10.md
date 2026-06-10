# Release Evidence (dev -> main) - 2026-06-10

This document records the executed evidence for promotion flow and post-deploy validation.

## Promotion flow

- Branch model: `dev` integration, `main` production.
- Promotion rule: changes are committed to `dev` first, then merged into `main`.
- Hotfix rule: if a hotfix lands on `main`, regularize `dev` immediately by merging `main -> dev`.

## Build/test gates

- Backend tests: PASS (`45 passed`, `3 skipped`).
- Backend build: PASS.
- Frontend production build: PASS.

## Documentation and contract pass

- Swagger updated for:
  - registration lead capture
  - web auth
  - magic links
  - Telegram link-token flows
  - expense installments
  - permanent budgets
  - Telegram webhook
- READMEs aligned with Telegram-only messaging and web-first auth.
- Release checklist, operations, architecture, and flow index aligned with current product state.

## Deploy / promotion evidence

- Production promotion target remains `main`.
- Netlify auto-deploy is expected from `main`.
- Backend production target remains external hosting pointed by `FRONTEND_ORIGIN` and webhook configuration.

## Rollback baseline

If release rollback is required:

1. Roll app runtime to previous `main` commit in hosting platform.
2. Keep DB at current migration level unless a forward-fix migration is prepared.
3. Re-run health checks and auth/messaging smoke after rollback.
