# Notas de release — v0.3.4

## Identificación

- Versión SemVer: `0.3.4` (PATCH).
- Estado: preparada en `dev`; pendiente de promoción a `main`.
- Tag anotado, SHA inmutable de `main` y fecha de promoción: pendientes. Se registrarán únicamente sobre el commit promovido.

## Cambios incluidos

- Fixed: al crear una categoría o subcategoría desde el formulario de gastos, el historial espera el catálogo vigente antes de mostrar el egreso, por lo que conserva la etiqueta recién asignada.

## Datos y compatibilidad

- Migraciones incluidas: ninguna.
- Compatibilidad: no cambia el contrato HTTP ni Swagger; el frontend consulta nuevamente el catálogo de categorías después de guardar el gasto.
- Riesgo y mitigación: la lista se actualiza después de obtener el catálogo, para evitar etiquetas transitorias incorrectas.
- Rollback: aplicar una corrección hacia adelante o promover el último tag sano confirmado cuando exista evidencia de producción para esta versión.

## Evidencia de promoción

- `pnpm run version:check`: aprobado en `dev` para `0.3.4`.
- Build y pruebas: 74 pruebas del frontend y el build de producción aprobados en `dev`; se mantiene la advertencia conocida de presupuesto inicial de bundle.
- Revisión técnica y QA funcional: revisión técnica resuelta; QA manual confirmado en `dev`.
- GitHub Actions, Netlify y health checks: pendientes de promoción a `main`.
