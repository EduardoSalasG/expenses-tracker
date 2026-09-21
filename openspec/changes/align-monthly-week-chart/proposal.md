## Why

El gráfico semanal del dashboard mensual consulta la semana calendario actual aunque la persona haya seleccionado otro mes. Eso separa el gráfico del período que se está revisando y puede ocultar que la primera semana de un mes comparte días con el mes anterior.

## What Changes

- El gráfico semanal del dashboard mensual se anclará al primer día del mes seleccionado y mostrará la semana calendario completa de lunes a domingo que lo contiene.
- Cuando esa semana cruce el límite mensual, incluirá los siete días reales y etiquetas con día y mes para que el alcance sea inequívoco.
- Se añadirán pruebas de cálculo de semana y etiquetas para meses que comienzan lunes y para meses que comienzan a mitad de semana.

## Capabilities

### New Capabilities

- Ninguna.

### Modified Capabilities

- `task-first-financial-dashboard`: la exploración analítica semanal del dashboard mensual debe corresponder al mes seleccionado y comunicar explícitamente una semana que cruza meses.

## Impact

- Afecta la carga y el renderizado del gráfico semanal del dashboard Angular y sus pruebas unitarias.
- Reutiliza el endpoint semanal existente; no cambia el contrato HTTP, migraciones, Docker ni producción.
