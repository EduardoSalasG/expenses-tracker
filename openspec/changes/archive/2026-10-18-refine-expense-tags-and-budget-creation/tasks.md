## 1. Pruebas de regresión

- [x] 1.1 Ampliar las pruebas de Gastos para cubrir la estructura y clases de los tags de categoría y pago, y verificar que fallan antes del ajuste visual.
- [x] 1.2 Reemplazar la prueba del acordeón de Presupuestos por pruebas que exijan el botón principal, la ausencia del selector mensual y el diálogo de creación/edición; verificar que fallan antes de implementar.

## 2. Presentación de gastos

- [x] 2.1 Ajustar los estilos y la estructura mínima de `transaction-tag` para alinear icono y texto, y verificar las pruebas unitarias de Gastos.
- [x] 2.2 Revisar la tabla de Gastos a 320 px, ancho móvil representativo y escritorio, comprobando que los tags no desbordan ni se superponen.

## 3. Flujo de Presupuestos

- [x] 3.1 Extraer el formulario de presupuesto a un diálogo responsive que conserve validación y creación rápida de categorías/subcategorías, y verificar sus pruebas unitarias.
- [x] 3.2 Reemplazar el acordeón por el botón “Crear presupuesto”, conectar edición al mismo diálogo y eliminar el selector/estado de mes; verificar que el progreso se carga para el mes actual.

## 4. Verificación y documentación

- [x] 4.1 Ejecutar las pruebas focalizadas de Gastos y Presupuestos y el build de producción del frontend, verificando salidas exitosas.
- [x] 4.2 Ejecutar el detector Impeccable sobre los archivos de UI modificados y realizar una revisión visual única de escritorio y móvil; registrar cualquier limitación.
- [x] 4.3 Validar el cambio OpenSpec en modo estricto y actualizar el handoff de sesión con presupuesto, evidencia y trabajo restante.
