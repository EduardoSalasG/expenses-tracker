# Notas de release — v0.3.5

## Identificación

- Versión SemVer: `0.3.5` (PATCH).
- Estado: preparada en `dev`; pendiente de promoción a `main`.
- Tag anotado: pendiente sobre el SHA inmutable de `main` promovido.
- SHA inmutable de `main`: pendiente de promoción.
- Fecha de promoción: 2026-10-07.

## Cambios incluidos

- Fixed: el historial de gastos compartidos muestra la persona que pagó originalmente, con etiqueta localizada y una presentación legible en móvil.
- Fixed: los gastos nuevos de cuentas compartidas inician con reparto en partes iguales; al editar se conserva el reparto almacenado.

## Datos y compatibilidad

- Migraciones incluidas: ninguna.
- Compatibilidad: el contrato de gastos agrega opcionalmente `paidByPreferredName`; Swagger documenta el atributo y los consumidores existentes permanecen compatibles.
- Riesgo y mitigación: los registros históricos sin nombre de pagador muestran el estado localizado sin datos; el backend usa un `left join` para no excluirlos.
- Rollback: el último tag sano es `v0.3.4`; ejecutar primero `pnpm run release:rollback:preview -- --tag v0.3.4` para identificar el SHA inmutable.

## Evidencia de promoción

- `pnpm run version:check`: pendiente tras sincronizar la versión.
- Build y pruebas: pendiente de la verificación de release en `dev`.
- Revisión técnica y QA funcional: revisión técnica completada; QA de release pendiente.
- GitHub Actions: pendiente tras el push de `main`.
- Netlify y health checks: pendientes tras la promoción.
