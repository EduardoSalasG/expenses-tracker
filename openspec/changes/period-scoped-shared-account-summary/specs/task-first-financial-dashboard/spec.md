## MODIFIED Requirements

### Requirement: Resumen de salud financiera del período
El dashboard SHALL presentar al inicio los indicadores financieros relevantes para el período y cuenta activos, con etiquetas y valores localizados. Para una cuenta personal SHALL presentar gastos, ingresos, balance neto y progreso de presupuesto. Para una cuenta compartida SHALL presentar gasto total, saldo personal del período y progreso de presupuesto; no SHALL presentar ingresos ni un balance neto calculado como ingresos menos gastos.

#### Scenario: Período con movimientos
- **WHEN** existen ingresos o gastos para el período seleccionado en una cuenta personal
- **THEN** el resumen comunica gastos, ingresos, balance neto y progreso de presupuesto antes de los gráficos analíticos

#### Scenario: Período con gastos en cuenta compartida
- **WHEN** existen gastos para el período seleccionado en una cuenta compartida
- **THEN** el resumen comunica el gasto total, el saldo de la persona usuaria para ese período y el progreso de presupuesto sin mostrar un importe negativo de balance neto

#### Scenario: Saldo personal pendiente en cuenta compartida
- **WHEN** el saldo de la persona usuaria para el período activo es negativo o positivo
- **THEN** el resumen lo comunica respectivamente como importe positivo con estado localizado “Debe” o “A favor”, sin cambiar el período seleccionado

#### Scenario: Saldo personal equilibrado en cuenta compartida
- **WHEN** el saldo de la persona usuaria para el período activo es cero
- **THEN** el resumen comunica el estado localizado “Al día”

#### Scenario: Período sin movimientos
- **WHEN** no existen movimientos para el período seleccionado
- **THEN** el dashboard comunica un estado vacío localizado y conserva un camino claro hacia el registro de movimientos
