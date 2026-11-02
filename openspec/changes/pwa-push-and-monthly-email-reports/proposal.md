## Why

La aplicación no es instalable ni puede comunicar cambios de cuentas compartidas en tiempo real. Los reportes mensuales actuales dependen de una ejecución manual/externa, sólo usan Telegram y no entregan una lectura visual estructurada para todos los participantes de una cuenta.

## What Changes

- Incorporar PWA instalable, service worker y onboarding accesible para instalación y permiso explícito de notificaciones.
- Registrar suscripciones Push autenticadas por dispositivo y entregar notificaciones idempotentes a miembros activos cuando se cree un gasto en una cuenta compartida.
- Generar y enviar por correo un PDF mensual por cuenta con KPI, insights deterministas, tablas y gráficos; una copia individual por cada miembro activo con email.
- Versionar el worker/scheduler mensual y la observabilidad de envíos, reintentos y omisiones.
- Extender la accesibilidad del shell, feedback de permisos y alternativas textuales de los gráficos del informe.

## Capabilities

### New Capabilities
- `pwa-push-engagement`: instalación PWA, consentimiento y entrega Push de gastos compartidos.
- `account-monthly-email-reports`: informe mensual PDF por cuenta, email, idempotencia y scheduler.

### Modified Capabilities
- Ninguna. Los requisitos existentes de accesibilidad se conservan; los nuevos flujos se especifican en las capacidades nuevas.

## Impact

Afecta frontend Angular y sus assets PWA, API Express autenticada, puertos/adaptadores, PostgreSQL y migraciones, proveedor Resend, nuevos proveedores VAPID/PDF, workers de producción, Compose/CI, documentación operativa y pruebas frontend/backend/e2e. Añade `@angular/service-worker`, `web-push` y una biblioteca PDF compatible con Node.
