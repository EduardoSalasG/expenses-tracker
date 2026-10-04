## Context

El dashboard ya distingue cuentas compartidas para mostrar el desglose por integrante. Esa misma carga contiene, por integrante y moneda, lo pagado, lo asignado y el saldo del período. El resumen superior, en cambio, usa el cálculo de una cuenta personal para cualquier tipo de cuenta.

## Goals / Non-Goals

**Goals:**

- Adaptar las tarjetas del resumen al tipo de cuenta sin nuevas llamadas de API.
- Expresar el saldo de la persona autenticada con semántica de liquidación y monto absoluto.
- Mantener el rango mensual o anual activo como única fuente del saldo mostrado.

**Non-Goals:**

- No cambiar el modelo de ingresos, gastos, repartos ni liquidaciones.
- No mostrar deuda acumulada histórica ni cambiar la pantalla de configuración de cuentas.
- No modificar el resumen de cuentas personales.

## Decisions

- Reutilizar `memberPeriodSpending` para localizar la fila de la persona autenticada. Evita una consulta adicional y garantiza que el rango coincida con el dashboard. Alternativa descartada: usar el saldo de cuenta acumulado, porque ignoraría el filtro mensual/anual.
- Reemplazar, en cuentas compartidas, las tarjetas de ingresos y balance neto por una sola tarjeta “Tu saldo del período”. Un saldo negativo se representa como “Debe” y su valor absoluto; uno positivo como “A favor”; cero como “Al día”. Alternativa descartada: truncar el balance neto a cero, porque ocultaría gastos y no indica una acción.
- Mantener gasto total y presupuesto como tarjetas comunes. El detalle por integrante y la prioridad de liquidación conservan su función actual.

## Risks / Trade-offs

- [La fila de la persona puede no estar disponible mientras carga el desglose] → mostrar un marcador neutral hasta disponer de datos, sin inventar un saldo.
- [Varias monedas] → conservar los valores separados por moneda, igual que el resumen existente.
- [El nombre de la métrica puede confundirse con deuda histórica] → incluir “del período” en la etiqueta localizada.

## Migration Plan

1. Desplegar junto con las traducciones y pruebas de la tarjeta condicional.
2. Si fuera necesario revertir, restaurar las tarjetas personales para todos los tipos de cuenta; no hay datos ni contratos que migrar.
