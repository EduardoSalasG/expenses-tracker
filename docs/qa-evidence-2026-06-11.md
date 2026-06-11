# QA Evidence - 2026-06-11

Scope validated for release-candidate closure before promoting backend/runtime changes to production.

## 0) Automated evidence

- `pnpm --filter @expenses-tracker/backend test` -> PASS (`50 passed`, `3 skipped`)
- `pnpm --filter @expenses-tracker/backend build` -> PASS
- `pnpm --filter @expenses-tracker/frontend build` -> PASS

## 1) Current functional scope covered by the release candidate

Validated product scope carried forward from the current release candidate state:

- Public landing with `ES / EN` switching and automatic public-locale defaulting
- Web registration:
  - lead capture step
  - full account creation step
  - welcome email
- Web login:
  - password login
  - magic-link request / consume
- Optional Telegram linking:
  - `/start`
  - `/link +phone`
  - link-token auto-login for linked users
- Private web app:
  - dashboard monthly / annual views
  - expenses create / edit / delete
  - incomes create / edit / delete
  - permanent budgets
  - categories
  - settings / logout
  - inline creation for categories, subcategories, banks, and payment methods
- Messaging flows:
  - expense save
  - income save
  - duplicate confirmation
  - movement correction by reference
  - commands/help

## 2) Release-day QA summary

This final release pass is a documentation + verification closure pass. No product-code changes were introduced in this turn beyond documentation consistency fixes.

Therefore, the functional QA baseline remains:

- Current web flows: accepted from the latest validated release-candidate behavior already documented in prior QA evidence.
- Current Telegram flows: accepted from the latest validated release-candidate behavior already documented in prior QA evidence.
- Current contract/build status: revalidated today through automated test/build execution.

## 3) Manual regression reference set

Reference functional evidence remains captured in:

- `docs/qa-evidence-2026-06-10.md`
- `docs/release-evidence-2026-06-10.md`
- `docs/post-deploy-qa-template.md`

Those files already cover:

- desktop/mobile UI smoke
- Telegram conversational flows
- dashboard/reporting surface
- edit/delete maintenance flows
- bilingual UX checks

## 4) Final acceptance statement

For the purpose of release closure on 2026-06-11:

- automated quality gates are green
- documentation is aligned with the current product behavior
- Swagger audit is refreshed in `docs/swagger-audit-2026-06-11.md`
- release evidence is refreshed in `docs/release-evidence-2026-06-11.md`

Result: PASS
