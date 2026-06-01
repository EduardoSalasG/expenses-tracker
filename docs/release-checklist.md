# Release Checklist (dev -> main)

Use this checklist for every production promotion from `dev` to `main`.

## 1) Pre-merge gates

- CI green on `dev` (backend tests/build, frontend tests/build).
- No pending DB migration conflicts.
- `pnpm --filter @expenses-tracker/backend test`
- `pnpm --filter @expenses-tracker/frontend test -- --watch=false --browsers=ChromeHeadless`

## 2) Migration and DB verification

- Run `pnpm db:migrate` against staging/prod-like DB.
- Verify migration log has no partial failures.
- Run smoke queries:
  - users count
  - expenses/incomes list by tenant
  - report aggregate functions
- If rollback is needed:
  - app rollback first (previous image/version)
  - DB rollback by forward-fix migration (no destructive rollback in-place unless explicitly planned).

## 3) Messaging smoke (Telegram)

- Telegram webhook:
  - verify `x-telegram-bot-api-secret-token` when configured
  - run `/start` and verify login-link response
  - run `/link +<registered-phone>`
  - send natural-language expense and verify save + response
  - send duplicate text and verify duplicate confirmation flow
  - run movement update by reference and verify update confirmation

## 4) Bilingual QA (es/en)

- Frontend labels/screens in `es` and `en`:
  - dashboard, expenses, incomes, budgets, categories, settings, login
- Messaging output in `es` and `en`:
  - save confirmations
  - clarifications/drafts
  - duplicate confirmation
  - budget status and reports

## 5) Swagger + docs final pass

- `GET /api/docs` reachable.
- Every changed endpoint has:
  - request schema
  - success example
  - error example
  - auth requirement
- Update:
  - `backend/README.md`
  - `frontend/README.md` (if UI/flow/env changed)
  - `docs/diagrams/*.mmd` / `docs/diagrams/flows.md` for flow changes
  - `database/query-analysis.md` if SQL/functions/index usage changed

## 6) Production promotion

- Merge `dev` -> `main`.
- Confirm Netlify + Render deploys completed.
- Post-deploy checks:
  - `/health/live`, `/health/ready`
  - login OTP
  - one expense save from messaging channel
  - dashboard loads with current month/year view
