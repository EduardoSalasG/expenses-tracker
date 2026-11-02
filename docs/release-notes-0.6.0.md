# Notas de release — v0.6.0

## Identificación

- Versión SemVer: `0.6.0` (MINOR).
- Estado: preparada en la rama feature; no publicada.
- Fecha de preparación: 2026-11-02.
- Commit de release en `main`: pendiente de promoción.
- Tag anotado: pendiente; debe crearse como `v0.6.0` sobre el SHA inmutable de `main` promovido.

## Cambios incluidos

- Added: PWA instalable con onboarding de instalación y consentimiento explícito de notificaciones.
- Added: suscripciones Web Push autenticadas, outbox durable y worker continuo para avisar gastos creados en cuentas compartidas.
- Added: informes PDF mensuales por cuenta enviados individualmente a miembros activos con email, con KPI por moneda, categorías, gastos principales e insights deterministas.
- Added: scheduler mensual versionado e idempotencia por cuenta, destinatario, canal y período.
- Changed: documentación operativa para Resend/VAPID y diagrama de ambos flujos.

## Datos y compatibilidad

- Migraciones incluidas: `039_push_subscriptions.sql`, `040_account_email_report_dispatches.sql` y `042_push_delivery_leases.sql`.
- Compatibilidad: Swagger incorpora `GET /push/public-key` y alta/baja autenticada de `/push/subscriptions`.
- Riesgo y mitigación: antes de producción deben configurarse secretos VAPID y Resend; los reintentos de Push y correo conservan idempotencia y un fallo Push no revierte el gasto.
- Rollback: promocionar la imagen del último tag saludable `v0.5.1`; las migraciones son aditivas y cualquier corrección posterior debe ser forward-fix.

## Evidencia de promoción

- Pruebas y builds locales: `pnpm test` aprobó 198 pruebas backend (8 integración PostgreSQL omitidas fuera del runner) y 87 frontend; `pnpm test:db:integration` aprobó 206 pruebas backend con PostgreSQL; `pnpm run release:verify` aprobó compilación y prerender de `/` y `/en`; la matriz E2E local de Chromium terminó con código 0.
- Lint: backend aprobado. El comando de lint del frontend está declarado pero el proyecto Angular no tiene target `lint`; es una limitación preexistente de configuración, no se añadió un sustituto en esta entrega.
- Revisión técnica y QA funcional: pendientes de revisión final y QA real de instalación/Push en dispositivos compatibles con secretos productivos.
- GitHub Actions, Netlify y health checks: pendientes tras promoción a `main`.
