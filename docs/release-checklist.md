# Release Checklist (dev -> main)

Use this checklist for every production promotion from `dev` to `main`.

## 1) Pre-merge gates

- Branch is `dev` and up to date with `origin/dev`.
- Select the SemVer increment and update only root `package.json` as the canonical source.
- Run `pnpm run version:sync`, review the generated frontend version module, then run `pnpm run version:check`.
- No pending DB migration conflicts.
- `pnpm --filter @expenses-tracker/backend test`
- `pnpm --filter @expenses-tracker/backend build`
- `pnpm --filter @expenses-tracker/frontend build`

## 2) Migration and DB verification

- Run `pnpm db:migrate` against staging/prod-like DB.
- Verify migration log has no partial failures.
- Run `pnpm --filter @expenses-tracker/backend db:backfill:category-translations`; verify translated/skipped/failed counts. A provider outage is non-blocking and incomplete rows retry on the next deploy.
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
- Confirm default and custom category/subcategory labels use persisted `nameEs`/`nameEn`, and Telegram resolves either label to the canonical category.
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

## 6) Production promotion and traceability

- Merge `dev` -> `main`.
- Record the immutable `main` SHA selected for production.
- Create and push an annotated `vMAJOR.MINOR.PATCH` tag on that exact `main` SHA; never tag `dev` or create a historical tag retroactively.
- Complete `docs/release-notes-template.md` with the version, SHA, migrations, risks and evidence.
- Confirm Netlify + Oracle backend deploys completed.
- Post-deploy checks:
  - `/health/live`, `/health/ready`
  - web password login
  - magic-link request/consume
  - one expense save from messaging channel
  - dashboard loads with current month/year view
- Save evidence in `docs/post-deploy-qa-template.md` (one file per release run or copied section).
- For a rollback, first run `pnpm run release:rollback:preview -- --tag vMAJOR.MINOR.PATCH`; it is read-only and identifies the immutable deploy target before any operational action.
