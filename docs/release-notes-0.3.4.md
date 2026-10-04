# Notas de release — v0.3.4

## Identificación

- Versión SemVer: `0.3.4` (PATCH).
- Estado: promovida a producción desde `main`.
- Tag anotado: `v0.3.4` sobre `206d372ad30ae82d7e59e849b00b61e628daf3c4`.
- SHA inmutable de `main`: `206d372ad30ae82d7e59e849b00b61e628daf3c4`.
- Fecha de promoción: 2026-10-04.

## Cambios incluidos

- Fixed: al crear una categoría o subcategoría desde el formulario de gastos, el historial espera el catálogo vigente antes de mostrar el egreso, por lo que conserva la etiqueta recién asignada.

## Datos y compatibilidad

- Migraciones incluidas: ninguna.
- Compatibilidad: no cambia el contrato HTTP ni Swagger; el frontend consulta nuevamente el catálogo de categorías después de guardar el gasto.
- Riesgo y mitigación: la lista se actualiza después de obtener el catálogo, para evitar etiquetas transitorias incorrectas.
- Rollback: el último tag sano anterior es `v0.3.3`; el procedimiento usa primero `pnpm run release:rollback:preview -- --tag v0.3.3` y luego el artefacto inmutable asociado.

## Evidencia de promoción

- `pnpm run version:check`: aprobado en `dev` y sobre el merge de `main`.
- Build y pruebas: build de backend y frontend aprobados; 130 pruebas backend y 74 frontend pasaron. Las integraciones PostgreSQL también pasaron (136 pruebas backend, incluidas las 6 de BD).
- Revisión técnica y QA funcional: revisión técnica resuelta; QA manual confirmado en `dev`.
- GitHub Actions: [run 37227325540](https://github.com/EduardoSalasG/expenses-tracker/actions/runs/37227325540) aprobado; verificó imagen SHA, API, worker, Nginx y contrato público de gastos.
- Netlify y health checks: `https://expenses-tracker-easg.netlify.app` respondió `200`; `/health`, `/health/live` y `/health/ready` de la API pública respondieron `200`.
