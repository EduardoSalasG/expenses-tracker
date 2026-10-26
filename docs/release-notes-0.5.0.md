# Notas de release — v0.5.0

## Identificación

- Versión SemVer: `0.5.0` (MINOR).
- Estado: preparada en `dev`; pendiente de promoción a `main`, tag anotado y supervisión de despliegue.
- Fecha de preparación: 2026-10-26.

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

## Evidencia previa a promoción

- Revisión técnica: sin bloqueos tras la segunda pasada.
- Pruebas backend: 181 correctas y 7 integraciones PostgreSQL omitidas por no disponer de configuración de DB.
- Pruebas frontend: 83/83 correctas en ejecución elevada de Karma/Chrome.
- `pnpm run release:verify`: correcto; compila backend y frontend, y prerenderiza `/` y `/en`. Persisten sólo las advertencias conocidas de Angular `NG02801` para SSR sin `withFetch()`.
- `pnpm run version:check`, validación OpenSpec estricta y `git diff --check`: correctos.
