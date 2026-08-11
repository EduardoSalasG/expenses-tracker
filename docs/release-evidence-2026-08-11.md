# Release Evidence (dev -> main) - 2026-08-11

This document records the release evidence for the shared-account closure pass.

## Branching rule

- Integration branch: `dev`
- Production branch: `main`
- Promotion rule: commit and validate on `dev`, then merge `dev -> main`
- Hotfix rule: if a hotfix lands on `main`, regularize `dev` immediately

## Build and test gates

- Backend tests: PASS (`69 passed`, `5 skipped`)
- Backend build: PASS
- Frontend build: PASS

## Functional closure in this pass

Closed in this release:

- shared-account balances by member
- settlement suggestions endpoint and frontend surface
- shared-account settlement recording flow
- Telegram natural-language settlement and shared split coverage

## Documentation closure

Updated in this pass:

- `README.md`
- `backend/README.md`
- `docs/roadmap.md`
- `docs/shared-accounts-design.md`
- `docs/qa-evidence-2026-08-11.md`
- `docs/swagger-audit-2026-08-11.md`

## Release readiness statement

Current result:

- automated gates are green
- shared-account implementation and documentation are aligned
- Swagger/Postman contract includes the shared settlement-suggestion surface
- `dev` was merged into `main` after validation

Status: READY FOR PRODUCTION PROMOTION
