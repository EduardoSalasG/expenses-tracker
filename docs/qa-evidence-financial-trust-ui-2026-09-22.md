# QA evidence: financial trust UI — 2026-09-22

## Entorno aislado

- Frontend Angular: `http://localhost:4310`
- Backend Express: `http://127.0.0.1:3100`
- PostgreSQL Docker local: `localhost:6543`
- Se ejecutaron bootstrap idempotente y seed demo únicamente contra la base local.

## Automatización

- ChromeHeadless/Karma ejecutó 15 pruebas de los componentes de Gastos, Ingresos y Configuración: `TOTAL: 15 SUCCESS`.
- `pnpm --filter @expenses-tracker/frontend build` terminó con código `0` y sincronización de versión `0.3.3` correcta.

## QA de navegador

- La URL de Gastos conservó `month`, `concept`, `categoryId`, `subcategoryId` y `currency` al aplicar filtros.
- El resumen activo mostró período acotado, concepto, moneda y la ruta `Otros / Regalos`.
- Ingresos expuso un único `details > summary#incomes-filter-toggle`, abrió con deep link activo y respondió a Enter.
- Un banco personalizado de la cuenta QA local expuso un botón con nombre accesible `Eliminar`.
- No hubo overflow horizontal: 320 px (`scrollWidth` 305), 390 px (`scrollWidth` 375) y 1440 px (`scrollWidth` 1425).
- La consola del navegador no reportó errores durante estas rutas.

## Limitación

El controlador de navegador disponible no permite emular `prefers-reduced-motion` ni alternar el tema de sistema. El cambio no introduce animaciones ni modifica tokens de tema; se conserva la regla global existente de movimiento reducido. Esa comprobación específica queda pendiente de un runner que permita emulación de media features.
