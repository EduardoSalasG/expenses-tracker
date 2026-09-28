## 1. Resumen compartido del período

- [x] 1.1 Definir helpers puros que obtengan el saldo de la persona autenticada desde el desglose del período y lo expresen como debe, a favor o al día; verificar primero con pruebas unitarias para saldos negativo, positivo, cero y varias monedas.
- [x] 1.2 Adaptar las tarjetas del dashboard según el tipo de cuenta, manteniendo el resumen personal actual y mostrando gasto total, saldo personal del período y presupuesto en cuentas compartidas; verificar las condiciones con pruebas de componente.
- [x] 1.3 Añadir etiquetas ES/EN localizadas para la métrica y sus estados, incluyendo “del período”; verificar la cobertura de traducciones mediante las pruebas existentes.
- [x] 1.4 Corregir la tarjeta de cabecera para que una cuenta compartida no muestre el balance neto personal; verificar mediante el caso Playwright de regresión a 320 px.

## 2. Verificación

- [x] 2.1 Ejecutar las pruebas unitarias afectadas y la suite frontend; verificar mediante Playwright a 320 px que el resumen compartido no muestra ingresos ni un balance neto negativo y que el cambio mensual/anual conserva el alcance del período.
- [x] 2.2 Ejecutar `openspec validate period-scoped-shared-account-summary --strict` y actualizar el handoff con evidencia, alcance y cualquier cobertura manual pendiente.
