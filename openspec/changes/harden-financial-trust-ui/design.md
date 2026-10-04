## Context

Ver `proposal.md` para la motivación. Gastos ya conserva sus filtros en query params y utiliza una utilidad compartida para construir rutas de categoría, pero la vista de transacciones toma sólo el nombre de la categoría final y el estado activo es un texto genérico. Ingresos mantiene una señal y un bloque condicional propios para sus filtros, mientras Gastos usa una divulgación basada en `details`. Los dos icon-buttons destructivos de catálogos reutilizan por error la etiqueta de cierre.

No se modificará el contrato del API ni el algoritmo que filtra gastos: los parámetros, la cuenta activa y la validación de filtros existentes son compatibilidad requerida.

## Goals / Non-Goals

**Goals:**

- Hacer verificable, por vista y con tecnología asistiva, el contexto efectivo de la lista de gastos.
- Reutilizar una única interacción de divulgación accesible para los filtros secundarios.
- Mantener la clasificación visible y legible en la tarjeta responsiva de 320 px.
- Añadir pruebas unitarias para los valores expuestos y pruebas de plantilla para los nombres y la semántica de controles.

**Non-Goals:**

- No cambiar el SQL, endpoints, operadores de filtro, zona horaria, ni la serialización de query params.
- No rediseñar las tarjetas ni convertir importes entre monedas.
- No introducir confirmaciones nuevas: las eliminaciones ya conservan su confirmación actual.
- No cubrir el cambio de arquitectura SEO/prerender de la landing; requiere una decisión de producto separada.

## Decisions

### Resumen derivado de los mismos valores de formulario

Gastos expondrá un selector derivado que convierta los valores efectivos del formulario en entradas localizadas: período acotado, concepto, moneda, ruta de clasificación y etiquetas de banco/medio/tipo. La interfaz renderizará esas entradas como resumen persistente cuando haya filtros secundarios.

Esto evita una segunda fuente de verdad o llamadas adicionales y permite que la prueba cubra la precisión de la combinación ya serializada. Se descarta reconstruir el resumen desde la URL porque produciría estados transitorios distintos de los controles y no mejora la compatibilidad de deep links.

### Ruta completa sólo donde existe jerarquía

La etiqueta de cada gasto utilizará la utilidad existente de ruta para la subcategoría cuando exista; para una categoría raíz se preserva su nombre simple. El mismo criterio se aplica al resumen activo. El contenedor conserva la clase de etiqueta de transacción y añade reglas de corte que priorizan la clasificación antes que el banco/medio.

Se descarta duplicar la categoría en una segunda línea fija: ocupa espacio escaso a 320 px y no ayuda cuando no hay subcategoría.

### Un único componente de divulgación para Ingresos

Ingresos adoptará el componente compartido de divulgación semántica y eliminará el botón/señal exclusivos. El estado inicial se abrirá si hay filtros secundarios válidos, igual que Gastos, y la aplicación/limpieza seguirá sincronizando los mismos parámetros de URL.

Se descarta añadir atributos ARIA manuales al botón actual: `details` y `summary` ya proporcionan una interacción nativa consistente y evita dos implementaciones que puedan divergir.

### Nombre de eliminación explícito y localizado

Los icon-buttons de eliminar banco y medio de pago usarán la clave localizada de eliminación. El flujo de confirmación y las llamadas de borrado no cambian. Se descarta nombrarlos con el elemento concreto en esta entrega porque el diálogo de confirmación ya da ese contexto; si se cambia ese diálogo, se evaluará un nombre más específico.

## Risks / Trade-offs

- [Una categoría o catálogo llega tarde mientras se carga la lista] → el resumen y la fila usan el fallback localizado de sin categoría y se actualizan cuando la señal de catálogos se resuelve.
- [Una ruta de categoría extensa consume el espacio de la tarjeta] → el texto puede envolver/truncarse dentro de su propia columna; banco y medio siguen siendo metadatos secundarios y no generan overflow horizontal.
- [Migrar Ingresos rompe enlaces de onboarding] → se conserva el identificador del disparador usado por el onboarding y se valida con pruebas de plantilla y navegación.
- [Se interpreta el resumen como un nuevo filtro] → se presenta como estado informativo, sin controles que muten el formulario ni parámetros URL adicionales.

## Migration Plan

1. Agregar primero pruebas que fallen para el resumen, ruta de clasificación, divulgación y nombres accesibles.
2. Implementar el cambio sin migraciones ni flags de datos y ejecutar las pruebas/frontend build.
3. Validar visualmente a 320 px, un ancho móvil representativo y escritorio; verificar teclado, lector de pantalla y `prefers-reduced-motion` en el control compartido.
4. Desplegar como cambio de frontend compatible. El rollback consiste en restaurar el artefacto frontend previo; no hay estado persistente que revertir.
