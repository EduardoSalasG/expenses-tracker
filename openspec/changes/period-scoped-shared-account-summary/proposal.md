## Why

El resumen del dashboard aplica la fórmula de cuentas personales (ingresos menos gastos) también a las cuentas compartidas. Como estas cuentas se usan para distribuir gastos y normalmente no registran ingresos, el resultado negativo parece una pérdida o deuda del grupo en vez de comunicar qué debe o tiene a favor cada integrante durante el período seleccionado.

## What Changes

- Diferenciar el resumen inicial de una cuenta compartida del de una cuenta personal.
- Sustituir las métricas de ingresos y balance neto por una métrica de saldo personal del período, localizada como “Debe”, “A favor” o “Al día”, sin mostrar importes negativos.
- Mantener el gasto total y el progreso de presupuesto, respetando siempre el filtro mensual o anual activo.
- Conservar el detalle por integrante y el flujo existente de liquidación como fuente de desglose y acción.

## Capabilities

### New Capabilities

- Ninguna.

### Modified Capabilities

- `task-first-financial-dashboard`: el resumen de salud financiera debe adaptar sus indicadores al tipo de cuenta compartida y al período seleccionado.

## Impact

- Frontend: `dashboard.component.ts`, sus pruebas y los textos localizados del dashboard.
- No cambia APIs, persistencia, cálculos de liquidación ni permisos.
