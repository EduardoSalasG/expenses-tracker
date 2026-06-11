# Release Checklist (dev -> main)

Use this checklist for every production promotion from `dev` to `main`.

## 1) Pre-merge gates

- Branch is `dev` and up to date with `origin/dev`.
- No pending DB migration conflicts.
- `pnpm --filter @expenses-tracker/backend test`
- `pnpm --filter @expenses-tracker/backend build`
- `pnpm --filter @expenses-tracker/frontend build`

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
  - landing, login/register, dashboard, expenses, incomes, budgets, categories, settings
- Messaging output in `es` and `en`:
  - link/account guidance
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
- Verify Telegram-only auth/messaging flows:
  - `/auth/register/lead`
  - `/auth/register`
  - `/auth/login`
  - `/auth/magic-link/request`
  - `/auth/magic-link/consume`
  - `/auth/telegram/registration-link`
  - `/auth/telegram/link-token`
  - `/auth/telegram/consume-link-token`
  - `/webhooks/telegram`
- Verify finance maintenance flows:
  - `PUT /expenses/{expenseId}`
  - `DELETE /expenses/{expenseId}`
  - `PUT /incomes/{incomeId}`
  - `DELETE /incomes/{incomeId}`
- Update:
  - `backend/README.md`
  - `frontend/README.md` (if UI/flow/env changed)
  - `docs/diagrams/*.mmd` / `docs/diagrams/flows.md` for flow changes
  - `database/query-analysis.md` if SQL/functions/index usage changed
  - `docs/swagger-audit-YYYY-MM-DD.md` when a final endpoint-by-endpoint pass is completed

## 6) Production promotion

- Merge `dev` -> `main`.
- Confirm Netlify + Render deploys completed.
- Post-deploy checks:
  - `/health/live`, `/health/ready`
  - web password login
  - magic-link request/consume
  - one expense save from messaging channel
  - dashboard loads with current month/year view
- Save evidence in `docs/post-deploy-qa-template.md` (one file per release run or copied section).
