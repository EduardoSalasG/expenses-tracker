# QA Evidence - 2026-06-01

Scope validated before promotion `dev -> main`:

## 1) Web flows (desktop + mobile viewport)

Environment:
- Backend local `:3000`
- Frontend local `:4200`
- PostgreSQL local (Docker)
- Telegram webhook active

Validated:
- Login OTP via Telegram:
  - request code
  - verify code
  - invalid/expired code shows frontend error
- Dashboard:
  - month/year selector behavior
  - month label sync
  - recent expenses limited to 5
  - charts render in light/dark
- Expenses:
  - selected month defaults from dashboard shared month state
  - `+` button opens modal
  - save success shows toast and closes modal
  - "More filters" expandable works
- Incomes:
  - selected month defaults from dashboard shared month state
  - `+` button opens modal
  - save success shows toast and closes modal
  - "More filters" expandable works
- Budgets:
  - permanent budgets listed from `/budgets`
  - spent/progress recalculates for category/subcategory with canonical + legacy-shaped expenses

Mobile QA:
- Tested with responsive viewport (Chrome DevTools mobile profile)
- Verified modal usability and table horizontal scrolling behavior

## 2) Telegram messaging flows

Validated:
- `/start` link guidance
- `/link +phone` account linking
- natural-language expense save
- natural-language income save
- duplicate confirmation flow (`guardar` / `descartar`)
- update movement by reference (amount/concept/category)
- unknown/unlinked user handling

## 3) API contract checks (Swagger)

Checked on `/api/docs`:
- auth OTP request/verify/refresh
- Telegram link token endpoints
- profile endpoints
- expenses/incomes/categories/budgets/reports
- telegram webhook endpoint

Specific final checks:
- `/budgets` marked canonical in docs
- `/budgets/monthly` kept as deprecated legacy alias
- `/expenses` POST documents normalization note and success/error examples

## 4) Release checklist status

Reference: `docs/release-checklist.md`

- Pre-merge gates: completed
- Migration verification: completed
- Telegram smoke: completed
- Bilingual QA: completed
- Swagger/docs pass: completed
- Post-deploy checks: ready

