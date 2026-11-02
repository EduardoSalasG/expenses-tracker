# Handoff — candidata PWA Push e informes por cuenta — 2026-11-02

## Rama y estado

- Rama: `feature/pwa-push-and-monthly-email-reports`.
- Commit de candidata: `ee26318031c7c3207562ccb266e8a5d66c5c8993` (`feat: complete pwa push and monthly account reports`).
- Versión propuesta: `0.6.0` (MINOR).
- No se hizo push, merge, tag ni despliegue. Producción permanece sin cambios.

## Entrega cerrada en código

- PWA instalable con consentimiento explícito y pruebas de instalación, permiso denegado y navegador no compatible.
- Web Push autenticado, outbox durable, worker continuo y baja de suscripción; gastos compartidos no fallan si Push falla.
- Informes mensuales PDF por cuenta para todos los miembros activos con email, con balances por moneda, comparación por categoría, gastos principales, insights, adjunto Resend base64 e idempotencia/reintento.
- Scheduler mensual, Compose de producción, Swagger, README, operaciones, diagrama, changelog y notas de `0.6.0` actualizados.

## Evidencia fresca

- `pnpm test`: 198 backend correctas, 8 integración PostgreSQL omitidas en la ejecución unitaria; 87 frontend correctas.
- `pnpm test:db:integration`: 206 backend correctas con PostgreSQL y migraciones desde una base temporal limpia.
- `pnpm run release:verify`: correcto; versión sincronizada, backend y frontend compilados, rutas `/` y `/en` prerenderizadas.
- `pnpm --filter @expenses-tracker/frontend test:e2e`: código 0 localmente; la matriz existente cubre 320 px, móvil y escritorio.
- `pnpm --filter @expenses-tracker/backend lint`: correcto.
- `openspec validate pwa-push-and-monthly-email-reports --strict` y `git diff --check`: correctos antes del commit.

## Pendiente y bloqueo real

- OpenSpec está 11/12: queda `4.2`, QA manual real de instalación, permiso, entrega y navegación Push en navegadores/dispositivos compatibles.
- Requiere configurar en el entorno objetivo `VAPID_SUBJECT`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `RESEND_API_KEY` y `RESEND_FROM_EMAIL`; después validar worker Push, scheduler mensual, correo y navegación desde la notificación.
- `pnpm lint` global no puede cerrar porque el frontend declara `ng lint` sin target `lint` en `frontend/angular.json`; es una deuda de configuración preexistente. El lint backend sí aprobó.
- Falta revisión técnica final y decisión explícita para integrar feature -> dev; después aplicar el release gate dev -> main, tag anotado `v0.6.0` y verificación de GitHub Actions/Netlify/health.
