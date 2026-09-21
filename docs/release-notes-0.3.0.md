# Notas de release — v0.3.0

## Identificación

- Versión SemVer: `0.3.0` (MINOR).
- Tag anotado: `v0.3.0`.
- SHA inmutable de `main`: `8aeca00b956fb6253f24d4074107497eb892b232`.
- Fecha: 2026-09-21.

## Cambios incluidos

- Added: filtros avanzados de gastos por concepto, categoría, subcategoría, banco, método de pago, moneda y tipo de método; filtros de ingreso por concepto y moneda con estado URL.
- Changed: el gráfico semanal del dashboard mensual usa la semana calendario que contiene el primer día del mes seleccionado y muestra día y mes al cruzar períodos.
- Changed: las tarjetas móviles de gastos priorizan la categoría y truncan de forma segura los metadatos extensos de banco o método de pago.
- Fixed: los límites temporales del buscador de gastos usan UTC, en coherencia con los gráficos de dashboard.

## Datos y compatibilidad

- Migraciones incluidas: ninguna.
- Compatibilidad: los filtros nuevos de `GET /expenses` y `GET /incomes` son opcionales y compatibles hacia atrás; Swagger y Postman fueron actualizados.
- Riesgo conocido: la ejecución de Karma no puede iniciar Chrome ni Edge en esta estación por un fallo de GPU/cache del navegador antes de cargar Jasmine. El tipado de specs, builds Angular y las pruebas backend sí fueron ejecutados; el fallo no reproduce un error de aplicación.
- Rollback: usar el tag sano `v0.2.0` en `0ed43c4eee428791a944424d276accde45a326c2`. No hay migraciones ni operaciones destructivas asociadas.

## Evidencia de promoción

- `pnpm run release:verify`: versión `0.3.0` sincronizada y builds backend/frontend aprobados fuera del sandbox de archivos, que bloquea los enlaces de dependencias de Angular.
- Backend: 18 archivos y 122 pruebas aprobadas; 6 pruebas de integración PostgreSQL omitidas al no activar el entorno de integración.
- GitHub Actions: [run 35566321834](https://github.com/EduardoSalasG/expenses-tracker/actions/runs/35566321834), exitoso para `8aeca00b956fb6253f24d4074107497eb892b232`.
- Backend público: `GET /health`, `/health/live` y `/health/ready` devolvieron HTTP `200`; readiness confirmó `database: ok`.
- Netlify: no fue posible obtener una URL o estado de deploy con las credenciales disponibles en esta sesión; queda pendiente correlacionar el deploy frontend con el SHA de release.
