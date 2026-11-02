# Informes mensuales PDF por correo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar un PDF mensual con KPI, tablas y gráficos a cada miembro activo con email de cada cuenta.

**Architecture:** Un job mensual procesa cuentas y no usuarios; genera un modelo determinista, renderiza el PDF y registra cada entrega por cuenta, período y destinatario. El scheduler versionado invoca el job y los reintentos conservan idempotencia.

**Tech Stack:** TypeScript, PostgreSQL, Resend attachments, PDFKit, SVG charts, Docker Compose scheduler.

**Spec:** `docs/superpowers/specs/2026-10-28-pwa-notifications-monthly-reports-design.md`

## Global Constraints

- Una cuenta personal entrega a un miembro; una compartida a cada miembro `active` con email.
- No revelar destinatarios entre participantes ni guardar PDFs públicamente.
- KPI deterministas, explicables y multi-moneda; reintentos no duplican correo.

---

### Task 1: Datos, dispatches y adjuntos de correo

**Files:**
- Create: `database/migrations/041_account_report_dispatches.sql`, `backend/src/application/ports/account-report-dispatch.repository.ts`
- Modify: `backend/src/application/ports/email.provider.ts`, `backend/src/infrastructure/email-providers/resend.provider.ts`, repositories, `container.ts`
- Test: `backend/src/infrastructure/email-providers/resend.provider.test.ts`

**Interfaces:** extend `EmailProvider.send` with `attachments?: Array<{ filename: string; content: string; contentType: 'application/pdf' }>`; produce `AccountReportDispatchRepository.reserve(input): Promise<boolean>`.

- [ ] **Step 1: Write failing attachment/idempotency tests**

```ts
expect(fetchBody.attachments[0]).toEqual(expect.objectContaining({ filename: 'reporte-2026-10.pdf', content: expect.any(String) }));
expect(await dispatches.reserve(input)).toBe(true);
expect(await dispatches.reserve(input)).toBe(false);
```

- [ ] **Step 2: Implement schema and provider extension**

```ts
send({ to, subject, html, text, attachments: [{ filename, content: pdf.toString('base64'), contentType: 'application/pdf' }] })
```

Use unique `(financial_account_id, recipient_user_id, period_from, period_to, channel)` for pending/sent dispatches.

- [ ] **Step 3: Verify and commit**

Run: `pnpm --filter @expenses-tracker/backend test; pnpm --filter @expenses-tracker/backend build`

```bash
git add backend database/migrations/041_account_report_dispatches.sql
git commit -m "feat: support idempotent report email attachments"
```

### Task 2: Deterministic monthly PDF model and renderer

**Files:**
- Create: `backend/src/application/services/monthly-account-report.service.ts`, `backend/src/infrastructure/pdf/monthly-account-report.pdf.ts`, tests
- Modify: `backend/package.json`, `backend/src/application/ports/financial-account.repository.ts`

- [ ] **Step 1: Write failing model and PDF tests**

```ts
expect(report.kpis).toContainEqual({ key: 'net_balance', currency: 'CLP', value: 25000 });
expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
```

- [ ] **Step 2: Implement the minimal renderer**

```ts
const doc = new PDFDocument({ margin: 48 });
doc.text(`${account.name} · ${periodLabel}`);
doc.addPage().text('Gastos por categoría');
```

Calculate totals, previous-period variation when available, category totals, top expenses and SVG bar/line charts from the existing finance repositories; emit 2–4 named insights only when their prerequisite data exists.

- [ ] **Step 3: Verify and commit**

Run: `pnpm --filter @expenses-tracker/backend test; pnpm --filter @expenses-tracker/backend build`

```bash
git add backend
git commit -m "feat: render deterministic monthly account pdf reports"
```

### Task 3: Account-oriented job and production scheduler

**Files:**
- Create: `backend/src/application/use-cases/send-monthly-account-reports.use-case.ts`, `backend/src/infrastructure/send-monthly-account-reports.ts`, tests
- Modify: `backend/src/infrastructure/container.ts`, `backend/package.json`, `backend/compose.production.yaml`, `.github/workflows/deploy-backend-docker.yml`, `docs/operations.md`, `backend/README.md`

**Interfaces:** add `FinancialAccountRepository.listAll(): Promise<FinancialAccount[]>`; produce `SendMonthlyAccountReportsUseCase.execute(referenceDate?: Date): Promise<{sent:number;skipped:number;failed:number}>` and the command `reports:send-monthly-account`.

- [ ] **Step 1: Write failing personal/shared recipient tests**

```ts
expect(result.sent).toBe(2);
expect(email.send).toHaveBeenCalledWith(expect.objectContaining({ to: 'member-a@example.com' }));
expect(email.send).toHaveBeenCalledWith(expect.objectContaining({ to: 'member-b@example.com' }));
```

- [ ] **Step 2: Implement the job and schedule**

```ts
for (const account of await accounts.listAll()) {
  for (const member of await accounts.listMembers(account.id)) if (member.status === 'active' && member.email) await dispatch(member);
}
```

Run the `reports-monthly` one-shot service from a versioned scheduler definition at 08:15 on day 1; log sent/skipped/failed counts and exit nonzero only after recording failures.

- [ ] **Step 3: Verify, document and commit**

Run: `pnpm --filter @expenses-tracker/backend test; pnpm --filter @expenses-tracker/backend build; docker compose -f backend/compose.production.yaml config`

```bash
git add backend .github docs
git commit -m "feat: deliver monthly account pdf reports by email"
```
