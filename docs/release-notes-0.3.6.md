# Notas de release — v0.3.6

## Identificación

- Versión SemVer: `0.3.6` (PATCH).
- Estado: preparada en `dev`; pendiente de promoción a `main`.
- Tag anotado: pendiente sobre el SHA inmutable de `main` promovido.
- SHA inmutable de `main`: pendiente de promoción.
- Fecha de promoción: 2026-10-07.

## Cambios incluidos

- Fixed: las tarjetas de gastos compartidos muestran la etiqueta localizada “Pagado por”.
- Fixed: cuando el historial no entrega `paidByPreferredName`, la interfaz resuelve el nombre contra los integrantes de la cuenta compartida usando `paidByUserId`.

## Datos y compatibilidad

- Migraciones incluidas: ninguna.
- Compatibilidad: no cambia el contrato público; la resolución local usa los campos existentes de la respuesta de gastos y del listado de integrantes.
- Riesgo y mitigación: si ambos orígenes no contienen al pagador, se conserva el estado localizado sin datos en vez de atribuirlo a otra persona.
- Rollback: el último tag sano es `v0.3.5`; ejecutar primero `pnpm run release:rollback:preview -- --tag v0.3.5` para identificar el SHA inmutable.

## Evidencia de promoción

- `pnpm run version:check`: pendiente tras sincronizar la versión.
- Build y pruebas: pendiente de la verificación de release en `dev`.
- Revisión técnica y QA funcional: pendiente.
- GitHub Actions: pendiente tras el push de `main`.
- Netlify y health checks: pendientes tras la promoción.
