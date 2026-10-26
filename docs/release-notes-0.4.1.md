# Notas de release — v0.4.1

## Identificación

- Versión SemVer: `0.4.1` (PATCH).
- Estado: `main` y tag publicados; operación de backend degradada por cuota de proveedor.
- Tag anotado: `v0.4.1`.
- SHA inmutable de `main`: `ea8341ff8c9a06d69ae5fd7db517f8a68f24ee3f`.
- Fecha de promoción: 2026-10-18.

## Cambios incluidos

- Fixed: el arranque de la aplicación espera la resolución de la sesión con una pantalla de carga accesible, evitando el flash de la landing en instalaciones de iOS.
- Fixed: los tags de categoría y medio de pago conservan icono y etiqueta alineados, con truncamiento seguro.
- Fixed: Presupuestos elimina selector mensual y acordeón; crear y editar usan el diálogo responsive del mes actual.

## Datos y compatibilidad

- Migraciones incluidas: ninguna.
- Compatibilidad: no se modifican contratos API ni Swagger.
- Riesgo y mitigación: la espera mínima de dos segundos estabiliza el arranque, pero agrega esa duración a sesiones sin credenciales.
- Rollback: el último tag sano de referencia es `v0.4.0`; ejecutar primero `pnpm run release:rollback:preview -- --tag v0.4.0`.

## Evidencia de promoción

- `pnpm run version:check`: correcto para `0.4.1`.
- Pruebas: backend 166 correctas y 7 integraciones PostgreSQL omitidas por no disponer de configuración de DB; suite Angular ejecutada localmente como parte del gate de monorepo.
- Build: backend y frontend correctos; Angular prerenderizó `/` y `/en`.
- QA responsive: inspección Playwright con sesión demo y datos sintéticos aprobó tags, ausencia de overflow y diálogo de presupuestos a 320, 390 y 1440 px.
- GitHub Actions: [run 39159400055](https://github.com/EduardoSalasG/expenses-tracker/actions/runs/39159400055) exitoso para `ea8341ff8c9a06d69ae5fd7db517f8a68f24ee3f`.
- Netlify: el sitio público respondió HTTP 200 y su asset principal contiene `0.4.1`.
- Health checks: `/health` y `/health/live` responden `{"status":"ok"}`. `/health/ready` responde 503 con `status: degraded` porque la cuenta o proyecto excedió la cuota del proveedor; requiere intervención operativa antes de declarar el release completamente saludable.
