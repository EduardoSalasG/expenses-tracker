## Context

La pantalla de Gastos ya usa etiquetas `transaction-tag` para sus metadatos y el modal de gastos como patrón de formulario. Presupuestos usa un formulario inline dentro de un acordeón; el selector de mes únicamente alimenta el rango del informe que calcula el progreso. Véanse `proposal.md` y los delta specs para el comportamiento esperado.

## Goals / Non-Goals

**Goals:**

- Corregir la composición de los tags sin cambiar el contenido ni el contrato de gastos.
- Unificar la creación y edición de presupuestos en un modal responsive, con foco y cierre accesibles.
- Mantener las acciones existentes de crear categorías y subcategorías desde el formulario.

**Non-Goals:**

- No añadir selección histórica de meses ni cambiar cómo persiste un presupuesto.
- No cambiar las rutas, API ni el diseño visual general de la aplicación.

## Decisions

- Extraer el formulario de presupuesto a un componente de diálogo standalone. La página conservará carga, totales, progreso y el botón principal; el diálogo recibirá los catálogos y el presupuesto opcional, devolviendo el resultado guardado. Esto evita que el estado del formulario quede visible en la página y reproduce el patrón de Gastos. Alternativa descartada: mantener el formulario desplegado sin acordeón, pues no satisface el patrón solicitado de “Crear…”.
- Calcular el rango del informe con `currentMonth()` durante la carga de Presupuestos. Al no haber selección en la vista, conservar `selectedMonth` y `changeMonth` introduciría estado sin interfaz; se eliminarán. Alternativa descartada: mostrar el mes como texto no interactivo, porque no aporta una acción ni contexto necesario.
- Ajustar los estilos de `transaction-tag` para que el texto y el icono puedan encogerse y truncarse correctamente en escritorio, conservando la regla móvil existente de prioridad de categoría. Alternativa descartada: quitar iconos o convertir los tags en texto plano, pues perdería señal semántica y consistencia visual.

## Risks / Trade-offs

- [El nuevo diálogo puede perder la selección después de crear una categoría rápida] → el diálogo actualizará su catálogo local y seleccionará el elemento recién creado antes de guardar.
- [El cambio de mes deja de estar disponible] → la página queda explícitamente definida para el mes calendario actual; otras superficies siguen ofreciendo selección de período cuando corresponde.
- [Los tags largos pueden requerir inspección visual] → se añadirán pruebas de DOM y se revisará en viewport móvil y de escritorio.

## Migration Plan

1. Desplegar como cambio de frontend sin migración de datos ni API.
2. Si surge una regresión, revertir el commit; los presupuestos existentes y sus contratos no cambian.
