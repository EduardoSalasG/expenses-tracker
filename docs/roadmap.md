# Roadmap

## Shared Accounts and Splitwise-Like Flow

Current product scope keeps one personal financial context per user plus optional Telegram capture.
Next major domain expansion is shared accounts with progressive Splitwise-style behavior.

### Phase 1: Shared Account Foundation

- Introduce `financial_accounts` with `personal | shared`.
- Keep one personal account per existing user.
- Add `financial_account_members` with roles `owner | admin | member`.
- Add account invitations and acceptance flow.
- Move expenses, incomes, budgets, categories, banks, and payment methods to `financial_account_id`.
- Web selector to switch between personal and shared accounts.
- Telegram command to switch active account context, for example `/Casa`.

### Phase 2: Shared Expense Capture

- Store who created the movement and who paid it.
- Support shared account expense/income creation from web and Telegram.
- Keep category model as system defaults plus account-level custom categories.
- Add shared dashboards and reports per financial account.

### Phase 3: Splitwise-Like Allocation

- Add expense allocation model per member.
- First support equal split.
- Then support custom amount or percentage split.
- Show who paid, who owes, and basic balance per member.

### Phase 4: Settlement and Reconciliation

- Track reimbursements and settlements between members.
- Show pending balances and settlement history.
- Add shared account monthly summaries and alerts.

## Migration Strategy for Production

Shared accounts require production-safe migration in two parts:

1. Structure migration:
   - create new tables
   - add new foreign keys and indexes
   - add nullable `financial_account_id` to existing financial tables

2. One-time backfill:
   - create one personal financial account for every existing user
   - populate `financial_account_id` on existing expenses, incomes, budgets, categories, banks, and payment methods
   - create owner membership for each personal account

Implementation rule:

- leave these as explicit one-time scripts
- do not depend on runtime boot logic
- keep them idempotent where possible
- validate against local before production

When this feature starts, deliverables must include:

- SQL migration scripts for schema
- one backfill SQL/TS script for existing data
- Swagger updates
- README/backend/frontend/docs alignment
- QA evidence for personal vs shared context switching

## Current Status

Implemented in backend and frontend as of August 11, 2026:

- schema foundation and backfill support
- repository support for memberships, invitations, and messaging contexts
- shared account creation and rename
- member listing and member removal
- invitation creation and acceptance
- Telegram account-context switching with `/AccountName`
- frontend account selector and active-account context switching
- active account visibility banner across dashboard, expenses, incomes, budgets, and categories
- shared account capture from web and Telegram through the currently active financial account
- account-scoped dashboard and reports through the existing analytics views after switching the active account
- shared expense allocation persistence with payer, equal split, and custom split modes
- allocation-aware expense editing foundation, including proportional rescaling for existing custom splits when amount changes

Still pending for the Splitwise expansion:

- balances by member
- settlements and reconciliation flows
