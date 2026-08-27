# QA Evidence - 2026-08-11

Scope validated for shared-account closure before promoting the current branch to production.

## 0) Automated evidence

- `pnpm --filter @expenses-tracker/backend test` -> PASS (`69 passed`, `5 skipped`)
- `pnpm --filter @expenses-tracker/backend build` -> PASS
- `pnpm --filter @expenses-tracker/frontend build` -> PASS

## 1) Shared-account scope validated in this pass

Validated product scope carried forward from the current codebase state:

- personal and shared financial accounts
- shared account creation and rename
- invitations, acceptance flow, and member removal
- web account-context switching
- Telegram account-context switching with `/accounts`, `/current`, `/AccountName`, and `/account Account Name`
- shared-account expense capture from web and Telegram
- expense allocations with payer attribution, equal split, and custom split persistence
- balances by member
- settlement suggestions generated from balances
- settlement creation and settlement history

## 2) Telegram conversational checks covered by automated tests

Backend automated tests now cover:

- shared-account settlement command from Telegram
- natural settlement phrase handling such as `le pagué 7000 a vane`
- equal shared split capture from phrases such as `compartido con vane y juan`
- switching from a personal account to a shared account and saving both a subsequent expense and income in that shared account
- pending Telegram drafts are cleared when account context changes, preventing cross-account confirmation

Reference tests:

- `backend/src/application/process-inbound-finance-message.use-case.test.ts`
- `backend/src/application/financial-accounts.use-cases.test.ts`

## 3) Manual regression reference set

Reference functional evidence remains captured in:

- `docs/qa-evidence-2026-06-11.md`
- `docs/release-evidence-2026-06-11.md`
- `docs/post-deploy-qa-template.md`

Those files still cover the broader web/private/mobile baseline. This pass closes the shared-account delta specifically.

## 4) Acceptance statement

For the shared-account closure pass on August 11, 2026:

- automated quality gates are green
- settlement suggestions are available in backend, API contract, and frontend
- Telegram shared settlement/split parsing is covered by tests
- documentation is aligned with the current shared-account scope

Result: PASS
