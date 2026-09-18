# Notas de release — v0.1.2

## Identificación

- Versión SemVer: `0.1.2` (PATCH).
- Tag anotado: `v0.1.2`.
- SHA inmutable de `main`: `7abb7239b68609e440fd5e77ed460129e915db4d`.
- Fecha: 2026-09-18.

## Cambios incluidos

- Added: dashboard financiero con salud, prioridades accionables y alternativas textuales para los gráficos; filtros progresivos de gastos y deep links de Configuración.
- Changed: estados de carga, error y vacío compartidos; puertos de desarrollo en frontend `4300`, backend `3100` y PostgreSQL `6543`; Dockerfiles compatibles con la validación de versión.
- Security: endurecimiento de configuración productiva y de emisión de enlaces Telegram.

## Datos y compatibilidad

- Migración incluida: `039_otp_abuse_state.sql`; es idempotente dentro de `db:bootstrap`.
- Compatibilidad: no se introducen rutas API incompatibles; Swagger y la colección Postman se actualizaron junto con las rutas afectadas.
- Riesgo conocido: el diagnóstico del descuadre productivo `Others > Subscriptions` permanece diferido y no formó parte de esta release.
- Rollback: usar el tag sano anterior `v0.1.1` en `220df019ac4990cd6d06eca4e60036c6a70dc349`, siguiendo `pnpm run release:rollback:preview` antes de cualquier operación.

## Evidencia de promoción

- Validación de versión, build y pruebas: `pnpm run test` y `pnpm run release:verify` aprobados antes de la promoción.
- QA: revisión técnica, OpenSpec estricto y QA funcional visual en desarrollo aprobados.
- GitHub Actions: [run 35351790931](https://github.com/EduardoSalasG/expenses-tracker/actions/runs/35351790931), exitoso para el SHA de release.
- Netlify: producción `ready` para el SHA `7abb7239b68609e440fd5e77ed460129e915db4d`.
- Health checks: Netlify, `GET /health/live` y `GET /health/ready` respondieron HTTP `200` después del despliegue.
