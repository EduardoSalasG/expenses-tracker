## Context

La proyección de gastos ya conserva `paidByUserId`, pero sólo devuelve el nombre de quien creó el registro. El formulario de gastos nuevos inicializa el modo de reparto como `payer`; el modo existente se carga correctamente al editar. Véase `proposal.md` para la motivación.

## Goals / Non-Goals

**Goals:**

- Llevar el nombre preferido del pagador desde la proyección de gastos hasta la interfaz.
- Presentarlo sólo en el contexto de cuentas compartidas, con etiquetas ES/EN independientes de los textos de ingresos.
- Cambiar únicamente el valor inicial para creación de gastos compartidos y preservar el valor existente durante edición.
- Proteger ambos comportamientos con pruebas de repositorio y componente.

**Non-Goals:**

- No se modifica el esquema de base de datos ni las reglas de cálculo de saldos.
- No se cambia el valor de reparto de gastos existentes ni el flujo de ingresos.
- No se rediseña la lista de transacciones.

## Decisions

### Proyectar el nombre del pagador junto al gasto

La consulta de gastos hará un `left join` adicional sobre el usuario pagador y el mapeo de dominio expondrá `paidByPreferredName`. Así la API entrega el dato ya resuelto y la UI no necesita resolver identificadores de miembros. Se descarta derivarlo desde la lista cliente de integrantes: puede estar desactualizada o incompleta para gastos históricos.

### Mantener una etiqueta de i18n específica para gastos compartidos

La fila usará una nueva clave de traducción para “Pagado originalmente por”, sin reutilizar `transactions_recorded_by`. Se descarta renombrar la clave compartida porque los ingresos siguen comunicando correctamente quién los registró.

### Predeterminar `equal` sólo al crear

El grupo reactivo conserva un valor base neutral; al inicializar un gasto nuevo compartido se establece `equal` y se recalculan las asignaciones. La rama de gasto existente conserva `allocationMode` persistido. Se descarta cambiar el valor global del control porque afectaría flujos personales y podría reemplazar valores de edición.

## Risks / Trade-offs

- [Un usuario pagador eliminado o sin nombre preferido] → La proyección mantiene `left join` y usa el fallback de nombre existente; la interfaz conserva un estado localizado sin datos.
- [Resto de centavos al dividir] → Se reutiliza la lógica actual de partes iguales, que ya distribuye el remanente.
- [Metadato adicional en móvil] → Se reutilizan las clases responsivas de fila y se cubre el contrato de 320 px en la prueba de interfaz pertinente.

## Migration Plan

1. Desplegar el cambio de proyección y contrato junto con el frontend, sin migración de datos.
2. Verificar la lista de una cuenta compartida con pagador y registrador distintos.
3. Para revertir, restaurar la proyección y la etiqueta anterior; los gastos guardados no requieren transformación.
