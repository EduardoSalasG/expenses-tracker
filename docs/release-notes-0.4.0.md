# Notas de release — v0.4.0

## Identificación

- Versión SemVer: `0.4.0` (MINOR).
- Estado: publicada en `main`.
- Tag anotado: `v0.4.0`.
- SHA inmutable de `main`: `1d4c4dec5899872892a814b3d1932b255acaa96a`.
- Fecha de promoción: 2026-10-10.

## Cambios incluidos

- Added: WhatsApp y Telegram aceptan `cuenta <nombre>` / `account <name>` para dirigir un movimiento sólo en ese mensaje hacia una cuenta accesible.
- Added: preferencias de categoría por cuenta; las correcciones explícitas se aplican de inmediato y tres confirmaciones coherentes generan aprendizaje compartido por los miembros de una cuenta compartida.
- Added: consolidación histórica idempotente mediante `db:backfill:category-preferences`.
- Changed: la cuenta se autoriza antes de cargar catálogos o invocar al intérprete; las cuentas inciertas no crean movimientos ni cambian el contexto persistente.
- Changed: las confirmaciones de duplicados conservan la cuenta autorizada y `Other` nunca se asigna automáticamente ante incertidumbre.

## Datos y compatibilidad

- Migraciones incluidas: `041_financial_account_category_preferences.sql`, aplicada por el bootstrap de migraciones rastreadas del despliegue.
- Compatibilidad: la propiedad `accountName` es opcional; los proveedores y clientes previos siguen siendo compatibles. No hay cambios de endpoint Swagger.
- Riesgo y mitigación: la consolidación sólo crea preferencias para señales no conflictivas con tres o más movimientos, es por cuenta y nunca reemplaza correcciones explícitas; las cuentas no encontradas o ambiguas se rechazan sin escritura.
- Rollback: el último tag sano es `v0.3.6`; ejecutar primero `pnpm run release:rollback:preview -- --tag v0.3.6`. La migración no se revierte en sitio: una corrección hacia adelante preserva los datos si hiciera falta.

## Evidencia de promoción

- `pnpm run version:check`: correcto para `0.4.0`.
- Pruebas: backend 166 correctas y 7 integraciones omitidas sin variables de DB; la integración PostgreSQL de mensajería ejecutada explícitamente pasó 3/3.
- Build: backend y frontend correctos; el build Angular se ejecutó fuera del sandbox local por restricciones de lectura del aislamiento.
- Revisión técnica: revisión independiente y rondas de corrección cubrieron autorización de cuentas, categorías aprendidas, borradores, duplicados, consolidación e idempotencia.
- GitHub Actions: [run 38076571947](https://github.com/EduardoSalasG/expenses-tracker/actions/runs/38076571947) exitoso para el SHA publicado; verificó pruebas, build, imagen, despliegue, worker y proxy.
- Netlify y health checks: `https://expenses-tracker-easg.netlify.app` respondió HTTP 200 y su bundle contiene `0.4.0`; `/health` y `/health/live` respondieron `{"status":"ok"}` y `/health/ready` confirmó `database: ok`.
- QA manual pendiente: no se ejecutó un flujo autenticado real de WhatsApp/Telegram ni login web contra producción desde esta sesión; los contratos automatizados y los checks públicos sí pasaron.
