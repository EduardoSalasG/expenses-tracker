## Why

Cuando una persona crea una categoría o subcategoría desde el formulario de egresos y guarda el gasto, el registro persiste con la referencia correcta pero la lista puede mostrarlo como sin categoría. La vista conserva un catálogo local previo y no lo invalida tras la mutación.

## What Changes

- La vista de egresos SHALL refrescar su catálogo de categorías al cerrar un formulario que haya guardado un egreso.
- La recarga de egresos SHALL usar el catálogo actualizado para resolver las etiquetas de categorías y subcategorías creadas en línea.
- Se añadirá una prueba de regresión para impedir que un catálogo local desactualizado degrade una categoría válida a “Sin categoría”.

## Capabilities

### New Capabilities

- `fresh-expense-category-labels`: Garantiza que los egresos guardados desde el formulario se presenten con las etiquetas de categoría vigentes.

### Modified Capabilities

- Ninguna.

## Impact

- Afecta el flujo frontend de creación y listado de egresos en `frontend/src/app/features/expenses.component.ts` y su especificación.
- No modifica la API, el modelo de datos, ni requiere migraciones.
