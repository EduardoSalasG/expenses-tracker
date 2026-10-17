## Why

La lista web de gastos presenta las etiquetas de categoría y medio de pago con una composición visual defectuosa. Además, Presupuestos mezcla un selector de mes sin valor para este flujo con un acordeón de creación que contradice el patrón de acciones “Crear…” de la aplicación.

## What Changes

- Corregir la presentación web de las etiquetas de categoría y medio de pago del historial de gastos, preservando su prioridad y legibilidad en móvil.
- Eliminar el selector de mes de la cabecera de Presupuestos; los indicadores de progreso usarán el mes actual.
- Reemplazar el acordeón de alta/edición de presupuestos por un modal, abierto desde el botón principal “Crear presupuesto” y desde la acción de edición de cada presupuesto.
- Mantener validación, creación rápida de categorías y subcategorías, mensajes de guardado y actualización de datos dentro del nuevo flujo modal.

## Capabilities

### New Capabilities

- `budget-modal-management`: gestión de creación y edición de presupuestos mediante una acción primaria y un diálogo accesible.

### Modified Capabilities

- `atomic-finance-design-system`: las etiquetas de metadatos financieros deben mantener una composición legible y sin desbordes en web y móvil.

## Impact

- Afecta `frontend/src/app/features/expenses.component.ts`, `frontend/src/app/features/budgets.component.ts`, estilos globales y pruebas unitarias del frontend.
- No modifica APIs, contratos de datos ni dependencias.
