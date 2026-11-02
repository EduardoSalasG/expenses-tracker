# Handoff — PWA Push y reportes mensuales — 2026-11-02

## Presupuesto comunicado

- Ventana de cinco horas: 93 % disponible al iniciar este slice.

## Rama y commits

- Rama de trabajo: `feature/pwa-push-and-monthly-email-reports`.
- Base de planificación: `40e3175`.
- Slice implementado: `d515f51 feat: add pwa enrollment and report pdf foundation`.
- No se fusionó a `dev`, no se hizo push y no hubo despliegue.

## Trabajo completado

- Base PWA: manifiesto, service worker, caché Angular y banners posteriores a autenticación para instalación y permiso explícito.
- Registro autenticado de suscripciones Web Push, migración `039_push_subscriptions.sql`, repositorios PostgreSQL/in-memory y validación Zod.
- Configuración VAPID documentada y endpoint público para la clave.
- Renderer PDF determinista con resumen, tabla visual de KPI, gráfico de barras por categoría e insight básico.
- Proveedor Resend extendido para adjuntos base64 PDF.

## Verificación fresca

- Backend build: correcto.
- Frontend production build: correcto; conserva advertencia de presupuesto Angular: 1.45 MB, 303.01 kB por encima de 1.15 MB.
- Backend focal: 22 pruebas correctas (`app`, registro Push y renderer PDF).
- Frontend focal: 2/2 correctas para el servicio de PWA.
- `git diff --check`: correcto antes del commit.

## Pendiente OpenSpec

No se marcaron tareas como completas: `0/12`. Aún falta completar su comportamiento de punta a punta.

1. Outbox/worker Web Push: crear entregas tras persistir un gasto compartido, enviar vía VAPID, reintentar, desactivar endpoints inválidos y mantener `POST /expenses` no bloqueante.
2. Integrar el cliente PWA con una suscripción real registrada después de la instalación y ampliar las pruebas de permisos denegados/no soportados.
3. Reportes mensuales por cuenta: dispatch idempotente con `financial_account_id`, listado de cuentas/destinatarios activos con email, job email/PDF y scheduler versionado.
4. Documentación Swagger/operativa, Compose, pruebas PostgreSQL/e2e móvil y release.

## Estado del worktree

Quedan dos modificaciones no committeadas, `frontend/public/robots.txt` y `frontend/public/sitemap.xml`, producidas por el generador del build y limitadas a saltos de línea. No pertenecen al slice ni se incluyeron en el commit; resolverlas de forma explícita antes de un commit posterior.
