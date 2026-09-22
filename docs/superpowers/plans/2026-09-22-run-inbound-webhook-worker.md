# Worker persistente de webhooks inbound Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mantener el procesamiento durable de webhooks inbound activo en producción para que Telegram responda sin requerir un cron externo.

**Architecture:** Se extrae un ciclo cancelable y testeable que invoca al consumidor durable ya existente en tandas. Un entry point daemon utiliza ese ciclo; Compose lo ejecuta como servicio separado, pero con la misma imagen SHA y entorno de la API. El workflow recrea y verifica ambos contenedores de forma explícita.

**Tech Stack:** TypeScript ESM, Node.js 22, Vitest, Docker Compose, GitHub Actions, PostgreSQL existente.

**Spec:** `openspec/changes/run-inbound-webhook-worker/{proposal.md,design.md,specs/**/spec.md,tasks.md}`

## Global Constraints

- El consumidor SHALL procesar eventos fuera de la solicitud HTTP y MUST retomar los pendientes tras despliegue o reinicio.
- Se MUST conservar las políticas existentes de deduplicación, retry y dead-letter.
- API y worker MUST usar exactamente la imagen SHA esperada en producción y permanecer ejecutándose después del despliegue.
- Los logs MUST excluir secretos y cuerpos completos de webhook.
- No se añadirán dependencias, brokers, migraciones ni contratos HTTP nuevos.

## Review Focus

- `INBOUND_EVENT_BATCH_SIZE` vacío, cero, negativo, decimal o no numérico: el worker debe usar un valor válido y nunca reclamar una tanda inválida; se prueba en la tarea 1.
- `INBOUND_EVENT_POLL_INTERVAL_MS` inválido o demasiado bajo: debe acotarse para no crear un ciclo caliente; se prueba en la tarea 1.
- El cierre durante una ronda: no se inicia una nueva tanda y el recurso se cierra sólo después de que termine la actual; se prueba en la tarea 1.
- Una bandeja con más eventos que el límite: debe ejecutar tandas consecutivas sin esperar artificialmente; se prueba en la tarea 1.
- Un worker que sale al iniciar en producción: el workflow debe fallar con estado y logs del contenedor, no declarar éxito por la salud HTTP de la API; se prueba en la tarea 3.

---

### Task 1: Ciclo de consumo persistente y pruebas unitarias

**Files:**
- Create: `backend/src/infrastructure/inbound-event-worker.ts`
- Create: `backend/src/infrastructure/inbound-event-worker.test.ts`
- Modify: `backend/src/infrastructure/process-inbound-events.ts`
- Create: `backend/src/infrastructure/process-inbound-events-daemon.ts`
- Modify: `backend/package.json`

**Interfaces:**
- Consumes: `InboundMessagingService.processPending(limit: number): Promise<number>`.
- Produces: `runInboundEventWorker(options: InboundEventWorkerOptions): Promise<void>` y `parseInboundWorkerOptions(env: NodeJS.ProcessEnv): InboundEventWorkerOptions`.
- Produces: comando `worker:inbound-events:daemon` que inicia el daemon compilado.

- [ ] **Step 1: Escribir pruebas fallidas para configuración, drenaje y apagado**

```ts
import { describe, expect, it, vi } from 'vitest';
import { parseInboundWorkerOptions, runInboundEventWorker } from './inbound-event-worker.js';

it('drains consecutive batches before waiting and closes after abort', async () => {
  const processPending = vi.fn().mockResolvedValueOnce(25).mockResolvedValueOnce(0);
  const controller = new AbortController();
  const wait = vi.fn(async () => controller.abort());
  const close = vi.fn();
  await runInboundEventWorker({ processPending, close, limit: 25, pollIntervalMs: 1000, signal: controller.signal, wait });
  expect(processPending).toHaveBeenCalledTimes(2);
  expect(close).toHaveBeenCalledOnce();
});

it('normalizes invalid worker environment values', () => {
  expect(parseInboundWorkerOptions({ INBOUND_EVENT_BATCH_SIZE: '0', INBOUND_EVENT_POLL_INTERVAL_MS: '-1' })).toMatchObject({ limit: 25, pollIntervalMs: 1000 });
});
```

- [ ] **Step 2: Ejecutar la prueba para comprobar que falla**

Run: `pnpm --filter @expenses-tracker/backend exec vitest run src/infrastructure/inbound-event-worker.test.ts`

Expected: FAIL porque el módulo y sus exportaciones todavía no existen.

- [ ] **Step 3: Implementar el módulo puro y el daemon mínimo**

```ts
export type InboundEventWorkerOptions = {
  processPending: (limit: number) => Promise<number>;
  close: () => Promise<void>;
  limit: number;
  pollIntervalMs: number;
  signal: AbortSignal;
  wait?: (ms: number, signal: AbortSignal) => Promise<void>;
};

export async function runInboundEventWorker(options: InboundEventWorkerOptions): Promise<void> {
  try {
    while (!options.signal.aborted) {
      const processed = await options.processPending(options.limit);
      if (processed === 0 && !options.signal.aborted) await (options.wait ?? waitForAbort)(options.pollIntervalMs, options.signal);
    }
  } finally {
    await options.close();
  }
}
```

El daemon crea el contenedor una sola vez, enlaza `SIGTERM` y `SIGINT` a un `AbortController`, registra inicio/detención sin payload, y pasa a `runInboundEventWorker` `service.processPending.bind(service)`, `container.close.bind(container)` y la configuración normalizada. Mantener `process-inbound-events.ts` como ejecución de una sola ronda. Añadir `worker:inbound-events:daemon` con `node dist/infrastructure/process-inbound-events-daemon.js`.

- [ ] **Step 4: Ejecutar pruebas y compilación del backend**

Run: `pnpm --filter @expenses-tracker/backend exec vitest run src/infrastructure/inbound-event-worker.test.ts && pnpm --filter @expenses-tracker/backend build`

Expected: PASS y los dos entry points existen en `backend/dist/infrastructure/`.

- [ ] **Step 5: Commit**

```bash
git add backend/src/infrastructure/inbound-event-worker.ts backend/src/infrastructure/inbound-event-worker.test.ts backend/src/infrastructure/process-inbound-events.ts backend/src/infrastructure/process-inbound-events-daemon.ts backend/package.json
git commit -m "fix(worker): run inbound events continuously"
```

### Task 2: Servicio persistente de producción

**Files:**
- Modify: `backend/compose.production.yaml`
- Modify: `docs/operations.md`

**Interfaces:**
- Consumes: `BACKEND_IMAGE` y `.env` que ya usa `expenses-tracker-backend`.
- Consumes: script compilado `worker:inbound-events:daemon` de Task 1.
- Produces: contenedor `expenses-tracker-inbound-worker` sin puertos, con reinicio automático.

- [ ] **Step 1: Escribir la aserción de configuración Compose**

```powershell
$env:BACKEND_IMAGE = 'ghcr.io/example/expenses-tracker-backend:test-sha'
$images = docker compose -f backend/compose.production.yaml config --images | Sort-Object -Unique
if ($images -ne 'ghcr.io/example/expenses-tracker-backend:test-sha') { throw "Unexpected image: $images" }
$compose = docker compose -f backend/compose.production.yaml config
if ($compose -notmatch 'expenses-tracker-inbound-worker') { throw 'Inbound worker service is missing' }
```

Expected: inicialmente FAIL porque el servicio worker no está declarado.

- [ ] **Step 2: Declarar el worker con la misma imagen y entorno**

```yaml
  expenses-tracker-inbound-worker:
    image: ${BACKEND_IMAGE:-ghcr.io/eduardosalasg/expenses-tracker-backend:latest}
    container_name: expenses-tracker-inbound-worker
    restart: unless-stopped
    env_file:
      - .env
    command: ["node", "dist/infrastructure/process-inbound-events-daemon.js"]
```

Actualizar `docs/operations.md` para indicar que producción usa este servicio persistente, documentar `INBOUND_EVENT_BATCH_SIZE` y `INBOUND_EVENT_POLL_INTERVAL_MS`, y dejar el comando de una ronda únicamente como drenaje operativo/manual.

- [ ] **Step 3: Validar configuración Compose y documentación**

Run: `$env:BACKEND_IMAGE = 'ghcr.io/example/expenses-tracker-backend:test-sha'; docker compose -f backend/compose.production.yaml config --images | Sort-Object -Unique; docker compose -f backend/compose.production.yaml config`

Expected: el único tag renderizado es el SHA de prueba; API y worker tienen el mismo `image`, `env_file` y `restart`; sólo API publica el puerto 3000.

- [ ] **Step 4: Commit**

```bash
git add backend/compose.production.yaml docs/operations.md
git commit -m "fix(ops): run inbound webhook worker in production"
```

### Task 3: Despliegue verificable de API y worker

**Files:**
- Modify: `.github/workflows/deploy-backend-docker.yml`
- Test: comprobación estática en `powershell` sobre el YAML renderizado y el script remoto.

**Interfaces:**
- Consumes: servicios `expenses-tracker-backend` y `expenses-tracker-inbound-worker` de Task 2.
- Consumes: `BACKEND_IMAGE="$REMOTE_IMAGE_NAME:${{ github.sha }}"`.
- Produces: despliegue que recrea y valida ambos contenedores contra el mismo tag SHA e ID de imagen.

- [ ] **Step 1: Escribir aserciones estáticas fallidas para el workflow**

```powershell
$workflow = Get-Content .github/workflows/deploy-backend-docker.yml -Raw
@(
  'expenses-tracker-inbound-worker',
  'docker compose up -d --force-recreate --remove-orphans --pull never expenses-tracker-backend expenses-tracker-inbound-worker',
  'running_config_image',
  'State.Running'
) | ForEach-Object { if (-not $workflow.Contains($_)) { throw "Missing deployment guard: $_" } }
```

Expected: initially FAIL because the workflow only deploys and inspects the API.

- [ ] **Step 2: Actualizar el despliegue y las verificaciones por servicio**

Reemplazar la comparación de una salida única por `docker compose config --images | sort -u` y exigir que el conjunto único sea el tag SHA esperado. Recrear ambos servicios explícitamente con `--pull never`. Después de `docker image inspect`, iterar en `expenses-tracker-backend expenses-tracker-inbound-worker` para obtener `.Image`, `.Config.Image`, `.State.Running` y `.Created`; fallar, imprimir `docker compose ps` y `docker logs --tail=200 "$service"` si difiere el ID, el tag configurado o no está running. Conservar los probes `/health`, `/me/account-context` y Swagger únicamente para la API.

- [ ] **Step 3: Ejecutar la comprobación estática y validar sintaxis**

Run: `powershell -NoProfile -Command "$workflow = Get-Content .github/workflows/deploy-backend-docker.yml -Raw; @('expenses-tracker-inbound-worker','--pull never expenses-tracker-backend expenses-tracker-inbound-worker','State.Running') | ForEach-Object { if (-not $workflow.Contains($_)) { throw $_ } }"`

Expected: PASS; el script contiene comprobación de imagen/tag/estado para los dos servicios, y conserva la comprobación HTTP sólo para la API.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/deploy-backend-docker.yml
git commit -m "fix(ci): verify inbound worker deployment"
```

### Task 4: Verificación transversal y cierre OpenSpec

**Files:**
- Modify: `openspec/changes/run-inbound-webhook-worker/tasks.md`
- Modify: `docs/next-session-handoff-YYYYMMDD.md` si el release o la validación remota queda pendiente.

**Interfaces:**
- Consumes: código de Task 1, Compose y documentación de Task 2, workflow de Task 3.
- Produces: evidencia reproducible de calidad y tareas OpenSpec completadas.

- [ ] **Step 1: Ejecutar el conjunto de calidad afectado**

Run: `pnpm --filter @expenses-tracker/backend lint && pnpm --filter @expenses-tracker/backend test && pnpm --filter @expenses-tracker/backend build && openspec validate run-inbound-webhook-worker --strict`

Expected: todos los comandos PASS.

- [ ] **Step 2: Revisar el diff contra la especificación y marcar tareas**

Run: `git diff --check && git diff -- backend/src/infrastructure backend/compose.production.yaml .github/workflows/deploy-backend-docker.yml docs/operations.md openspec/changes/run-inbound-webhook-worker`

Expected: no hay errores de espacios ni cambios fuera de alcance; marcar `[x]` sólo las tareas OpenSpec cuya evidencia está completa.

- [ ] **Step 3: Crear handoff o preparar revisión de release**

Documentar los comandos, resultados, SHA de commit y cualquier validación remota pendiente en el handoff si no se completa el release; si todo queda localmente verificado, solicitar revisión técnica antes de promover `dev`.

- [ ] **Step 4: Commit**

```bash
git add openspec/changes/run-inbound-webhook-worker/tasks.md docs/next-session-handoff-*.md
git commit -m "docs: record inbound worker verification"
```

## Self-Review

**Spec coverage:** La tarea 1 implementa el consumidor persistente y preserva el procesamiento fuera de HTTP. La tarea 2 lo instala y documenta en producción. La tarea 3 exige imagen SHA y ejecución de ambos procesos. La tarea 4 verifica el comportamiento y la trazabilidad de la entrega. No hay requisitos sin tarea.

**Placeholder scan:** No se usan marcadores pendientes, referencias vagas ni pasos de prueba sin comandos o resultado esperado.

**Type consistency:** `InboundEventWorkerOptions`, `parseInboundWorkerOptions` y `runInboundEventWorker` se definen en Task 1 y se usan con los mismos nombres en el daemon y sus pruebas.

**Review Focus:** Los cinco casos de configuración, drenaje, apagado, carga y salida temprana están asignados respectivamente a Task 1 o Task 3.
