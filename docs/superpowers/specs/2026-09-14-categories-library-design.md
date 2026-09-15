# Rediseño de la biblioteca de categorías

## Objetivo

Convertir Categorías de una biblioteca pasiva con dos formularios ocultos en una superficie operativa: crear una categoría desde una única acción, explorar la jerarquía con rapidez y entender su actividad del mes.

## Alcance aprobado

- Una acción principal `Nueva categoría` que abre un diálogo adaptativo.
- El diálogo permite crear una categoría principal o una subcategoría; el padre es obligatorio solo para la segunda.
- Una biblioteca en árbol con búsqueda y filtros para todas, predeterminadas y personalizadas.
- Actividad del mes agrupada por moneda para cada categoría principal, calculada con el endpoint existente de totales por categoría.
- Estados de carga, vacío, error y confirmación conservados; interfaz localizada en español e inglés.

## Límites

- No hay cambios en API, base de datos, Swagger ni migraciones.
- No se añaden iconos o colores persistentes porque el modelo no los contiene.
- Renombrar, fusionar, archivar y eliminar categorías quedan fuera de esta entrega: afectan gastos, presupuestos, filtros y dashboard y requieren un contrato con vista previa de impacto.
- La actividad se limita al mes calendario actual y no agrega conversión entre monedas.

## Criterios de aceptación

1. Se puede crear una categoría principal o subcategoría desde la acción principal sin salir de la pantalla.
2. La búsqueda encuentra una categoría principal cuando coincide su nombre o una subcategoría.
3. Los filtros muestran correctamente categorías predeterminadas, personalizadas y todas.
4. La actividad mensual incluye gastos de subcategorías bajo su categoría principal y conserva cada moneda separada.
5. Se mantienen la conciliación ante una respuesta de creación perdida, localización y el alcance de cuenta activo.
