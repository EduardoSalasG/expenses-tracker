# Native Winston Observability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Emit safe, structured Winston logs for backend lifecycle and HTTP requests while correlating every Angular API request with `X-Request-ID`.

**Architecture:** The backend configuration supplies a validated log level to one Winston adapter enriched with service, environment and release version. Two Express middlewares establish a request UUID and record exactly one completion event, while the existing error middleware records the correlated safe failure event. Angular adds only a correlation interceptor; it does not send browser telemetry.

**Tech Stack:** TypeScript, Express 4, Winston 3, Zod, Vitest, Supertest, Angular HttpClient and RxJS.

**Spec:** `docs/superpowers/specs/2026-10-04-native-winston-observability-design.md`

## Global Constraints

- Logs MUST be JSON to `stdout` and must not use external services, agents, storage, dashboards or telemetry SDKs.
- `LOG_LEVEL` accepts exactly `error`, `warn`, `info` and `debug`; defaults are `info` for production and `debug` elsewhere.
- Logs MUST NOT contain bodies, query strings, authorization headers, JWTs, refresh tokens, OTPs, webhook secrets, emails, phone numbers or database URLs.
- `X-Request-ID` MUST be a UUID; invalid or absent values are replaced server-side and returned to the client.
- HTTP completion events use method, normalized Express route, status and duration; the frontend only propagates IDs.

---

### Task 1: Configurable structured Winston adapter

**Files:**
- Modify: `backend/src/infrastructure/config.ts`
- Modify: `backend/src/infrastructure/logger.ts`
- Modify: `backend/src/infrastructure/container.ts`
- Modify: `backend/src/infrastructure/config.test.ts`
- Create: `backend/src/infrastructure/logger.test.ts`

**Interfaces:**
- Produces: `AppConfig.logLevel: 'error' | 'warn' | 'info' | 'debug'`.
- Produces: `createLogger(options: { nodeEnv: string; logLevel: AppConfig['logLevel']; version: string }): AppLogger`.
- Consumes: root `package.json` version through the existing generated/constant pattern selected during implementation; no runtime manifest read in the browser.

- [ ] **Step 1: Write failing configuration tests**

```ts
it('uses info by default in production and debug in development', async () => {
  vi.stubEnv('NODE_ENV', 'production');
  expect(loadConfig().logLevel).toBe('info');
  vi.stubEnv('NODE_ENV', 'development');
  expect(loadConfig().logLevel).toBe('debug');
});

it('rejects an unsupported LOG_LEVEL', async () => {
  vi.stubEnv('LOG_LEVEL', 'verbose');
  expect(() => loadConfig()).toThrow();
});
```

- [ ] **Step 2: Run `pnpm --filter @expenses-tracker/backend test -- config.test.ts` and verify it fails because `logLevel` is absent.**

- [ ] **Step 3: Add `LOG_LEVEL` Zod validation and expose `logLevel` from `loadConfig`.**

```ts
LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).optional(),
// after parse
logLevel: env.LOG_LEVEL ?? (env.NODE_ENV === 'production' ? 'info' : 'debug'),
```

- [ ] **Step 4: Write failing logger tests for base metadata and production stack omission.**

```ts
expect(info).toMatchObject({ service: 'expenses-tracker-api', environment: 'production', version: '0.3.4' });
expect(JSON.stringify(info)).not.toContain('Error: private stack');
```

- [ ] **Step 5: Make `createLogger` accept typed options, add default metadata and a Console transport with JSON formatting; pass config/version from the container.**

- [ ] **Step 6: Run `pnpm --filter @expenses-tracker/backend test -- config.test.ts logger.test.ts` and verify all tests pass.**

- [ ] **Step 7: Commit `feat(observability): configure structured Winston logs`.**

### Task 2: Correlation and HTTP completion middleware

**Files:**
- Create: `backend/src/interfaces/http/middleware/observability.middleware.ts`
- Create: `backend/src/interfaces/http/middleware/observability.middleware.test.ts`
- Modify: `backend/src/interfaces/http/app.ts`
- Modify: `backend/src/interfaces/http/middleware/error.middleware.ts`
- Modify: `backend/src/interfaces/http/middleware.test.ts`
- Modify: `backend/src/interfaces/http/app.test.ts`

**Interfaces:**
- Produces: `requestCorrelationMiddleware()` and `httpRequestLoggingMiddleware(logger)`.
- Produces: `Request` augmentation carrying `id: string` and monotonic start time.
- Consumes: `AppLogger` from the container and existing `errorMiddleware` error sanitization.

- [ ] **Step 1: Write failing Supertest cases for a supplied UUID, missing ID and invalid ID.**

```ts
const supplied = '018f3175-0d83-7c25-b1a1-4ee2e45ad65f';
const response = await request(app).get('/health').set('X-Request-ID', supplied);
expect(response.headers['x-request-id']).toBe(supplied);

const invalid = await request(app).get('/health').set('X-Request-ID', 'email@example.com');
expect(invalid.headers['x-request-id']).toMatch(uuidPattern);
expect(invalid.headers['x-request-id']).not.toBe('email@example.com');
```

- [ ] **Step 2: Run `pnpm --filter @expenses-tracker/backend test -- app.test.ts observability.middleware.test.ts` and verify the correlation assertions fail.**

- [ ] **Step 3: Implement UUID validation, server fallback and response header before routes.**

```ts
const candidate = request.header('x-request-id')?.trim();
const requestId = candidate && isUuid(candidate) ? candidate : randomUUID();
request.id = requestId;
response.setHeader('X-Request-ID', requestId);
next();
```

- [ ] **Step 4: Write failing logger-spy tests for one `http_request_completed` event.**

```ts
expect(logger.info).toHaveBeenCalledWith('http_request_completed', expect.objectContaining({
  requestId: supplied, method: 'GET', route: '/health', statusCode: 200, durationMs: expect.any(Number)
}));
```

- [ ] **Step 5: Implement the finish listener with `process.hrtime.bigint()` and normalized route selection.**

```ts
response.once('finish', () => logger.info('http_request_completed', {
  requestId: request.id, method: request.method,
  route: request.route?.path ?? 'unmatched', statusCode: response.statusCode,
  durationMs: Number(process.hrtime.bigint() - startedAt) / 1_000_000
}));
```

- [ ] **Step 6: Adapt `errorMiddleware` to emit `http_request_failed` with the existing allow-listed metadata and the established ID; add a test proving an error with authorization, body and query data is absent from serialized metadata.**

- [ ] **Step 7: Run `pnpm --filter @expenses-tracker/backend test -- middleware.test.ts app.test.ts observability.middleware.test.ts` and verify status/error contracts remain green.**

- [ ] **Step 8: Commit `feat(observability): correlate and log HTTP requests`.**

### Task 3: Lifecycle events and frontend request propagation

**Files:**
- Modify: `backend/src/main.ts`
- Modify: `backend/src/infrastructure/inbound-event-worker-daemon.ts`
- Modify: `backend/src/infrastructure/inbound-event-worker-daemon.test.ts`
- Create: `frontend/src/app/core/request-correlation.interceptor.ts`
- Create: `frontend/src/app/core/request-correlation.interceptor.spec.ts`
- Modify: `frontend/src/app/app.config.ts`

**Interfaces:**
- Produces: stable lifecycle event names `api_started`, `api_shutdown_requested`, `api_stopped`, `inbound_worker_started`, `inbound_worker_stopped`.
- Produces: `requestCorrelationInterceptor: HttpInterceptorFn` that adds `X-Request-ID` only.
- Consumes: existing `authInterceptor`, registered after correlation so its header clone preserves `X-Request-ID`.

- [ ] **Step 1: Write failing worker/main-focused tests asserting lifecycle event names and safe metadata (`port`, `signal`, worker settings without secrets).**

```ts
expect(info).toHaveBeenCalledWith('inbound_worker_started', expect.objectContaining({ pollIntervalMs: expect.any(Number) }));
expect(info).toHaveBeenCalledWith('inbound_worker_stopped');
```

- [ ] **Step 2: Run the focused backend tests and verify event-name expectations fail.**

- [ ] **Step 3: Replace free-form lifecycle messages with stable event names and safe fields without changing shutdown/worker behavior.**

- [ ] **Step 4: Write a failing Angular interceptor test that passes existing authorization and account headers through the correlation interceptor on two separate requests.**

```ts
expect(request.request.headers.get('X-Request-ID')).toMatch(uuidPattern);
expect(request.request.headers.get('Authorization')).toBe('Bearer access-token');
expect(request.request.headers.get('X-Financial-Account-Id')).toBe('account-id');
expect(second.request.headers.get('X-Request-ID')).not.toBe(firstId);
```

- [ ] **Step 5: Implement the interceptor with `crypto.randomUUID()` and register it before `authInterceptor`; it must not add error handling or telemetry transport.**

- [ ] **Step 6: Run focused backend and frontend tests, then `pnpm --filter @expenses-tracker/frontend test`; verify all pass.**

- [ ] **Step 7: Commit `feat(observability): propagate request correlation`.**

### Task 4: Operational documentation and full verification

**Files:**
- Modify: `backend/README.md`
- Modify: `docs/architecture.md`
- Modify: `openspec/changes/native-winston-observability/tasks.md`

**Interfaces:**
- Consumes: final event names, `LOG_LEVEL` contract and response header behavior from Tasks 1-3.
- Produces: an operational section with field table and safe command examples.

- [ ] **Step 1: Document `LOG_LEVEL`, its allowed values/defaults, JSON event fields and a `requestId` lookup example that does not contain user data.**

```text
docker logs expenses-tracker-backend | jq 'select(.requestId == "<uuid>")'
```

- [ ] **Step 2: Update architecture documentation to identify stdout Winston logs and frontend-only correlation propagation; state that no external telemetry is used.**

- [ ] **Step 3: Run `openspec validate native-winston-observability --strict`, `pnpm --filter @expenses-tracker/backend test`, `pnpm --filter @expenses-tracker/frontend test`, and `pnpm run build`; record the commands/results by checking off the matching OpenSpec tasks.**

- [ ] **Step 4: Commit `docs: document native observability operations`.**

## Plan Self-Review

- Spec coverage: Tasks 1-3 implement structured logs, validated correlation, safe HTTP completion/error events, lifecycle events and frontend propagation; Task 4 documents and validates the contract.
- Placeholder scan: no TBD/TODO or deferred implementation instructions remain.
- Type consistency: `AppConfig.logLevel`, `AppLogger`, `requestCorrelationMiddleware`, `httpRequestLoggingMiddleware`, and `requestCorrelationInterceptor` are named consistently across dependent tasks.
