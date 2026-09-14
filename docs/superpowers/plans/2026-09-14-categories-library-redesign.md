# Categories Library Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Categories screen a searchable, activity-aware hierarchy with one safe creation flow.

**Architecture:** `CategoriesComponent` owns account-scoped loading, filtering and persistence. `CategoryCreateDialogComponent` owns the short-lived choice between a main category and a subcategory. Monthly totals come from the existing report endpoint and are aggregated only for display.

**Tech Stack:** Angular 19 standalone components, Angular Material, reactive forms, signals, RxJS, Jasmine/Karma, Tailwind utility classes.

**Spec:** `docs/superpowers/specs/2026-09-14-categories-library-design.md`

## Global Constraints

- Work on branch `dev`; do not modify backend contracts, migrations, Swagger, or dependencies.
- Preserve account scoping, current create-response reconciliation, and Spanish/English localization.
- Do not aggregate distinct currencies into one monetary value.
- Provide keyboard-accessible controls and a reduced-motion fallback.
- Every production behavior begins with a test observed failing first.

---

### Task 1: Category library state and tree

**Files:**
- Modify: `frontend/src/app/features/categories.component.ts`
- Modify: `frontend/src/app/features/categories.component.spec.ts`
- Modify: `frontend/src/app/core/i18n.service.ts`

**Interfaces:**
- Consumes: `ApiService.categories()` and `ApiService.periodExpenseCategoryTotals(from, to)`.
- Produces: `visibleRootCategories()`, `activityLabel(rootCategoryId)`, `setLibraryFilter(filter)` and `setSearchTerm(event)` in `CategoriesComponent`.

- [ ] **Step 1: Write the failing tests**

```typescript
it('keeps a parent visible when the search matches one of its subcategories', () => {
  component.searchTerm.set('delivery');
  expect(component.visibleRootCategories()).toEqual([food]);
});

it('shows only custom roots when the custom library filter is selected', () => {
  component.setLibraryFilter('custom');
  expect(component.visibleRootCategories()).toEqual([leisure]);
});

it('includes subcategory spending in the parent activity without combining currencies', () => {
  expect(component.activityLabel(food.id)).toBe('$12.000 | US$20.00');
});
```

- [ ] **Step 2: Verify RED**

Run: `pnpm --filter @expenses-tracker/frontend test -- --include='src/app/features/categories.component.spec.ts' --watch=false`

Expected: FAIL because the library API is absent.

- [ ] **Step 3: Implement the minimal library behavior**

```typescript
readonly searchTerm = signal('');
readonly libraryFilter = signal<'all' | 'default' | 'custom'>('all');
readonly visibleRootCategories = computed(() => this.rootCategories().filter((category) => this.matchesLibrary(category)));

setLibraryFilter(filter: 'all' | 'default' | 'custom') {
  this.libraryFilter.set(filter);
}
```

Load the category list and current-month totals together. Filter normalized display names across each root and child. Aggregate totals by root using both `categoryId` and `subcategoryId`; format one entry per currency.

- [ ] **Step 4: Render the accessible tree**

Use a labelled search input, an `aria-pressed` filter group, and one Material expansion panel per visible root. Show type, child count, activity label, child rows and an empty-search state. Preserve existing loading, error and success banners.

- [ ] **Step 5: Add localization and verify GREEN**

Add Spanish and English keys for search, filters, monthly activity, no activity, no result and the new action label. Run the command from Step 2; expected result is PASS for the existing reconciliation test and the three new tests.

- [ ] **Step 6: Commit the reviewed task**

```bash
git add frontend/src/app/features/categories.component.ts frontend/src/app/features/categories.component.spec.ts frontend/src/app/core/i18n.service.ts
git commit -m "feat: make category library searchable"
```

### Task 2: Unified category creation dialog

**Files:**
- Create: `frontend/src/app/features/category-create-dialog.component.ts`
- Create: `frontend/src/app/features/category-create-dialog.component.spec.ts`
- Modify: `frontend/src/app/features/categories.component.ts`
- Modify: `frontend/src/app/features/categories.component.spec.ts`

**Interfaces:**
- Consumes: `{ categories: Category[]; parentId?: string }`.
- Produces: `{ name: string; parentId?: string }` through `MatDialogRef.close`.
- `CategoriesComponent.openCreateDialog(parentId?: string)` passes the result into its existing `createCategory` reconciliation path.

- [ ] **Step 1: Write the failing dialog tests**

```typescript
it('closes with a main-category payload when main type is selected', () => {
  component.form.setValue({ type: 'main', parentId: food.id, name: 'Health' });
  component.submit();
  expect(dialogRef.close).toHaveBeenCalledWith({ name: 'Health' });
});

it('requires and returns the parent for a subcategory', () => {
  component.form.setValue({ type: 'sub', parentId: food.id, name: 'Delivery' });
  component.submit();
  expect(dialogRef.close).toHaveBeenCalledWith({ name: 'Delivery', parentId: food.id });
});
```

- [ ] **Step 2: Verify RED**

Run: `pnpm --filter @expenses-tracker/frontend test -- --include='src/app/features/category-create-dialog.component.spec.ts' --watch=false`

Expected: FAIL with a module resolution error for `category-create-dialog.component`.

- [ ] **Step 3: Implement the standalone dialog**

```typescript
readonly form = this.fb.nonNullable.group({
  type: ['main' as 'main' | 'sub', Validators.required],
  parentId: [''],
  name: ['', Validators.required]
});

submit() {
  const { type, parentId, name } = this.form.getRawValue();
  if (type === 'sub' && !parentId) return;
  this.dialogRef.close({ name: name.trim(), parentId: type === 'sub' ? parentId : undefined });
}
```

Require parent only for a subcategory, preselect the supplied parent and use translated display names.

- [ ] **Step 4: Connect both creation entry points**

Add `Nueva categoría` to the page header and `Añadir subcategoría` to each expanded root. Await the dialog result and call the existing `createCategory` method.

- [ ] **Step 5: Verify GREEN and commit**

Run: `pnpm --filter @expenses-tracker/frontend test -- --include='src/app/features/category-create-dialog.component.spec.ts,src/app/features/categories.component.spec.ts' --watch=false`

Expected: PASS with dialog payload behavior, library behavior and creation reconciliation.

```bash
git add frontend/src/app/features/category-create-dialog.component.ts frontend/src/app/features/category-create-dialog.component.spec.ts frontend/src/app/features/categories.component.ts frontend/src/app/features/categories.component.spec.ts
git commit -m "feat: unify category creation"
```

### Task 3: Full verification and documentation

**Files:**
- Modify: `docs/superpowers/specs/2026-09-14-categories-library-design.md` only if implementation changes an approved decision.

- [ ] **Step 1: Run the full frontend test suite**

Run: `pnpm --filter @expenses-tracker/frontend test -- --watch=false`

Expected: PASS with no failures.

- [ ] **Step 2: Build the production frontend**

Run: `pnpm --filter @expenses-tracker/frontend build`

Expected: exit code 0.

- [ ] **Step 3: Perform functional QA**

Check desktop and mobile for tree search, three filters, main creation, subcategory creation, zero result, zero activity, loading/error, focus order and reduced-motion behavior.

- [ ] **Step 4: Run the Impeccable detector once after UI changes**

Run: `C:\\Users\\salas\\.codex\\plugins\\cache\\openai-curated-remote\\impeccable\\4.3.1\\skills\\impeccable\\scripts\\impeccable.cmd detect --json frontend/src/app/features/categories.component.ts frontend/src/app/features/category-create-dialog.component.ts`

Expected: resolve each actionable finding before final review.
