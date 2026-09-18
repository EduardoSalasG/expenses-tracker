# Atomic Financial Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Crear primitives financieros y priorizar salud y acciones del período antes de los gráficos.

**Architecture:** Tokens semánticos se agregan sobre las variables de marca. Componentes standalone presentan datos ya cargados; dashboard deriva prioridades puramente y URL state controla filtros y settings.

**Tech Stack:** Angular standalone/signals, Angular Router, Material, Tailwind, Chart.js, Jasmine/Karma.

**Spec:** `docs/superpowers/specs/2026-09-17-atomic-design-system-dashboard-design.md`; `openspec/changes/atomic-design-system-dashboard/`

## Global Constraints

- No cambiar backend, cálculos, permisos, persistencia o migraciones.
- No añadir dependencias ni sustituir Angular Material o Chart.js.
- Usar claves ES/EN, foco visible, teclado, 44 px y `prefers-reduced-motion`.
- Componentes compartidos no realizan consultas; páginas conservan propiedad de datos.

### Task 1: Primitivas semánticas reutilizables

**Files:**
- Modify: `frontend/src/styles.css:8-75`
- Create: `frontend/src/app/shared/components/financial-metric.component.ts`
- Create: `frontend/src/app/shared/components/action-priority.component.ts`
- Create: `frontend/src/app/shared/components/disclosure-panel.component.ts`
- Create: `frontend/src/app/shared/components/financial-primitives.component.spec.ts`

**Interfaces:** `FinancialMetricComponent` recibe `label`, `value`, `context`, `tone`; `ActionPriorityComponent` recibe `title`, `description`, `tone`, `link`, `queryParams`; `DisclosurePanelComponent` recibe `label`, `open` y proyecta contenido.

- [ ] **Step 1: Escribir las pruebas rojas de metric, priority y disclosure**

```ts
expect(fixture.nativeElement.textContent).toContain('$12.000');
expect(fixture.nativeElement.querySelector('a').getAttribute('href')).toContain('/budgets');
```

- [ ] **Step 2: Ejecutar la prueba roja**

Run: `pnpm --filter @expenses-tracker/frontend exec ng test --watch=false --browsers=ChromeHeadless --include=src/app/shared/components/financial-primitives.component.spec.ts`

Expected: falla porque los componentes todavía no existen.

- [ ] **Step 3: Implementar tokens y los tres standalone components**

```css
:root { --surface-raised: var(--brand-surface); --content-primary: var(--brand-ink); --focus-ring: color-mix(in srgb, var(--brand-blue) 45%, transparent); }
```

```ts
readonly label = input.required<string>();
readonly value = input.required<string>();
readonly tone = input<'neutral' | 'positive' | 'warning' | 'danger'>('neutral');
```

- [ ] **Step 4: Ejecutar verde y commit**

Run: `pnpm --filter @expenses-tracker/frontend exec ng test --watch=false --browsers=ChromeHeadless --include=src/app/shared/components/financial-primitives.component.spec.ts`

Expected: PASS; commit `feat: add financial design primitives`.

### Task 2: Salud y prioridades del dashboard

**Files:**
- Create: `frontend/src/app/features/dashboard-priority.ts`
- Modify: `frontend/src/app/features/dashboard.component.ts`
- Modify: `frontend/src/app/features/dashboard.component.spec.ts`
- Modify: `frontend/src/app/core/i18n.service.ts`

**Interfaces:** `deriveDashboardPriorities(input): DashboardPriority[]` devuelve `id`, `tone`, `titleKey`, `descriptionKey`, `route`, `queryParams` desde budgets, installments y balances cargados.

- [ ] **Step 1: Escribir pruebas rojas de derivación pura**

```ts
expect(deriveDashboardPriorities({ budgets: [{ label: 'Comida', progress: 108 }], installments: [], balances: [] }))
  .toContain(jasmine.objectContaining({ tone: 'danger', route: '/budgets' }));
expect(deriveDashboardPriorities({ budgets: [], installments: [], balances: [] })).toEqual([]);
```

- [ ] **Step 2: Ejecutar la prueba roja del dashboard**

Run: `pnpm --filter @expenses-tracker/frontend exec ng test --watch=false --browsers=ChromeHeadless --include=src/app/features/dashboard.component.spec.ts`

Expected: falla porque el helper no existe.

- [ ] **Step 3: Implementar helper y composición**

```ts
return input.budgets.filter((budget) => budget.progress >= 100).map((budget) => ({
  id: `budget-${budget.label}`, tone: 'danger' as const,
  titleKey: 'dashboard_priority_budget_title', descriptionKey: 'dashboard_priority_budget_description',
  route: '/budgets', queryParams: {}
}));
```

Renderizar métricas y prioridades tras controles de período, antes de actividad/gráficos. Mantener canvas y `app-chart-data-table` sin cambios.

- [ ] **Step 4: Ejecutar verde y commit**

Run: `pnpm --filter @expenses-tracker/frontend exec ng test --watch=false --browsers=ChromeHeadless --include=src/app/features/dashboard.component.spec.ts`

Expected: PASS; commit `feat: prioritize financial dashboard actions`.

### Task 3: Filtros y settings progresivos con URL segura

**Files:**
- Modify: `frontend/src/app/features/expenses.component.ts`
- Create: `frontend/src/app/features/expenses.component.spec.ts`
- Modify: `frontend/src/app/features/settings.component.ts`
- Modify: `frontend/src/app/features/settings.component.spec.ts`
- Modify: `frontend/src/app/features/categories.component.ts`
- Modify: `frontend/src/app/features/categories.component.spec.ts`
- Modify: `frontend/src/app/core/i18n.service.ts`

**Interfaces:** `parseExpenseFilterParams(params): ExpenseFilters`; `serializeExpenseFilters(filters): Params`; `parseSettingsSection(value): SettingsSection | null`.

- [ ] **Step 1: Escribir pruebas rojas de URL válida e inválida**

```ts
expect(parseExpenseFilterParams({ month: '2026-09', categoryId: 'food' })).toEqual(jasmine.objectContaining({ month: '2026-09' }));
expect(parseExpenseFilterParams({ month: 'bad', currency: '<script>' })).toEqual({});
expect(parseSettingsSection('catalogs')).toBe('catalogs');
expect(parseSettingsSection('delete-all')).toBeNull();
```

- [ ] **Step 2: Ejecutar las pruebas rojas afectadas**

Run: `pnpm --filter @expenses-tracker/frontend exec ng test --watch=false --browsers=ChromeHeadless --include=src/app/features/expenses.component.spec.ts --include=src/app/features/settings.component.spec.ts --include=src/app/features/categories.component.spec.ts`

Expected: falla porque parser, sincronización y disclosure no existen.

- [ ] **Step 3: Implementar disclosure, query validation y foco lógico**

```ts
readonly secondaryFiltersOpen = signal(false);
const section = parseSettingsSection(this.route.snapshot.queryParamMap.get('section'));
if (section) this.openSettingsSection(section);
```

Conservar mes como filtro esencial, filtros aplicados visibles y `openSettingsSection` como fuente única. Mover foco de título sólo tras navegación directa; reutilizar disclosure en categorías sin tocar CRUD.

- [ ] **Step 4: Ejecutar verde y commit**

Run: `pnpm --filter @expenses-tracker/frontend exec ng test --watch=false --browsers=ChromeHeadless --include=src/app/features/expenses.component.spec.ts --include=src/app/features/settings.component.spec.ts --include=src/app/features/categories.component.spec.ts`

Expected: PASS; commit `feat: add progressive finance navigation`.

### Task 4: QA y cierre del cambio

**Files:**
- Modify: `docs/mobile-accessibility-qa.md`
- Modify: `openspec/changes/atomic-design-system-dashboard/tasks.md`

- [ ] **Step 1: Añadir matriz QA antes de la revisión manual**

```md
| Surface | 320 px | Keyboard/focus | Reduced motion | Empty/error |
| Dashboard | health/actions stack | priority link | no decorative motion | no movements |
| Expenses | filters stack | disclosure | no slide animation | no matches |
| Settings | deep link | heading focus | no nonessential transition | invalid section |
```

- [ ] **Step 2: Ejecutar pruebas afectadas y build**

Run: `pnpm --filter @expenses-tracker/frontend exec ng test --watch=false --browsers=ChromeHeadless --include=src/app/features/dashboard.component.spec.ts --include=src/app/features/expenses.component.spec.ts --include=src/app/features/settings.component.spec.ts --include=src/app/features/categories.component.spec.ts && pnpm --filter @expenses-tracker/frontend build`

Expected: todas PASS y build exit 0.

- [ ] **Step 3: Ejecutar QA visual y checks finales**

Revisar 320 px, móvil y escritorio; documentar evidencia. Ejecutar `impeccable.cmd detect --json` contra CSS, shared y cuatro features, y `openspec validate atomic-design-system-dashboard --strict`.

- [ ] **Step 4: Commit de evidencia**

Expected: tareas marcadas sólo tras evidencia; commit `docs: verify atomic financial dashboard`.
