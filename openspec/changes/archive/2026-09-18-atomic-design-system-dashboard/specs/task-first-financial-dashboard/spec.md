## Purpose

Presentar la información financiera del período según las decisiones que requiere
la persona usuaria antes de la exploración analítica detallada.

## ADDED Requirements

### Requirement: Resumen de salud financiera del período
El dashboard SHALL presentar al inicio gastos, ingresos, balance neto y progreso
de presupuesto para el período y cuenta activos, con etiquetas y valores localizados.

#### Scenario: Período con movimientos
- **WHEN** existen ingresos o gastos para el período seleccionado
- **THEN** el resumen comunica los cuatro indicadores antes de los gráficos analíticos

#### Scenario: Período sin movimientos
- **WHEN** no existen movimientos para el período seleccionado
- **THEN** el dashboard comunica un estado vacío localizado y conserva un camino claro hacia el registro de movimientos

### Requirement: Acciones financieras priorizadas
El dashboard SHALL mostrar acciones prioritarias derivadas exclusivamente de los
datos ya cargados, incluyendo presupuestos comprometidos, cuotas próximas o
saldos compartidos cuando correspondan.

#### Scenario: Presupuesto comprometido
- **WHEN** el gasto de un presupuesto alcanza o supera su límite
- **THEN** el dashboard muestra una prioridad localizada que dirige a la gestión de presupuestos sin crear una consulta adicional

#### Scenario: Cuenta compartida con balance
- **WHEN** la cuenta activa es compartida y una persona tiene un balance pendiente
- **THEN** el dashboard muestra la prioridad correspondiente con acceso al flujo de liquidación existente

### Requirement: Exploración analítica secundaria y equivalente
Los gráficos SHALL permanecer disponibles después del resumen y prioridades, y
MUST mantener sus alternativas textuales equivalentes, localizadas y navegables.

#### Scenario: Consulta de datos sin interpretación visual
- **WHEN** una persona llega a un gráfico mediante teclado o lector de pantalla
- **THEN** puede acceder a su tabla de datos y entender valores, categorías y períodos sin interpretar el canvas
