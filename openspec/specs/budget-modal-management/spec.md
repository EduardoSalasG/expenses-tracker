# budget-modal-management Specification

## Purpose

Permite crear y editar presupuestos mediante un diálogo accesible que conserva el patrón principal de acciones de creación de la aplicación.

## Requirements

### Requirement: Creación de presupuesto desde acción primaria
La página de Presupuestos SHALL presentar una única acción primaria localizada para crear un presupuesto y MUST abrir un diálogo accesible de creación al activarla.

#### Scenario: Crear un presupuesto
- **WHEN** una persona activa “Crear presupuesto” mediante teclado, ratón o toque
- **THEN** la aplicación abre un diálogo con el formulario validado de categoría, subcategoría, monto y moneda

### Requirement: Edición de presupuesto mediante diálogo
La página de Presupuestos SHALL abrir el mismo diálogo con los valores del presupuesto seleccionado al activar su acción de edición.

#### Scenario: Editar un presupuesto existente
- **WHEN** una persona activa “Editar” en un presupuesto activo
- **THEN** el diálogo muestra los valores existentes, permite guardarlos y actualiza el progreso tras una respuesta exitosa

### Requirement: Progreso para el mes actual
La página de Presupuestos MUST calcular sus indicadores de gasto y progreso para el mes actual, sin exponer un selector de mes en esta vista.

#### Scenario: Consulta de Presupuestos
- **WHEN** una persona abre la página de Presupuestos
- **THEN** no se muestra un selector de mes y los indicadores se basan en el mes calendario actual
