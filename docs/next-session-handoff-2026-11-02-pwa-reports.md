# Handoff — PWA Push y reportes mensuales — 2026-11-02

## Presupuesto comunicado

- Ventana de cinco horas: 15 % disponible al dejar este handoff.

## Rama y commits

- Rama de trabajo: `feature/pwa-push-and-monthly-email-reports`.
- Base de planificación: `40e3175`.
- Commits más recientes: `9dc5583`, `32f0ac0`, `0d4ccc0`, `db410d3`, `936b58b`, `1cf4d08`, `ac32591`, `3a4a370`, `dafb698`, `803263c`, `e87f9de`, `8e9d14f`, `d515f51`.
- No se fusionó a `dev`, no se hizo push y no hubo despliegue.

## Trabajo completado

- Base PWA: manifiesto, service worker, caché Angular y banners posteriores a autenticación para instalación y permiso explícito.
- Registro autenticado de suscripciones Web Push, migración `039_push_subscriptions.sql`, repositorios PostgreSQL/in-memory y validación Zod.
- Configuración VAPID documentada y endpoint público para la clave.
- Renderer PDF determinista con resumen, tabla visual de KPI, gráfico de barras por categoría e insight básico.
- Proveedor Resend extendido para adjuntos base64 PDF.
- Gastos compartidos encolan entregas Push y un daemon de producción las procesa; la toma PostgreSQL es atómica con `SKIP LOCKED` y lease de cinco minutos.
- El cliente puede revocar una suscripción Push propia; Swagger documenta clave VAPID, alta y baja.
- Job mensual por cuenta envía un PDF individual a cada miembro activo con email, con dispatch idempotente por cuenta/destinatario/período y scheduler mensual versionado.
- Bootstrap Docker/PostgreSQL y el runner `pnpm test:db:integration` funcionan sin `backend/.env`.

## Verificación fresca

- Backend build y frontend production build: correctos; la advertencia SSR `NG02801` fue eliminada con `withFetch()`.
- Suite backend completa con integración PostgreSQL: 201/201 pruebas correctas.
- Integración PostgreSQL cubre la reclamación concurrente de una entrega Push.
- `git diff --check`: correcto; worktree limpio.

## Pendiente OpenSpec

OpenSpec marca 2/12 tareas completamente verificadas (1.1 y 2.1). Aún falta completar comportamiento de punta a punta.

1. QA real PWA en móvil/escritorio: instalación, permiso, Push, navegación y estados denegado/no soportado.
2. Enriquecer el PDF: comparación período anterior, evolución, principales gastos y más KPI/insights; ampliar pruebas de cuenta personal, ausencia de email y reintentos.
3. Actualizar diagramas, changelog, release notes y versión al decidir el incremento SemVer.
4. Integrar feature → `dev`, revisar, promover a `main`, configurar VAPID/Resend productivos y verificar GitHub Actions, worker, scheduler, Netlify y health checks.

## Estado del worktree

Worktree limpio. La base Docker local queda levantada como `feature-pwa-push-and-monthly-email-reports-database-1`; puede detenerse con `docker compose down` si no se usará en la siguiente sesión.
