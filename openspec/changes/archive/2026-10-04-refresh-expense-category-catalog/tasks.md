## 1. Regresión de etiquetas de egresos

- [x] 1.1 Añadir una prueba que demuestre que, al cerrar un gasto guardado con una categoría recién creada, el listado resuelve su etiqueta actualizada; verificar que falle antes de la corrección.
- [x] 1.2 Extender el caso para una subcategoría recién creada y verificar que se presente su ruta completa.

## 2. Sincronización focalizada del catálogo

- [x] 2.1 Invalidar y recargar el catálogo de categorías de la cuenta activa después de guardar un egreso desde el diálogo; verificar que las pruebas de regresión pasen.
- [x] 2.2 Ejecutar la suite frontend focalizada, el build frontend y `openspec validate refresh-expense-category-catalog --strict` para verificar el cambio completo.
