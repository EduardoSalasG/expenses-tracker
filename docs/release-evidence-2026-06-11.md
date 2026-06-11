# Release Evidence (dev -> main) - 2026-06-11

This document records the final documentation, QA, and contract-closure evidence for the current release candidate.

## Branching rule

- Integration branch: `dev`
- Production branch: `main`
- Promotion rule: commit and validate on `dev`, then merge `dev -> main`
- Hotfix rule: if any hotfix lands on `main`, regularize `dev` immediately

## Build and test gates

- Backend tests: PASS (`50 passed`, `3 skipped`)
- Backend build: PASS
- Frontend build: PASS

## Documentation closure

Updated in this pass:

- `frontend/README.md`
  - removed duplicated `/` route bullet
  - preserved final wording for public locale behavior
- `docs/diagrams/flows.md`
  - clarified historical WhatsApp file names as compatibility-only file references while keeping Telegram semantics explicit
- release evidence refreshed for current date
- QA evidence refreshed for current date
- Swagger audit refreshed for current date

## Contract closure

Final endpoint-by-endpoint Swagger review completed and saved in:

- `docs/swagger-audit-2026-06-11.md`

Coverage explicitly includes:

- health and public context
- web auth
- magic links
- Telegram registration/link-token flows
- expenses and incomes create/edit/delete
- categories, banks, payment methods
- budgets and deprecated aliases
- report endpoints
- Telegram webhook

## Release readiness statement

Current result:

- automated gates are green
- documentation is aligned with the current product state
- Swagger contract is audited and release-ready
- no unresolved doc inconsistencies remained in the files touched by this pass

Status: READY FOR BACKEND PRODUCTION PROMOTION
