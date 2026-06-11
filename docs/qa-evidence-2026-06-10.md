# QA Evidence - 2026-06-10

Scope validated before promotion `dev -> main`:

## 0) Automated evidence

- `pnpm --filter @expenses-tracker/backend test` -> PASS (`45 passed`, `3 skipped`)
- `pnpm --filter @expenses-tracker/backend build` -> PASS
- `pnpm --filter @expenses-tracker/frontend build` -> PASS

## 1) Web flows (desktop + mobile viewport)

Environment:
- Backend local `:3000`
- Frontend local `:4200`
- PostgreSQL local/Docker
- Telegram webhook active

Validated:
- Landing page for logged-out visitors
  - header login action for existing users
  - registration CTA flow
  - legal footer links
- Login and registration
  - two-step registration lead capture (`/auth/register/lead`)
  - password login
  - email magic-link request and consume flow
  - Telegram link-token auto-login for linked users
- Dashboard
  - month/year selector behavior
  - month label sync
  - recent expenses limited to 5
  - charts render in light/dark
  - Telegram setup banner/modal
- Expenses
  - shared selected month from dashboard
  - `+` button opens modal
  - save success shows toast and closes modal
  - inline category/subcategory/bank/payment-method creation from the modal
  - edit modal updates amount/concept/date/category/payment method
  - delete action removes records from the history list
  - more-filters expandable works
- Incomes
  - shared selected month from dashboard
  - `+` button opens modal
  - save success shows toast and closes modal
  - edit flow updates amount/concept/date
  - delete action removes records from the history list
  - more-filters expandable works
- Budgets
  - permanent budgets listed from `/budgets`
  - inline category/subcategory creation works from the budget form
  - first-run onboarding now covers the budgets section too
  - spent/progress recalculates for category/subcategory with canonical + legacy-shaped expenses
- Categories / Settings
  - custom banks and payment methods visible
  - profile/preferences changes persist

Mobile QA:
- Responsive viewport reviewed
- Public auth forms reviewed
- Modal flows reviewed after overflow fixes

## 2) Telegram messaging flows

Validated:
- `/start` login-link guidance
- `/link +phone` account linking
- natural-language expense save
- installment expense save (`3 cuotas`) with confirmation message
- natural-language income save
- duplicate confirmation flow (`guardar` / `descartar`)
- update movement by reference
  - amount change
  - concept change
  - category/subcategory change
  - previous-message reference
- `/commands` and `/help`
- unlinked-user guidance

## 3) API contract checks (Swagger)

Checked on `/api/docs`:
- `POST /auth/register/lead`
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/magic-link/request`
- `POST /auth/magic-link/consume`
- `POST /auth/telegram/registration-link`
- `POST /auth/telegram/link-token`
- `POST /auth/telegram/consume-link-token`
- `POST /auth/otp/request`
- `POST /auth/otp/verify`
- expenses / incomes / categories / banks / payment-method-options / budgets / reports
- `POST /webhooks/telegram`

Specific final checks:
- `/budgets` documented as canonical endpoint
- `/budgets/monthly` documented as deprecated alias
- expense create/update documents installments
- upcoming installments semantics aligned with multi-installment expenses only
- error examples present for auth and Telegram link flows
- delete endpoints documented for expenses and incomes
- final Swagger audit saved in `docs/swagger-audit-2026-06-10.md`

## 4) Release checklist status

Reference: `docs/release-checklist.md`

- Pre-merge gates: completed
- Migration verification: completed
- Telegram smoke: completed
- Bilingual QA: completed
- Swagger/docs pass: completed
- Post-deploy checks: ready
