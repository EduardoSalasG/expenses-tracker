## Why

En una cuenta compartida, atribuir el gasto a quien lo registró confunde la responsabilidad financiera real cuando otra persona hizo el pago. Además, el reparto más habitual al registrar un nuevo gasto compartido es entre partes iguales, por lo que debe aparecer como opción inicial.

## What Changes

- Exponer y presentar el nombre de la persona que pagó originalmente un gasto compartido, en lugar de la persona que lo registró.
- Conservar el nombre de quien registró el movimiento para otros flujos que lo usan, como ingresos.
- Inicializar los nuevos gastos de cuentas compartidas con el modo de reparto `equal` y las asignaciones iguales correspondientes.
- Conservar sin cambios el modo de reparto previamente guardado al editar un gasto.

## Capabilities

### New Capabilities

- `shared-expense-attribution`: Atribución visible y localizada del pagador original, junto con el comportamiento inicial de reparto de gastos compartidos.

### Modified Capabilities

- `atomic-finance-design-system`: La tarjeta o fila financiera compartida comunica un metadato de transacción adicional de forma localizada y legible en móvil.

## Impact

- Backend: proyección de gastos y contrato de dominio/API para incluir el nombre preferido del pagador.
- Frontend: modelo `Expense`, lista de gastos, formulario de creación compartida y cadenas localizadas ES/EN.
- Pruebas: contratos de proyección y comportamiento de la interfaz de gastos compartidos.
