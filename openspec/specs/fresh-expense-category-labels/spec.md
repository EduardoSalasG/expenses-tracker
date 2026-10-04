# fresh-expense-category-labels Specification

## Purpose

Garantiza que el listado de egresos muestre las etiquetas vigentes de las categorías y subcategorías elegidas al registrar un gasto.

## Requirements

### Requirement: Etiquetas vigentes después de crear un gasto
La aplicación SHALL sincronizar el catálogo de categorías de la cuenta activa después de que una persona guarde un egreso desde su formulario, antes de presentar el resultado recargado del listado.

#### Scenario: Categoría creada en línea
- **WHEN** una persona crea una categoría desde el formulario de egresos, la selecciona y guarda el egreso
- **THEN** el listado presenta el nombre de la categoría creada para ese egreso y no la etiqueta de falta de categoría

#### Scenario: Subcategoría creada en línea
- **WHEN** una persona crea una subcategoría desde el formulario de egresos, la selecciona y guarda el egreso
- **THEN** el listado presenta la ruta de categoría y subcategoría creada para ese egreso y no la etiqueta de falta de categoría
