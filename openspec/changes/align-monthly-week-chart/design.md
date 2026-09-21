## Context

El dashboard mensual carga el resumen y los gráficos usando el mes seleccionado, pero la serie semanal usa la semana calendario de la fecha actual. El endpoint existente ya recibe un lunes y devuelve los siete días siguientes, por lo que el desacople está en el cliente.

## Goals / Non-Goals

**Goals:**

- Derivar de forma determinista el lunes de la semana que contiene el primer día del mes seleccionado.
- Mantener la serie de siete días, incluso cuando incluya días del mes anterior o siguiente.
- Hacer visibles día y mes en las etiquetas semanales para eliminar ambigüedad en cruces de mes.

**Non-Goals:**

- No se crea un selector de semana ni se cambia el endpoint, consultas PostgreSQL, zona horaria UTC ni el comportamiento anual.
- No se limita la consulta a los días pertenecientes al mes seleccionado, porque rompería el total de una semana calendario.

## Decisions

- Se usará el primer día UTC del mes seleccionado como ancla y se retrocederá al lunes. Es estable al revisar meses históricos y explica el caso de semanas partidas. La alternativa de usar la semana actual ignora el período elegido; la de recortar al mes deja semanas incompletas.
- Las etiquetas semanales mostrarán nombre abreviado del día, día numérico y mes abreviado usando el locale y UTC. La alternativa de sólo usar el día de la semana vuelve ambiguos los días de meses distintos.
- Se reutilizará el endpoint semanal existente. Ya devuelve el intervalo [lunes, lunes + 7 días) y conserva el alcance por tenant y cuenta.

## Risks / Trade-offs

- [La primera semana puede contener sólo uno a seis días del mes seleccionado] → Se conserva el intervalo calendario completo y las etiquetas muestran el mes para que el total no parezca mensual.
- [El texto del encabezado puede sugerir una semana “actual”] → Se revisará la etiqueta para que describa la semana del período seleccionado.

## Migration Plan

1. Publicar el cambio de cliente junto con sus pruebas.
2. Si se requiere rollback, restaurar el cálculo de semana actual; no existen cambios de datos ni contrato.
