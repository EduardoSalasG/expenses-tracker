## Context

Ver `proposal.md` para la motivación. Gastos ya conserva un filtro secundario en URL, pero el contrato de API sólo admite categoría, moneda y tipo de medio de pago; ingresos sólo admite moneda. Las transacciones móviles reutilizan una tabla responsive donde los metadatos compiten por espacio.

## Goals / Non-Goals

**Goals:**

- Exponer filtros precisos y composables, limitados siempre a tenant y cuenta financiera activa.
- Mantener compatibilidad de los parámetros existentes y enlaces compartibles.
- Garantizar que una categoría siga siendo legible en una tarjeta de 320 píxeles.

**Non-Goals:**

- No incorporar búsqueda por banco, categoría o subcategoría dentro del texto libre.
- No introducir paginación ni modificar la semántica de fechas, cuotas o reportes.
- No cambiar las pantallas de creación o edición de transacciones.

## Decisions

### Parámetros explícitos y opcionales

Se añadirán parámetros independientes para `concept`, `subcategoryId`, `paymentMethodOptionId` y `bankOptionId` a gastos, y `concept` a ingresos. El concepto usará coincidencia parcial sin distinción de mayúsculas. Mantener parámetros explícitos evita ambigüedad, permite validar UUIDs y conserva el comportamiento de clientes existentes cuando se omiten.

Se descarta una búsqueda global porque la persona usuaria definió que el texto sólo debe buscar el concepto.

### Subcategoría dependiente de categoría

La interfaz cargará el catálogo existente y limitará las opciones de subcategoría a hijas de la categoría seleccionada. Al cambiar la categoría, limpiará una subcategoría incompatible. El backend acepta el filtro de subcategoría de manera independiente para que enlaces guardados sigan siendo válidos y no dependan del estado visual.

### Sincronía URL, API y SQL

El cliente serializará y restaurará los filtros validados. El controlador validará textos acotados y UUIDs opcionales; los repositorios añadirán cada predicado sólo cuando exista, junto a los predicados invariables de tenant y cuenta. Esto evita que un filtro vacío ensanche el alcance o exponga datos de otra cuenta.

### Jerarquía móvil por composición, no por recorte de datos

La categoría/subcategoría ocupará una línea o etiqueta propia de prioridad alta. Banco y método ocuparán una línea secundaria con `min-width: 0` y truncamiento, manteniendo accesible el texto completo mediante etiqueta o título. Se descarta ocultar el banco porque seguiría siendo útil como contexto.

## Risks / Trade-offs

- [Más combinaciones de filtros] → pruebas de serialización, esquema HTTP y repositorio para filtros individuales y combinados.
- [Texto `ILIKE` sin índice dedicado] → límite actual de resultados se conserva; se evaluará índice sólo si los datos reales muestran una regresión medible.
- [Nombres de banco extensos] → truncamiento visual, sin pérdida del valor completo para lectores de pantalla o tooltip.

## Migration Plan

1. Desplegar parámetros opcionales compatibles con clientes existentes.
2. Desplegar interfaz que los emite y restaura desde URL.
3. Verificar en móvil 320 px, ancho móvil representativo y escritorio.
4. Revertir el commit restituye el contrato previo; no hay migración de datos.
