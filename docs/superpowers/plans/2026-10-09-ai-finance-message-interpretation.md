# AI Finance Message Interpretation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reliably categorize conversational expenses, support a one-message account override, and learn category choices per financial account without saving uncertain movements.

**Architecture:** Add a durable account-scoped category-preference repository and a small application service that resolves explicit selections, learned preferences, then the existing model/deterministic inference. Extend the validated interpreter contract with an optional per-message account name; the inbound use case resolves that account before loading its catalog, payment options, shared-expense data, and category preference. Preferences are written immediately on explicit corrections and after three consistent confirmed expenses.

**Tech Stack:** TypeScript, Express application layer, Zod, PostgreSQL, in-memory repositories, Vitest, Mermaid.

**Spec:** `docs/superpowers/specs/2026-10-09-ai-finance-message-interpretation-design.md`

## Global Constraints

- Apply to WhatsApp and Telegram inbound finance messages without changing the persistent Telegram account context for an inline account override.
- The named account must be accessible to the sender; an unavailable account must make no financial write.
- Scope learned preferences by `financialAccountId`, thereby sharing them with that account's members and isolating all other accounts.
- Explicit category/subcategory text wins over learned preferences and inferred categories.
- An explicit correction creates a preference immediately; create a consensus preference only after three consistent confirmed movements.
- Never default an unresolved category to `Other`; retain the draft and request clarification.
- Do not send historical transactions or raw message history to the AI provider.
- Preserve `3 cuotas` / `3x`; use the expense date if no first-installment date is stated.
- Keep the deterministic interpreter as fallback for absent, failed, or invalid AI provider responses.

---

## File Structure

- Create: `database/migrations/041_financial_account_category_preferences.sql` — durable account-scoped preference table, constraints and indexes.
- Create: `backend/src/application/ports/category-preference.repository.ts` — application-level preference records and persistence contract.
- Create: `backend/src/application/services/category-preference.service.ts` — signal normalization, precedence and three-observation consensus rules.
- Create: `backend/src/application/services/category-preference.service.test.ts` — pure preference-service behavior.
- Modify: `backend/src/application/ports/index.ts` — export the new port types.
- Modify: `backend/src/application/ports/expense.repository.ts` — expose the bounded historical evidence query required for consensus/backfill.
- Modify: `backend/src/infrastructure/repositories/in-memory.ts` — in-memory preference repository and bounded evidence query.
- Modify: `backend/src/infrastructure/repositories/postgres.ts` — PostgreSQL preference repository and account-scoped evidence query.
- Modify: `backend/src/infrastructure/container.ts` — compose and inject the preference repository/service.
- Modify: `backend/src/application/message-interpreter.ts` — add `accountName` to create-expense/create-income output, deterministic inline-account extraction, and account-marker removal from the stored concept.
- Modify: `backend/src/application/message-interpreter.test.ts` — account-marker and category-inference regression tests.
- Modify: `backend/src/infrastructure/message-interpreter.provider.ts` — require account names to come only from supplied accessible accounts and add representative account-override examples.
- Modify: `backend/src/infrastructure/message-interpreter.provider.test.ts` — assert provider payload/normalization respects the extended contract.
- Modify: `backend/src/application/use-cases/process-inbound-finance-message.use-case.ts` — resolve inline account before scoped dependencies; apply and record preferences; preserve category drafts.
- Modify: `backend/src/application/process-inbound-finance-message.use-case.test.ts` — end-to-end in-memory coverage for both channels, account safety, preference learning and installments.
- Create: `backend/src/infrastructure/db-backfill-category-preferences.ts` — idempotent local/admin backfill from account-scoped expense history.
- Modify: `backend/package.json` — add `db:backfill:category-preferences` script.
- Modify: `backend/README.md` — document account syntax, category-learning semantics and confirmation behavior.
- Modify: `docs/diagrams/message-interpretation.mmd` — show account resolution and preference precedence.

### Task 1: Persist and resolve account-scoped category preferences

**Files:**
- Create: `database/migrations/041_financial_account_category_preferences.sql`
- Create: `backend/src/application/ports/category-preference.repository.ts`
- Create: `backend/src/application/services/category-preference.service.ts`
- Create: `backend/src/application/services/category-preference.service.test.ts`
- Modify: `backend/src/application/ports/index.ts`
- Modify: `backend/src/application/ports/expense.repository.ts`
- Modify: `backend/src/infrastructure/repositories/in-memory.ts`
- Modify: `backend/src/infrastructure/repositories/postgres.ts`
- Modify: `backend/src/infrastructure/container.ts`

**Interfaces:**
- Consumes: `ExpenseRepository`, `CategoryRepository`, `FinancialAccountRepository` and existing account-scoped category IDs.
- Produces: `CategoryPreferenceRepository` with `findForSignal`, `upsertExplicit`, `recordConsensusEvidence`, and `listConsensusCandidates`; `CategoryPreferenceService.resolve` and `recordConfirmedSelection`.

- [ ] **Step 1: Write the failing preference-service tests**

```ts
it('returns an explicit preference immediately for the same account only', async () => {
  await preferences.upsertExplicit({ financialAccountId: 'home', signal: 'uber', categoryId: 'transport' });
  await expect(service.resolve({ financialAccountId: 'home', concept: 'Uber Chile' }))
    .resolves.toMatchObject({ categoryId: 'transport', source: 'explicit_correction' });
  await expect(service.resolve({ financialAccountId: 'personal', concept: 'Uber Chile' })).resolves.toBeUndefined();
});

it('creates consensus only on the third matching confirmed selection', async () => {
  await service.recordConfirmedSelection(input('home', 'panaderia central', 'food', 'groceries'));
  await service.recordConfirmedSelection(input('home', 'panaderia central', 'food', 'groceries'));
  await expect(service.resolve({ financialAccountId: 'home', concept: 'Panadería Central' })).resolves.toBeUndefined();
  await service.recordConfirmedSelection(input('home', 'panaderia central', 'food', 'groceries'));
  await expect(service.resolve({ financialAccountId: 'home', concept: 'Panadería Central' }))
    .resolves.toMatchObject({ source: 'historical_consensus', evidenceCount: 3 });
});
```

- [ ] **Step 2: Run the new test file and verify it fails**

Run: `pnpm --filter @expenses-tracker/backend test -- src/application/services/category-preference.service.test.ts`

Expected: FAIL because the port, service and repository implementation do not exist.

- [ ] **Step 3: Add the schema, port, service and repository implementations**

Create `financial_account_category_preferences` with a UUID primary key, `financial_account_id` foreign key, normalized `signal`, `category_id`, nullable `subcategory_id`, `source` constrained to `explicit_correction` or `historical_consensus`, `evidence_count`, and timestamps. Add a unique index on `(financial_account_id, signal)` and indexes for account/category lookup.

```ts
export interface CategoryPreferenceRepository {
  findForSignal(input: { financialAccountId: string; signal: string }): Promise<CategoryPreference | undefined>;
  upsertExplicit(input: CategoryPreferenceSelection): Promise<CategoryPreference>;
  recordConsensusEvidence(input: CategoryPreferenceSelection): Promise<CategoryPreference | undefined>;
  listConsensusCandidates(): Promise<CategoryPreferenceCandidate[]>;
}

export class CategoryPreferenceService {
  normalizeSignal(concept: string): string;
  resolve(input: { financialAccountId: string; concept: string }): Promise<CategoryPreference | undefined>;
  recordConfirmedSelection(input: CategoryPreferenceSelection & { explicit: boolean }): Promise<void>;
}
```

`normalizeSignal` must lowercase, remove accents and punctuation, normalize whitespace, and reject an empty result. `recordConfirmedSelection` must call `upsertExplicit` when `explicit` is true; otherwise it increments only the matching account/signal/category/subcategory evidence and materializes a preference at count three. Add the equivalent in-memory and PostgreSQL implementations, export the port, and inject the service into the inbound-message use case through `createContainer`.

- [ ] **Step 4: Run focused tests and typecheck**

Run: `pnpm --filter @expenses-tracker/backend test -- src/application/services/category-preference.service.test.ts`

Expected: PASS.

Run: `pnpm --filter @expenses-tracker/backend build`

Expected: PASS.

- [ ] **Step 5: Commit the persistence slice**

```bash
git add database/migrations/041_financial_account_category_preferences.sql backend/src/application/ports backend/src/application/services/category-preference.service.ts backend/src/application/services/category-preference.service.test.ts backend/src/infrastructure/repositories backend/src/infrastructure/container.ts
git commit -m "feat: store account-scoped category preferences"
```

### Task 2: Extend the interpreter contract for inline account overrides

**Files:**
- Modify: `backend/src/application/message-interpreter.ts`
- Modify: `backend/src/application/message-interpreter.test.ts`
- Modify: `backend/src/infrastructure/message-interpreter.provider.ts`
- Modify: `backend/src/infrastructure/message-interpreter.provider.test.ts`

**Interfaces:**
- Consumes: `MessageInterpreterContext.availableFinancialAccounts` and the Task 1 preference service only as application-side data, not raw history.
- Produces: `Extract<InterpretedMessage, { intent: 'create_expense' | 'create_income' }>['accountName']?: string` and a deterministic account extractor.

- [ ] **Step 1: Add failing interpreter/provider tests**

```ts
it('extracts a single accessible account marker without retaining it in the concept', async () => {
  const result = await new DeterministicMessageInterpreter().interpret(
    '25000 supermercado, debito, 3 cuotas, cuenta Hogar',
    contextWithAccounts(['Personal', 'Hogar'])
  );
  expect(result).toMatchObject({ intent: 'create_expense', accountName: 'Hogar', concept: 'supermercado' });
});

it('asks an OpenAI-compatible provider to return only a supplied accessible account name', async () => {
  const body = capturedRequestBody();
  expect(body.messages.at(-1)?.content).toContain('financialAccounts');
  expect(body.messages.at(-1)?.content).toContain('Do not invent financial accounts');
});
```

- [ ] **Step 2: Run the interpreter tests and verify they fail**

Run: `pnpm --filter @expenses-tracker/backend test -- src/application/message-interpreter.test.ts src/infrastructure/message-interpreter.provider.test.ts`

Expected: FAIL because create intents have no `accountName` and account markers are treated as concept text.

- [ ] **Step 3: Extend Zod, deterministic parsing and provider prompt/examples**

Add optional `accountName: z.string().min(1)` to the `create_expense` and `create_income` variants. Implement extraction for `cuenta <nombre>` and `account <name>` by matching exactly one normalized accessible account; leave `accountName` undefined if no unique match. Remove only the recognized account clause before `parseExpenseMessage` builds the concept.

Update `buildChatCompletionPayload`, `systemPrompt` and few-shot examples so the model returns `accountName` only for a provided account, sets confirmation fields when uncertain, and never receives historical raw messages. Preserve `normalizeInterpretedPayload` compatibility for responses without the new field.

- [ ] **Step 4: Run focused tests and build**

Run: `pnpm --filter @expenses-tracker/backend test -- src/application/message-interpreter.test.ts src/infrastructure/message-interpreter.provider.test.ts`

Expected: PASS.

Run: `pnpm --filter @expenses-tracker/backend build`

Expected: PASS.

- [ ] **Step 5: Commit the contract slice**

```bash
git add backend/src/application/message-interpreter.ts backend/src/application/message-interpreter.test.ts backend/src/infrastructure/message-interpreter.provider.ts backend/src/infrastructure/message-interpreter.provider.test.ts
git commit -m "feat: parse inline messaging account overrides"
```

### Task 3: Apply account-first resolution and learned-category precedence

**Files:**
- Modify: `backend/src/application/use-cases/process-inbound-finance-message.use-case.ts`
- Modify: `backend/src/application/process-inbound-finance-message.use-case.test.ts`

**Interfaces:**
- Consumes: Task 1 `CategoryPreferenceService`, Task 2 `accountName`, `FinancialAccountRepository.findAccessibleById/listAccessibleByUser`, and existing category drafts.
- Produces: a saved expense only after account authorization and category resolution; account-aware reply text.

- [ ] **Step 1: Add failing inbound-message use-case tests**

```ts
it.each(['telegram', 'whatsapp'])('saves an inline-account expense for %s without changing messaging context', async (channel) => {
  const result = await useCase.execute(inbound(channel, '25000 supermercado, debito, cuenta Hogar'));
  expect(result).toMatchObject({ status: 'saved', expense: { financialAccountId: shared.account.id } });
  await expect(accounts.findMessagingContext(channel, providerUserId)).resolves.toMatchObject({ financialAccountId: personal.id });
});

it('does not save when the named account is inaccessible', async () => {
  await expect(useCase.execute(inbound('telegram', '25000 supermercado, debito, cuenta Secreta')))
    .resolves.toMatchObject({ status: 'account_not_found' });
  expect(await expenses.listRecent(user.tenantId, 10)).toHaveLength(0);
});

it('uses an explicit correction immediately and consensus only after three confirmed matching expenses', async () => {
  // Save/confirm one correction, then assert the next equivalent message is categorized automatically.
  // Save three independently confirmed equivalent messages in a different account, then assert only that account learns.
});
```

- [ ] **Step 2: Run the focused use-case tests and verify they fail**

Run: `pnpm --filter @expenses-tracker/backend test -- src/application/process-inbound-finance-message.use-case.test.ts`

Expected: FAIL because `trySaveExpense` loads categories before resolving the inline account and ignores preferences.

- [ ] **Step 3: Refactor the inbound resolution pipeline**

Create a private `resolveMessageFinancialAccount(user, input, accountName)` that starts from the channel context, resolves an exact normalized inline name from `listAccessibleByUser`, and returns an `account_not_found` reply with accessible account labels when no unique authorized match exists. It must not call `upsertMessagingContext`.

In `trySaveExpense` and income creation, resolve this account before calling `categories.listByTenant`, `banks.listByTenant`, `paymentMethods.listByTenant`, payment selection, shared-allocation logic or category matching. Add a private `resolveExpenseCategory` that applies explicit message category/subcategory, then `CategoryPreferenceService.resolve`, then existing model/deterministic matching. Preserve the current `category_selection` and `category_disambiguation` draft paths for every unresolved/ambiguous outcome.

After a successful save or explicit category-draft resolution, call `recordConfirmedSelection`. Pass `explicit: true` only when the user explicitly supplied or confirmed the category; otherwise record consensus evidence. Update `expenseSavedMessage` to include the effective account in both languages while retaining the existing installment summary and first-charge default.

- [ ] **Step 4: Run focused use-case tests and the full backend suite**

Run: `pnpm --filter @expenses-tracker/backend test -- src/application/process-inbound-finance-message.use-case.test.ts`

Expected: PASS.

Run: `pnpm --filter @expenses-tracker/backend test`

Expected: PASS.

- [ ] **Step 5: Commit the application-flow slice**

```bash
git add backend/src/application/use-cases/process-inbound-finance-message.use-case.ts backend/src/application/process-inbound-finance-message.use-case.test.ts
git commit -m "feat: learn categories per financial account"
```

### Task 4: Add idempotent historical preference backfill and database verification

**Files:**
- Create: `backend/src/infrastructure/db-backfill-category-preferences.ts`
- Modify: `backend/package.json`
- Modify: `backend/src/application/process-inbound-finance-message.postgres.integration.test.ts`

**Interfaces:**
- Consumes: Task 1 preference schema/repository and account-scoped expenses with canonical category IDs.
- Produces: `backfillCategoryPreferences(pool): Promise<{ scanned: number; created: number; skipped: number }>` and `pnpm --filter @expenses-tracker/backend db:backfill:category-preferences`.

- [ ] **Step 1: Write the failing PostgreSQL integration and backfill tests**

```ts
it('creates one account-scoped consensus preference from exactly three matching historical expenses', async () => {
  await insertExpense({ financialAccountId: home.id, concept: 'Panadería Central', categoryId: food.id });
  await insertExpense({ financialAccountId: home.id, concept: 'panaderia central', categoryId: food.id });
  await insertExpense({ financialAccountId: home.id, concept: 'PANADERÍA CENTRAL', categoryId: food.id });
  await expect(backfillCategoryPreferences(pool)).resolves.toMatchObject({ created: 1 });
  await expect(preferences.findForSignal({ financialAccountId: home.id, signal: 'panaderia central' })).resolves.toBeDefined();
});
```

- [ ] **Step 2: Run the integration test and verify it fails**

Run: `pnpm --filter @expenses-tracker/backend test -- src/application/process-inbound-finance-message.postgres.integration.test.ts`

Expected: FAIL because no preference table/backfill entrypoint exists.

- [ ] **Step 3: Implement the bounded, idempotent backfill**

Implement `backfillCategoryPreferences` with grouped account-local records only. Normalize the saved expense concept through the same service helper; create only groups with exactly one canonical category/subcategory and count at least three. Use repository upserts so a second run reports no duplicate rows and never overwrites an `explicit_correction` preference. Register the package script using the existing `tsx` database-tool convention.

- [ ] **Step 4: Run integration tests, migration bootstrap and build**

Run: `pnpm --filter @expenses-tracker/backend test -- src/application/process-inbound-finance-message.postgres.integration.test.ts`

Expected: PASS.

Run: `pnpm --filter @expenses-tracker/backend build`

Expected: PASS.

Run: `pnpm --filter @expenses-tracker/backend db:bootstrap`

Expected: PASS against the local development database, applying migration `041` once.

- [ ] **Step 5: Commit the backfill slice**

```bash
git add backend/src/infrastructure/db-backfill-category-preferences.ts backend/src/application/process-inbound-finance-message.postgres.integration.test.ts backend/package.json
git commit -m "feat: backfill category preferences from account history"
```

### Task 5: Document the behavior and run release-quality verification

**Files:**
- Modify: `backend/README.md`
- Modify: `docs/diagrams/message-interpretation.mmd`
- Modify: `docs/diagrams/flows.md`

**Interfaces:**
- Consumes: Tasks 1–4 behavior and existing messaging documentation.
- Produces: accurate operator and user guidance for inline account capture, safe clarification and category learning.

- [ ] **Step 1: Write documentation assertions as review checklist entries**

Add explicit examples that a reviewer can validate:

```markdown
- `25.000 supermercado, débito, 3 cuotas, cuenta Hogar` targets Hogar only for this message.
- An unknown or inaccessible account is not saved and does not change Telegram's active account.
- A category correction is remembered for that financial account; three consistent confirmed expenses can create the same preference.
- Ambiguous categories are clarified rather than saved as Other.
```

- [ ] **Step 2: Update the README and diagrams**

Update the interpreter section in `backend/README.md` and the root messaging feature wording to distinguish persistent Telegram switching from a per-message account override. Update `message-interpretation.mmd` with account resolution before scoped catalog loading, preference lookup before fallback inference, and clarification before persistence. Update `flows.md` with the new diagram behavior in prose.

- [ ] **Step 3: Verify documentation and static quality**

Run: `git diff --check`

Expected: no output.

Run: `pnpm --filter @expenses-tracker/backend lint`

Expected: PASS.

Run: `pnpm --filter @expenses-tracker/backend test`

Expected: PASS.

Run: `pnpm --filter @expenses-tracker/backend build`

Expected: PASS.

- [ ] **Step 4: Commit documentation and verification-ready state**

```bash
git add backend/README.md docs/diagrams/message-interpretation.mmd docs/diagrams/flows.md
git commit -m "docs: explain learned messaging categories"
```

## Plan self-review

- **Spec coverage:** Tasks 1 and 4 deliver durable, account-scoped explicit and three-observation consensus preferences without provider-history disclosure. Task 2 adds the validated account contract and fallback behavior. Task 3 enforces account authorization, category precedence, drafts and installment continuity for both channels. Task 5 documents the user-facing behavior and runs the required backend verification.
- **Placeholder scan:** No unresolved placeholders, deferred implementation references or generic test instructions remain; each task includes concrete interfaces, commands and expected outcomes.
- **Type consistency:** `CategoryPreferenceRepository` and `CategoryPreferenceService` are introduced in Task 1, `accountName` in Task 2, and both are consumed by Task 3. The backfill in Task 4 uses the same service normalization and repository upsert semantics.
