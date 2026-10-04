## Context

La vista de egresos mantiene su propio catálogo en memoria, acotado a la cuenta activa, y lo entrega como dato inicial al diálogo de creación. El diálogo puede crear categorías y actualizar su copia local, pero el padre sólo vuelve a consultar los egresos al cerrarse. Véanse `proposal.md` y la especificación de etiquetas vigentes para la motivación y el contrato.

## Goals / Non-Goals

**Goals:**

- Recargar el catálogo de categorías de la cuenta activa al guardar un egreso desde el diálogo.
- Hacer que el listado recargado resuelva etiquetas con ese catálogo actualizado.
- Cubrir la regresión tanto para categoría raíz como para subcategoría.

**Non-Goals:**

- No crear un catálogo global compartido entre todas las pantallas.
- No cambiar contratos HTTP, persistencia ni comportamiento de creación de categorías.
- No recargar categorías en cada consulta ordinaria de egresos.

## Decisions

### Invalidación focalizada después de la mutación

Al cerrarse el diálogo con un resultado guardado, la vista recargará el catálogo de categorías y, después de recibirlo para la misma cuenta activa, recargará los egresos. La secuencia asegura que la primera representación del resultado use etiquetas resolubles.

Se descarta pedir categorías en cada `loadExpenses`: la mayoría de las recargas no mutan el catálogo y la estrategia duplicaría tráfico sin mejorar los demás puntos de creación.

### Mantener la propiedad de estado actual

El arreglo conservará el `signal` de categorías de la vista de egresos y añadirá una operación privada de refresco focalizada. Un servicio/store global se descarta para este cambio: afectaría varias pantallas y ampliaría innecesariamente el riesgo de una corrección puntual.

### Prueba de comportamiento de la vista

La prueba simulará un diálogo que devuelve un gasto con identificadores de una categoría recién disponible y una respuesta de categorías actualizada. Verificará la etiqueta que recibe la persona usuaria, no detalles internos de solicitudes.

## Risks / Trade-offs

- [Una respuesta tardía de otra cuenta podría sobrescribir el catálogo] → conservar las comprobaciones de cuenta y de identificador de solicitud existentes.
- [Una solicitud adicional tras guardar] → limitarla a confirmaciones exitosas de creación o edición, no a cada carga de egresos.
- [El catálogo no carga] → preservar el manejo de error actual y no impedir que el gasto ya persistido se consulte de nuevo.

## Migration Plan

1. Publicar el cambio frontend junto con su prueba de regresión.
2. No hay datos ni migraciones que ejecutar.
3. Si surge una regresión, revertir el commit restaura el flujo anterior sin afectar los egresos ya guardados.
