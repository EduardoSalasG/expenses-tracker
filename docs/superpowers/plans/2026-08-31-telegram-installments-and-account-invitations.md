# Telegram Installments And Account Invitations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let Telegram messages set the first charge date of equal installments and notify shared-account invitees by email.

**Architecture:** Extend the interpreted message contract with an ISO first-installment date and keep the existing installment scheduler as the single source of truth. Persist invitation email delivery metadata after the invitation is created; delivery failures are observable but never invalidate the invitation or its manual acceptance link.

**Tech Stack:** TypeScript, Express, Zod, PostgreSQL migrations, Resend, Angular, Vitest.

**Spec:** User-approved conversation design, 2026-08-31.

## Global Constraints

- Work and commit on `dev`; do not modify the user's untracked `AGENTS.template.md`.
- Installments are equal; interest and variable installment amounts are out of scope.
- Existing migration bootstrap remains the production migration mechanism.
- Invitation email is best effort; the persisted invitation and manual link are the fallback.

---

### Task 1: First Charge Date From Telegram

**Files:**
- Modify: `backend/src/application/message-interpreter.ts`
- Modify: `backend/src/infrastructure/message-interpreter.provider.ts`
- Modify: `backend/src/application/use-cases/process-inbound-finance-message.use-case.ts`
- Test: `backend/src/application/process-inbound-finance-message.use-case.test.ts`

- [ ] Write a failing inbound-message test for `3 cuotas, primera cuota el 2026-09-05`.
- [ ] Pass `firstInstallmentDate` from the interpreter to the existing expense repository scheduler.
- [ ] Require the LLM response to return a supplied first charge date as `YYYY-MM-DD` and include a multishot example.
- [ ] Verify the stored installment schedule and confirmation message.

### Task 2: Invitation Email Delivery

**Files:**
- Create: `database/migrations/031_financial_account_invitation_email_delivery.sql`
- Create: `backend/src/application/financial-account-invitation-email.ts`
- Modify: `backend/src/domain/financial-accounts/types.ts`
- Modify: `backend/src/application/ports/financial-account.repository.ts`
- Modify: `backend/src/infrastructure/repositories/in-memory.ts`
- Modify: `backend/src/infrastructure/repositories/postgres.ts`
- Modify: `backend/src/application/use-cases/financial-accounts.use-cases.ts`
- Modify: `backend/src/infrastructure/container.ts`
- Test: `backend/src/application/financial-accounts.use-cases.test.ts`

- [ ] Write failing tests for successful delivery and delivery failure that keeps the invitation usable.
- [ ] Add delivery timestamp and error columns plus repository update methods.
- [ ] Render accessible Spanish/English Resend email HTML and plain text with the seven-day acceptance URL.
- [ ] Select recipient language from an existing account when available, otherwise from the inviter.
- [ ] Verify delivery status is persisted without turning a failed email into an API failure.

### Task 3: Contracts And Release Evidence

**Files:**
- Modify: `backend/src/interfaces/http/openapi.ts`
- Modify: `docs/postman/expenses-tracker.postman_collection.json`
- Modify: `docs/shared-accounts-design.md`
- Modify: `docs/operations.md`
- Modify: `frontend/src/app/core/api.service.ts`
- Modify: `frontend/src/app/shared/components/account-create-dialog.component.ts`

- [ ] Document invitation delivery metadata and the migration/deployment behavior.
- [ ] Keep the manual invite link available and clarify whether email delivery succeeded.
- [ ] Run backend tests, backend build, frontend build, migration validation, and review the final diff before committing on `dev`.
