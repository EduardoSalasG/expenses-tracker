# Persisted Category Translations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Persist bilingual category labels, translate historical and new custom entries safely, recognize aliases in Telegram, and limit dashboard recent expenses to its active period.

**Architecture:** categories.name remains the original canonical value. name_es, name_en, and translation_source become display metadata served by the existing API. A provider-neutral translation service is shared by web creation, Telegram category creation, and a backfill runner. The frontend renders the persisted locale value and uses the original only when a label is missing.

**Tech Stack:** PostgreSQL, Express/TypeScript, Zod, OpenRouter-compatible chat completions, Vitest, Angular/Jasmine, Docker Compose, GitHub Actions.

**Spec:** docs/superpowers/specs/2026-09-13-category-translations-design.md

## Global Constraints

- Keep categories.name and all historic category references unchanged.
- Persist name_es, name_en, and source values system, automatic, or manual for every category type.
- Send only name, optional parent name, and root/subcategory role to OpenRouter.
- Provider failure cannot reject a category create, block startup, or make production unavailable.
- Backfill skips complete/manual translations, uses bounded concurrency, and logs translated/skipped/failed counts.
- Update Swagger, Postman, database docs, operations docs, and release QA with the API change.

---

### Task 1: Persist localized category metadata

**Files:**
- Create: database/migrations/038_category_localized_names.sql
- Modify: backend/src/domain/categories/types.ts
- Modify: backend/src/domain/finance/types.ts
- Modify: backend/src/application/ports/category.repository.ts
- Modify: backend/src/infrastructure/repositories/postgres.ts
- Modify: backend/src/infrastructure/repositories/in-memory.ts
- Test: backend/src/infrastructure/repositories/in-memory.test.ts

**Interfaces:**
- Category gains nameEs?: string, nameEn?: string, and translationSource?: 'system' | 'automatic' | 'manual'.
- CategoryRepository gains updateTranslations(input) and listMissingTranslations(limit).

- [ ] **Step 1: Write a failing repository test**

~~~ts
it('keeps manual translations when an automatic retry runs', async () => {
  const category = await categories.create({ tenantId: 'tenant-1', financialAccountId: 'account-1', name: 'Dance', isDefault: false });
  await categories.updateTranslations({ categoryId: category.id, nameEs: 'Danza', nameEn: 'Dance', translationSource: 'manual' });
  await categories.updateTranslations({ categoryId: category.id, nameEs: 'Baile', nameEn: 'Dance', translationSource: 'automatic' });
  expect((await categories.listByTenant('tenant-1', 'account-1'))[0]).toMatchObject({ nameEs: 'Danza', translationSource: 'manual' });
});
~~~

- [ ] **Step 2: Verify red**

Run: pnpm --filter @expenses-tracker/backend test -- src/infrastructure/repositories/in-memory.test.ts
Expected: FAIL because the new repository methods and fields do not exist.

- [ ] **Step 3: Implement schema and mapping**

~~~sql
alter table categories add column if not exists name_es text;
alter table categories add column if not exists name_en text;
alter table categories add column if not exists translation_source text
  check (translation_source in ('system', 'automatic', 'manual'));
~~~

Populate canonical system roots and children with explicit name/name_es/name_en values and source system. Map fields in mapCategory; condition automatic updates on translation_source is distinct from manual.

- [ ] **Step 4: Verify persistence**

Run: pnpm --filter @expenses-tracker/backend test -- src/infrastructure/repositories/in-memory.test.ts
Expected: PASS.

Run: pnpm db:migrate
Expected: migration 038 applies once; a second invocation skips it.

- [ ] **Step 5: Commit**

~~~bash
git add database/migrations/038_category_localized_names.sql backend/src/domain/categories/types.ts backend/src/domain/finance/types.ts backend/src/application/ports/category.repository.ts backend/src/infrastructure/repositories/postgres.ts backend/src/infrastructure/repositories/in-memory.ts backend/src/infrastructure/repositories/in-memory.test.ts
git commit -m "feat: persist category translations"
~~~

### Task 2: Add a safe OpenRouter category translator

**Files:**
- Create: backend/src/application/ports/category-translator.port.ts
- Create: backend/src/application/services/category-translation.service.ts
- Create: backend/src/infrastructure/category-translator.provider.ts
- Create: backend/src/infrastructure/category-translator.provider.test.ts
- Modify: backend/src/application/ports/index.ts
- Modify: backend/src/infrastructure/container.ts

**Interfaces:**
- CategoryTranslatorPort.translate(input) returns Promise<{ nameEs: string; nameEn: string } | undefined>.
- CategoryTranslationService.localize(category, parentName?) persists only missing, non-manual labels.

- [ ] **Step 1: Write failing provider tests**

~~~ts
it('sends only category context and returns both labels', async () => {
  const result = await translator.translate({ name: 'Dance', parentName: 'Education', role: 'subcategory' });
  expect(result).toEqual({ nameEs: 'Baile', nameEn: 'Dance' });
  expect(fetch).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ body: expect.not.stringContaining('tenantId') }));
});

it('returns undefined when OpenRouter is unavailable', async () => {
  expect(await translator.translate({ name: 'Investments', role: 'root' })).toBeUndefined();
});
~~~

- [ ] **Step 2: Verify red**

Run: pnpm --filter @expenses-tracker/backend test -- src/infrastructure/category-translator.provider.test.ts
Expected: FAIL because the translator module is absent.

- [ ] **Step 3: Implement port, strict parser, adapter, and service**

~~~ts
export interface CategoryTranslationInput {
  name: string;
  parentName?: string;
  role: 'root' | 'subcategory';
}

export interface CategoryTranslatorPort {
  translate(input: CategoryTranslationInput): Promise<{ nameEs: string; nameEn: string } | undefined>;
}
~~~

Reuse MESSAGE_INTERPRETER configuration and headers. Validate strict JSON { "es": string, "en": string }, preserve brands/acronyms, reject blank or overlong output, and log failures without throwing. Supply a no-op translator when the provider is deterministic or has no key.

- [ ] **Step 4: Verify green**

Run: pnpm --filter @expenses-tracker/backend test -- src/infrastructure/category-translator.provider.test.ts
Expected: PASS.

- [ ] **Step 5: Commit**

~~~bash
git add backend/src/application/ports/category-translator.port.ts backend/src/application/ports/index.ts backend/src/application/services/category-translation.service.ts backend/src/infrastructure/category-translator.provider.ts backend/src/infrastructure/category-translator.provider.test.ts backend/src/infrastructure/container.ts
git commit -m "feat: add category translation service"
~~~

### Task 3: Localize web and Telegram category creation

**Files:**
- Modify: backend/src/application/use-cases/finance.use-cases.ts
- Modify: backend/src/application/use-cases/process-inbound-finance-message.use-case.ts
- Modify: backend/src/infrastructure/container.ts
- Create: backend/src/application/finance.use-cases.category-translation.test.ts
- Modify: backend/src/application/process-inbound-finance-message.use-case.test.ts

**Interfaces:**
- FinanceUseCases.createCategory(input) returns a category with labels when available.
- Telegram category creation delegates to CategoryTranslationService after resolving the parent and account.

- [ ] **Step 1: Write failing non-blocking creation tests**

~~~ts
it('creates a category when translation fails', async () => {
  const created = await finance.createCategory({ tenantId, financialAccountId, name: 'Investments', isDefault: false });
  expect(created).toMatchObject({ name: 'Investments', nameEs: undefined, nameEn: undefined });
});

it('stores labels for a Telegram-created subcategory', async () => {
  await processInbound.process(messageForCategoryCreation('Dance', 'Education'));
  expect((await categories.listByTenant(tenantId, financialAccountId)).find((item) => item.name === 'Dance')).toMatchObject({ nameEs: 'Baile', nameEn: 'Dance' });
});
~~~

- [ ] **Step 2: Verify red**

Run: pnpm --filter @expenses-tracker/backend test -- src/application/finance.use-cases.category-translation.test.ts src/application/process-inbound-finance-message.use-case.test.ts
Expected: FAIL because both paths currently call the repository directly.

- [ ] **Step 3: Implement one shared creation path**

~~~ts
const created = await this.categories.create(input);
const parent = input.parentId ? existingCategories.find((item) => item.id === input.parentId) : undefined;
return this.categoryTranslations.localize(created, parent?.name);
~~~

Keep HTTP 201 and Telegram draft completion successful when translation returns undefined; do not add tenant, account, user, movement, or budget data to translation input.

- [ ] **Step 4: Verify green**

Run: pnpm --filter @expenses-tracker/backend test -- src/application/finance.use-cases.category-translation.test.ts src/application/process-inbound-finance-message.use-case.test.ts
Expected: PASS.

- [ ] **Step 5: Commit**

~~~bash
git add backend/src/application/use-cases/finance.use-cases.ts backend/src/application/use-cases/process-inbound-finance-message.use-case.ts backend/src/infrastructure/container.ts backend/src/application/finance.use-cases.category-translation.test.ts backend/src/application/process-inbound-finance-message.use-case.test.ts
git commit -m "feat: localize created categories"
~~~

### Task 4: Recognize localized aliases in Telegram

**Files:**
- Modify: backend/src/application/message-interpreter.ts
- Modify: backend/src/infrastructure/message-interpreter.provider.ts
- Create: backend/src/application/message-interpreter.test.ts
- Modify: backend/src/application/process-inbound-finance-message.use-case.test.ts

**Interfaces:**
- categoryByInterpretedName and deterministic inference match name, nameEs, and nameEn, returning canonical names and ids.
- OpenRouter receives canonical names plus aliases, never internal ids or account/user metadata.

- [ ] **Step 1: Write a failing alias test**

~~~ts
it('resolves a Spanish alias to the canonical custom category', () => {
  const match = categoryByInterpretedName([{ id: 'dance', name: 'Dance', nameEs: 'Baile', nameEn: 'Dance', isDefault: false }], 'Baile');
  expect(match.category?.id).toBe('dance');
  expect(match.category?.name).toBe('Dance');
});
~~~

- [ ] **Step 2: Verify red**

Run: pnpm --filter @expenses-tracker/backend test -- src/application/message-interpreter.test.ts
Expected: FAIL because findCategory only matches name.

- [ ] **Step 3: Implement alias normalization and payload aliases**

~~~ts
function categoryAliases(category: Category) {
  return [category.name, category.nameEs, category.nameEn]
    .filter((value): value is string => Boolean(value))
    .map(normalizeName);
}
~~~

Deduplicate aliases and retain parent scoping so identical child labels remain unambiguous. Return canonical names to downstream movement logic.

- [ ] **Step 4: Verify green**

Run: pnpm --filter @expenses-tracker/backend test -- src/application/message-interpreter.test.ts src/application/process-inbound-finance-message.use-case.test.ts
Expected: PASS.

- [ ] **Step 5: Commit**

~~~bash
git add backend/src/application/message-interpreter.ts backend/src/infrastructure/message-interpreter.provider.ts backend/src/application/message-interpreter.test.ts backend/src/application/process-inbound-finance-message.use-case.test.ts
git commit -m "feat: recognize localized category aliases"
~~~

### Task 5: Backfill historical rows and retry safely after deployment

**Files:**
- Create: backend/src/infrastructure/db-backfill-category-translations.ts
- Create: backend/src/infrastructure/category-translation-backfill.test.ts
- Modify: backend/package.json
- Modify: .github/workflows/deploy-backend-docker.yml
- Modify: backend/README.md
- Modify: database/README.md
- Modify: docs/operations.md

**Interfaces:**
- Adds pnpm --filter @expenses-tracker/backend db:backfill:category-translations.
- Runner logs { translated, skipped, failed } and is repeatable.

- [ ] **Step 1: Write a failing idempotency test**

~~~ts
it('translates incomplete automatic rows and reports individual failures', async () => {
  const summary = await backfillCategoryTranslations({ categories, translator, batchSize: 25, concurrency: 3 });
  expect(summary).toEqual({ translated: 1, skipped: 1, failed: 1 });
});
~~~

- [ ] **Step 2: Verify red**

Run: pnpm --filter @expenses-tracker/backend test -- src/infrastructure/category-translation-backfill.test.ts
Expected: FAIL because the runner is absent.

- [ ] **Step 3: Implement bounded runner and deployment hook**

~~~ts
for (const category of await categories.listMissingTranslations(25)) {
  const result = await translator.translate(toTranslationInput(category, parentById));
  if (!result) { failed += 1; continue; }
  await categories.updateTranslations({ categoryId: category.id, ...result, translationSource: 'automatic' });
  translated += 1;
}
~~~

Use a three-worker promise pool and per-row errors. Run the command after docker compose up -d in Actions, log a warning if it exits non-zero, then retain the image and health checks. A provider outage leaves the API healthy and the next deploy retries pending rows.

- [ ] **Step 4: Verify green and idempotency**

Run: pnpm --filter @expenses-tracker/backend test -- src/infrastructure/category-translation-backfill.test.ts
Expected: PASS.

Run: pnpm --filter @expenses-tracker/backend db:backfill:category-translations
Expected: counts log; second run skips completed rows.

- [ ] **Step 5: Commit**

~~~bash
git add backend/src/infrastructure/db-backfill-category-translations.ts backend/src/infrastructure/category-translation-backfill.test.ts backend/package.json .github/workflows/deploy-backend-docker.yml backend/README.md database/README.md docs/operations.md
git commit -m "ci: backfill category translations after deploy"
~~~

### Task 6: Render persisted labels and bound dashboard recent expenses

**Files:**
- Modify: frontend/src/app/core/api.service.ts
- Modify: frontend/src/app/core/category-label.ts
- Modify: frontend/src/app/core/category-label.spec.ts
- Modify: frontend/src/app/features/dashboard.component.ts
- Modify: frontend/src/app/features/dashboard.component.spec.ts
- Modify: frontend/src/app/features/categories.component.ts
- Modify: frontend/src/app/features/expenses.component.ts
- Modify: frontend/src/app/features/budgets.component.ts

**Interfaces:**
- categoryDisplayName(language, category) selects nameEs/nameEn then name.
- Dashboard calls api.expenses({ from, to, limit: 5 }), not unbounded api.recentExpenses(5).

- [ ] **Step 1: Write failing frontend tests**

~~~ts
it('shows a persisted custom label in the active language', () => {
  const dance = { id: 'dance', name: 'Dance', nameEs: 'Baile', nameEn: 'Dance', isDefault: false };
  expect(categoryDisplayName('es', dance)).toBe('Baile');
  expect(categoryDisplayName('en', dance)).toBe('Dance');
});

it('limits recent expenses to September', () => {
  expect(recentExpenseFilters(rangeFromMonth('2026-09'))).toEqual({ from: '2026-09-01T00:00:00.000Z', to: '2026-09-30T23:59:59.999Z', limit: 5 });
});
~~~

- [ ] **Step 2: Verify red**

Run: pnpm --filter @expenses-tracker/frontend test -- --include='src/app/core/category-label.spec.ts'
Expected: FAIL because locale fields are ignored.

Run: pnpm --filter @expenses-tracker/frontend test -- --include='src/app/features/dashboard.component.spec.ts'
Expected: FAIL because the bounded request helper is absent.

- [ ] **Step 3: Implement locale-first rendering and bounded query**

~~~ts
export function categoryDisplayName(language: 'es' | 'en', category: Category) {
  return language === 'es' ? category.nameEs ?? category.name : category.nameEn ?? category.name;
}
~~~

Replace all category display call sites with this.i18n.language(). Make categoryPathLabel language-aware. Export recentExpenseFilters(range) beside rangeFromMonth and preserve /expenses/recent for existing global-recent flows.

- [ ] **Step 4: Verify frontend**

Run: pnpm --filter @expenses-tracker/frontend test
Expected: PASS.

Run: pnpm --filter @expenses-tracker/frontend build --configuration production
Expected: successful build; pre-existing warning budgets may remain warnings only.

- [ ] **Step 5: Commit**

~~~bash
git add frontend/src/app/core/api.service.ts frontend/src/app/core/category-label.ts frontend/src/app/core/category-label.spec.ts frontend/src/app/features/dashboard.component.ts frontend/src/app/features/dashboard.component.spec.ts frontend/src/app/features/categories.component.ts frontend/src/app/features/expenses.component.ts frontend/src/app/features/budgets.component.ts
git commit -m "feat: display persisted category translations"
~~~

### Task 7: Document contracts and complete release QA

**Files:**
- Modify: backend/src/interfaces/http/openapi.ts
- Create: backend/src/interfaces/http/openapi.test.ts
- Modify: docs/postman/expenses-tracker.postman_collection.json
- Modify: docs/product-features.md
- Modify: docs/roadmap.md
- Modify: docs/release-checklist.md
- Modify: docs/post-deploy-qa-template.md

**Interfaces:**
- Swagger documents nullable read-only nameEs, nameEn, and translationSource on category responses.

- [ ] **Step 1: Write failing OpenAPI contract assertion**

~~~ts
expect(openApi.components.schemas.Category.properties).toEqual(expect.objectContaining({
  nameEs: expect.any(Object),
  nameEn: expect.any(Object),
  translationSource: expect.any(Object)
}));
~~~

- [ ] **Step 2: Verify red**

Run: pnpm --filter @expenses-tracker/backend test -- src/interfaces/http/openapi.test.ts
Expected: FAIL because the category schema lacks localized metadata.

- [ ] **Step 3: Update API and living documentation**

Document migration/backfill commands, privacy boundary, idempotency, non-fatal provider behavior, September regression, and bilingual Telegram alias smoke test. Add localized response fields to the Postman example.

- [ ] **Step 4: Run release verification on dev**

Run: pnpm --filter @expenses-tracker/backend test && pnpm --filter @expenses-tracker/backend build
Expected: PASS.

Run: pnpm --filter @expenses-tracker/frontend test && pnpm --filter @expenses-tracker/frontend build --configuration production
Expected: PASS.

Run: pnpm db:migrate && pnpm --filter @expenses-tracker/backend db:backfill:category-translations
Expected: idempotent migration/backfill logs.

- [ ] **Step 5: Complete visual and production-style QA**

Check Spanish and English labels across categories, expense create/edit, budgets, dashboard charts, and recent rows on desktop/mobile. Confirm September excludes October+ installments, Telegram resolves Baile to canonical Dance, and an unavailable provider still creates a category with its original name.

- [ ] **Step 6: Commit documentation and evidence**

~~~bash
git add backend/src/interfaces/http/openapi.ts docs/postman/expenses-tracker.postman_collection.json docs/product-features.md docs/roadmap.md docs/release-checklist.md docs/post-deploy-qa-template.md
git commit -m "docs: document persisted category translations"
~~~
