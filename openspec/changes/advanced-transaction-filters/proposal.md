## Why

Los listados de gastos e ingresos no permiten acotar con suficiente precisión el historial financiero y, en móviles, los metadatos extensos del banco compiten visualmente con la categoría del gasto. Esto dificulta encontrar transacciones concretas y leer tarjetas compactas.

## What Changes

- Ampliar los filtros de gastos con búsqueda textual por concepto, subcategoría, opción de medio de pago y banco, manteniendo categoría, moneda, tipo de medio y período.
- Ampliar los filtros de ingresos con búsqueda textual por concepto, moneda y período.
- Sincronizar los filtros soportados con URL, validación HTTP y consultas PostgreSQL con alcance por cuenta financiera activa.
- Reordenar los metadatos de las transacciones de gasto en móvil para que categoría y subcategoría mantengan prioridad visual, mientras banco y medio se muestren como información secundaria truncable.

## Capabilities

### New Capabilities

- Ninguna.

### Modified Capabilities

- `progressive-finance-navigation`: amplía los filtros secundarios de gastos e ingresos y conserva su estado en enlaces.
- `atomic-finance-design-system`: exige jerarquía legible y sin colisión para metadatos de transacciones en móvil.

## Impact

- Frontend: `expenses.component.ts`, `incomes.component.ts`, `api.service.ts`, pruebas y estilos de tarjetas/tablas responsivas.
- Backend: esquemas de consulta, puertos de repositorio, caso de uso y consulta PostgreSQL de gastos e ingresos.
- API: parámetros de consulta opcionales nuevos, compatibles con clientes existentes.
