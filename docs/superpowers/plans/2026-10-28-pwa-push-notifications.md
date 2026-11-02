# PWA y notificaciones Push Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hacer instalable la aplicación y notificar, sin bloquear la creación, cada gasto nuevo de una cuenta compartida a sus miembros activos.

**Architecture:** Angular registra un service worker de producción y un `PwaEngagementService` centraliza instalación, permiso y suscripción. El backend persiste suscripciones y entregas, encola el evento tras crear el gasto y un worker lo entrega mediante Web Push con idempotencia.

**Tech Stack:** Angular 19 service worker, Web Push/VAPID (`web-push`), Express, TypeScript, PostgreSQL, Zod, Jasmine/Karma.

**Spec:** `docs/superpowers/specs/2026-10-28-pwa-notifications-monthly-reports-design.md`

## Global Constraints

- Solicitar `Notification.requestPermission()` sólo desde el click explícito del usuario y sólo después de instalación o `standalone`.
- Enviar únicamente a miembros `active`, incluido el creador; no incluir secretos ni detalles extra en el payload Push.
- La respuesta `POST /expenses` continúa en `201` aunque la entrega falle.
- Validar 320 px, móvil y escritorio; objetivos táctiles de 44 px, foco visible, i18n y `prefers-reduced-motion`.
- No registrar endpoints ni claves de suscripción completos.

---

### Task 1: Base PWA y contrato de suscripción

**Files:**
- Modify: `frontend/package.json`, `frontend/angular.json`, `frontend/src/app/app.config.ts`, `frontend/src/app/app.component.ts`
- Create: `frontend/src/manifest.webmanifest`, `frontend/src/ngsw-config.json`, `frontend/src/custom-sw.js`, `frontend/src/app/core/pwa-engagement.service.ts`, `frontend/src/app/core/pwa-engagement.service.spec.ts`
- Modify: `backend/src/application/ports/index.ts`, `backend/src/infrastructure/config.ts`, `backend/.env.example`

**Interfaces:** Produces `PwaEngagementService.registerSubscription(): Promise<void>` and backend config `webPushPublicKey`, `webPushPrivateKey`, `webPushSubject`.

- [ ] **Step 1: Write failing frontend tests**

```ts
it('does not request permission before the activate action', async () => {
  expect(Notification.requestPermission).not.toHaveBeenCalled();
  await service.activateNotifications();
  expect(Notification.requestPermission).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Run the focused test**

Run: `pnpm --filter @expenses-tracker/frontend test -- --include='src/app/core/pwa-engagement.service.spec.ts'`

Expected: FAIL because the service does not exist.

- [ ] **Step 3: Add the minimal PWA configuration and service**

```ts
provideServiceWorker('ngsw-worker.js', { enabled: !isDevMode(), registrationStrategy: 'registerWhenStable:30000' });
await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: vapidKey });
```

Add the manifest and icons through the Angular PWA schematic-equivalent configuration; make `custom-sw.js` import `ngsw-worker.js`, call `showNotification` on `push`, and route `notificationclick` to the relative URL carried in the payload.

- [ ] **Step 4: Run frontend tests and production build**

Run: `pnpm --filter @expenses-tracker/frontend test; pnpm --filter @expenses-tracker/frontend build`

Expected: PASS and generated production assets include `manifest.webmanifest` and `ngsw.json`.

- [ ] **Step 5: Commit**

```bash
git add frontend backend/.env.example
git commit -m "feat: add pwa subscription foundation"
```

### Task 2: Persist, authorize and manage subscriptions

**Files:**
- Create: `database/migrations/039_push_subscriptions.sql`, `backend/src/application/ports/push-subscription.repository.ts`, `backend/src/application/use-cases/push-subscriptions.use-case.ts`
- Modify: `backend/src/application/ports/index.ts`, `backend/src/infrastructure/repositories/postgres.ts`, `backend/src/infrastructure/repositories/in-memory.ts`, `backend/src/infrastructure/container.ts`, `backend/src/interfaces/http/schemas.ts`, `backend/src/interfaces/http/controllers/profile.controller.ts`, `backend/src/interfaces/http/routes/profile.routes.ts`
- Test: matching `*.test.ts` files

**Interfaces:** `PushSubscriptionRepository.upsert({userId, endpoint, p256dh, auth}): Promise<void>`; `POST /push-subscriptions`; `DELETE /push-subscriptions/:id`.

- [ ] **Step 1: Write failing repository and HTTP authorization tests**

```ts
it('upserts the same endpoint only for the authenticated user', async () => {
  await request(app).post('/push-subscriptions').set(authA).send(subscription).expect(204);
  await request(app).delete('/push-subscriptions/other-user-id').set(authA).expect(404);
});
```

- [ ] **Step 2: Run focused backend tests**

Run: `pnpm --filter @expenses-tracker/backend test -- push-subscriptions`

Expected: FAIL because routes and repository are absent.

- [ ] **Step 3: Implement migration, repository and routes**

```sql
create unique index push_subscriptions_endpoint_unique on push_subscriptions(endpoint);
```

Validate the standard `endpoint`, `keys.p256dh` and `keys.auth` shape with Zod; bind `user_id` only from `AuthenticatedRequest`, never from the body.

- [ ] **Step 4: Run backend tests and build**

Run: `pnpm --filter @expenses-tracker/backend test; pnpm --filter @expenses-tracker/backend build`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend database/migrations/039_push_subscriptions.sql
git commit -m "feat: persist authenticated push subscriptions"
```

### Task 3: Async shared-expense delivery worker

**Files:**
- Create: `database/migrations/040_notification_deliveries.sql`, `backend/src/application/ports/push.provider.ts`, `backend/src/application/ports/notification-delivery.repository.ts`, `backend/src/application/use-cases/send-expense-notifications.use-case.ts`, `backend/src/infrastructure/push-providers/web-push.provider.ts`, `backend/src/infrastructure/send-expense-notifications.ts`
- Modify: `backend/src/application/use-cases/finance.use-cases.ts`, `backend/src/infrastructure/container.ts`, `backend/src/infrastructure/repositories/{postgres,in-memory}.ts`, `backend/package.json`, `backend/compose.production.yaml`, `docs/operations.md`
- Test: `backend/src/application/use-cases/send-expense-notifications.use-case.test.ts`

**Interfaces:** `SendExpenseNotificationsUseCase.execute(limit: number): Promise<{sent:number;failed:number}>`; delivery identity `(expense_id, subscription_id, channel)`.

- [ ] **Step 1: Write failing use-case tests**

```ts
it('queues only active members of a shared account and does not throw on provider failure', async () => {
  const expense = await finance.createExpense(sharedExpense);
  await expect(worker.execute(10)).resolves.toEqual({ sent: 1, failed: 1 });
  expect(expense.id).toBeDefined();
});
```

- [ ] **Step 2: Run the focused test**

Run: `pnpm --filter @expenses-tracker/backend test -- send-expense-notifications`

Expected: FAIL because no worker exists.

- [ ] **Step 3: Implement outbox delivery**

```ts
if (account.type !== 'shared') return;
await deliveries.reserve({ expenseId: expense.id, subscriptionId, channel: 'push' });
await push.send(subscription, { title, body, url: `/expenses/${expense.id}` });
```

Call an outbox repository after `expenses.create`; the command worker claims pending rows, formats localized payloads, marks 404/410 endpoints inactive, and retries only transient failures. Start it as a `restart: unless-stopped` production service.

- [ ] **Step 4: Verify behavior and deployment configuration**

Run: `pnpm --filter @expenses-tracker/backend test; pnpm --filter @expenses-tracker/backend build; docker compose -f backend/compose.production.yaml config`

Expected: PASS and an expense-notification worker service exists.

- [ ] **Step 5: Commit**

```bash
git add backend database docs
git commit -m "feat: notify shared account expense members"
```

### Task 4: Install/permission UX and end-to-end quality

**Files:**
- Create: `frontend/src/app/shared/pwa-engagement-banner.component.ts`, `.spec.ts`
- Modify: `frontend/src/app/app.component.ts`, `frontend/src/app/features/settings.component.ts`, i18n catalog files, `frontend/src/app/core/api.service.ts`
- Test: component tests and `frontend/e2e/pwa-notifications.spec.ts`

- [ ] **Step 1: Write failing banner state tests**

```ts
it('shows install before notifications and remembers “Ahora no”', () => {
  expect(screen.getByText('Agregar al inicio')).toBeTruthy();
  fireEvent.click(screen.getByText('Ahora no'));
  expect(localStorage.getItem('pwa-install-banner-dismissed')).toBeTruthy();
});
```

- [ ] **Step 2: Implement accessible banners and Settings reactivation**

```html
<button type="button" (click)="activateNotifications()">{{ t('notifications_activate') }}</button>
```

Use `beforeinstallprompt` where available, Safari instructions otherwise, a 44 px action target, `aria-live="polite"`, visible focus, and opacity-only reduced-motion behavior.

- [ ] **Step 3: Verify mobile, desktop and e2e states**

Run: `pnpm --filter @expenses-tracker/frontend test; pnpm --filter @expenses-tracker/frontend test:e2e; pnpm --filter @expenses-tracker/frontend build`

Expected: PASS; no banner or Push errors in unsupported browsers.

- [ ] **Step 4: Run UI detector and commit**

Run: `C:\Users\salas\.agents\skills\impeccable\scripts\impeccable.cmd detect --json frontend/src/app/app.component.ts frontend/src/app/shared/pwa-engagement-banner.component.ts`

```bash
git add frontend docs
git commit -m "feat: guide pwa install and notification permission"
```
