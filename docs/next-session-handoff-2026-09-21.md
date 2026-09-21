# Handoff de próxima sesión — 2026-09-21

## Presupuesto y estado

- La persona usuaria reportó aproximadamente 55 % disponible antes del cierre.
- Rama activa: `dev`, sincronizada con el release `v0.3.0` en `main` (`8aeca00b956fb6253f24d4074107497eb892b232`).
- El tag anotado `v0.3.0` ya está publicado. El commit posterior de evidencia quedará sólo en `dev` hasta la siguiente promoción.

## Release v0.3.0

- Incluye filtros avanzados para gastos e ingresos, búsqueda por concepto, estado URL, contrato API/OpenAPI/Postman y adaptación móvil que prioriza categoría.
- Incluye el gráfico semanal del dashboard alineado al primer día del mes seleccionado; una semana partida conserva sus siete días y muestra día/mes.
- `pnpm run release:verify` aprobó fuera del sandbox; `pnpm --filter @expenses-tracker/backend test` aprobó 122 pruebas (6 integraciones omitidas por entorno).
- GitHub Actions run `35566321834` completó exitosamente para el SHA de release.
- Los checks públicos `/health`, `/health/live` y `/health/ready` devolvieron 200; readiness informó PostgreSQL `ok`.

## Brechas conocidas

- Karma no puede lanzar ChromeHeadless ni EdgeHeadless en esta estación: ambos fallan antes de Jasmine por GPU/cache de navegador. Los specs TypeScript compilan y Angular construye correctamente, pero las suites frontend no obtuvieron una ejecución de navegador local. No modificar el producto para compensar este fallo de host.
- No se obtuvo una URL/estado de Netlify mediante las credenciales disponibles; confirmar en Netlify que el deploy de `main` esté `ready` y correlacionado con `8aeca00b…`.
- Los cambios OpenSpec `advanced-transaction-filters` y `align-monthly-week-chart` permanecen sin archivar porque sus tareas de ejecución Angular no pueden marcarse honestamente hasta resolver el entorno de browser tests.
- La conciliación productiva concreta de `Others > Subscriptions` por aproximadamente $19.000 sigue diferida y requiere lectura acotada de producción o datos de ejemplo equivalentes.

## Próximo bloque recomendado

1. Reparar el entorno de pruebas navegador o añadir Playwright en CI para ejecutar los specs/UI sin depender de Chrome GPU local.
2. Confirmar Netlify y, sólo con autorización de lectura, investigar la discrepancia productiva de categorías.
