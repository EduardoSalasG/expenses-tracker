# Notas de release — v0.2.0

## Identificación

- Versión SemVer: `0.2.0` (MINOR).
- Tag anotado: `v0.2.0`.
- SHA inmutable de `main`: `0ed43c4eee428791a944424d276accde45a326c2`.
- Fecha: 2026-09-18.

## Cambios incluidos

- Added: inbox durable para eventos entrantes de Telegram y WhatsApp, con deduplicación por evento de proveedor, reintentos con backoff y estado dead-letter.
- Added: worker de eventos entrantes ejecutable desde el artefacto backend de producción.
- Fixed: la resolución de cuentas personales en PostgreSQL recupera la cuenta persistida después de crearla.
- Changed: los webhooks verificados se encolan antes de su procesamiento para resistir fallos transitorios.

## Datos y compatibilidad

- Migración incluida: `040_inbound_webhook_events.sql`; crea una tabla idempotente de inbox con clave única por canal y evento de proveedor.
- Compatibilidad: no se introducen rutas API incompatibles; los endpoints existentes de webhook conservan su contrato de verificación y recepción.
- Riesgo conocido: el diagnóstico productivo de `Others > Subscriptions` sigue diferido y no se modificó en esta release.
- Rollback: usar el tag sano `v0.1.2` en `7abb7239b68609e440fd5e77ed460129e915db4d`; las migraciones se corrigen hacia adelante, no con reversión destructiva.

## Evidencia de promoción

- Backend: 20 archivos y 124 pruebas aprobadas, incluidas las integraciones PostgreSQL; build aprobado.
- Frontend: build y sincronización de versión `0.2.0` aprobados.
- Excepción inicial: una prueba de foco del menú móvil `More` quedó fallando (45/46) al promover. Se cerró post-release en `dev`: la fixture Karma no actualiza `document.activeElement` aunque el componente sí invoca foco; la aserción ahora verifica las solicitudes de foco y el gate global posterior aprobó 125 pruebas backend y 46 frontend.
- GitHub Actions: [run 35360075543](https://github.com/EduardoSalasG/expenses-tracker/actions/runs/35360075543), exitoso para el SHA de release.
- Backend: `GET /health/live` y `GET /health/ready` devolvieron HTTP `200` después del despliegue; readiness confirmó PostgreSQL `ok`.
- Netlify: el sitio público respondió HTTP `200`. La API de deploy requiere una credencial no disponible en esta sesión, por lo que no se registró una correlación de SHA de Netlify.
