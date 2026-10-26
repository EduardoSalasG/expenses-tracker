# Notas de release — v0.5.0

## Identificación

- Versión SemVer: `0.5.0` (MINOR).
- Estado: publicada y verificada en producción.
- Fecha de publicación: 2026-10-26.
- Commit de release en `main`: `ecdc3e1dd4ad3585dd67a94df2a212dea8cf5743`.
- Tag anotado: `v0.5.0`, resuelto al mismo commit inmutable.

## Cambios incluidos

- Added: la captura conversacional de gastos reconoce `ayer`, fechas ISO y fechas con día y mes; conserva de forma independiente la fecha de compra y la primera cuota.
- Added: las categorías, subcategorías y respuestas de confirmación usan la etiqueta localizada para el idioma preferido del usuario.
- Changed: el banco de tarjetas y transferencias debe resolver a una coincidencia única del catálogo accesible. Las aclaraciones de fecha, banco y categoría conservan el borrador hasta que todos los campos sean válidos.
- Fixed: una fecha imposible no se persiste como la fecha por defecto; elegir categoría no puede confirmar un borrador que aún requiere fecha; una fecha de primera cuota no reemplaza la fecha de compra.

## Datos y compatibilidad

- Migraciones incluidas: ninguna.
- Compatibilidad: no se modifican contratos API ni Swagger.
- Riesgo y mitigación: mensajes con un alias bancario ambiguo solicitan aclaración en vez de asociar arbitrariamente un banco.
- Rollback: el último tag de referencia es `v0.4.1`; ejecutar primero `pnpm run release:rollback:preview -- --tag v0.4.1`.

## Evidencia de release

- Revisión técnica: sin bloqueos tras la segunda pasada.
- Pruebas backend: 181 correctas y 7 integraciones PostgreSQL omitidas por no disponer de configuración de DB.
- Pruebas frontend: 83/83 correctas en ejecución elevada de Karma/Chrome.
- `pnpm run release:verify`: correcto; compila backend y frontend, y prerenderiza `/` y `/en`. Persisten sólo las advertencias conocidas de Angular `NG02801` para SSR sin `withFetch()`.
- `pnpm run version:check`, validación OpenSpec estricta y `git diff --check`: correctos.
- GitHub Actions: [Deploy expenses-tracker backend #40345303166](https://github.com/EduardoSalasG/expenses-tracker/actions/runs/40345303166) finalizó con éxito para el SHA de release.
- Netlify: deploy productivo `ready`, publicado a las `2026-10-26T15:02:39.427Z` y asociado a `ecdc3e1dd4ad3585dd67a94df2a212dea8cf5743`.
- Salud pública: `https://expenses-tracker-easg.netlify.app/` devolvió HTTP 200; `https://api.expenses-tracker.eduardosalasg.dev/health` devolvió `{"status":"ok"}`; y `/health/ready` confirmó base de datos `ok`.
