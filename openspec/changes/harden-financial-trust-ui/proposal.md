## Why

Los filtros de gastos ya permiten combinar criterios precisos, pero su estado activo no explica qué valores se están aplicando y las transacciones sólo muestran la hoja de su clasificación. Esto dificulta verificar rápidamente que una lista coincide con el período, la categoría y el medio de pago elegidos, especialmente en móvil.

Además, Ingresos no reutiliza el control de divulgación accesible del resto de las superficies y algunos botones destructivos de Configuración se anuncian como cierre. Corregir estos puntos reduce ambigüedad sin alterar los contratos de datos ni las rutas existentes.

## What Changes

- Mostrar un resumen localizado y legible de cada filtro de gasto activo, incluido período, texto, clasificación completa, moneda y contexto de pago; conservar los parámetros URL actuales y la combinación exacta de criterios.
- Mostrar la ruta categoría / subcategoría en las filas y tarjetas de gastos, conservando la prioridad visual de la clasificación en móvil.
- Unificar la divulgación progresiva de filtros de ingresos con el componente semántico reutilizable y conservar sus enlaces estables.
- Corregir los nombres accesibles de las acciones destructivas de catálogos para que anuncien eliminación, no cierre.

## Capabilities

### New Capabilities

<!-- Ninguna. -->

### Modified Capabilities

- `progressive-finance-navigation`: precisar que el estado de filtros activos debe comunicar sus valores localizados y que Ingresos usa divulgación progresiva semántica sin perder deep links.
- `atomic-finance-design-system`: exigir jerarquía de clasificación visible en metadatos de gastos móviles y nombres accesibles correctos para acciones destructivas.

## Impact

- Frontend Angular: `expenses.component`, `incomes.component`, `settings.component`, componente compartido de divulgación, utilidades de categoría, traducciones y sus pruebas.
- No cambia la API, el esquema de base de datos, parámetros URL públicos existentes ni el comportamiento de filtrado del backend.
