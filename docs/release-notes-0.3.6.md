# Notas de release — v0.3.6

## Identificación

- Versión SemVer: `0.3.6` (PATCH).
- Estado: publicada en `main`.
- Tag anotado: `v0.3.6`.
- SHA inmutable de `main`: `bbe63373fe067230379938627c0183756918d7a7`.
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

- `pnpm run version:check`: correcto para `0.3.6`.
- Build: backend y frontend correctos; el build de frontend requirió ejecución fuera del sandbox local por restricciones de lectura del aislamiento.
- Pruebas: `pnpm test` sobre el merge de `main`: backend 138 correctas, 6 integraciones PostgreSQL omitidas; frontend 78 correctas.
- GitHub Actions: workflow de backend correcto para el SHA publicado: https://github.com/EduardoSalasG/expenses-tracker/actions/runs/37641389374
- Netlify y health checks: sitio de producción HTTP 200; bundle público contiene `0.3.6` y “Pagado por”; `/health`, `/health/live` y `/health/ready` respondieron `ok`.
