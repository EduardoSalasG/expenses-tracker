## Context

Ver `proposal.md` para la motivación. El parser identifica fechas localizadas y marca `dateExplicit`, pero la fusión de borradores solo adopta esa fecha si el borrador tenía una fecha inválida pendiente. Una fecha omitida se materializa como la fecha actual y no figura como pendiente.

## Goals / Non-Goals

**Goals:**

- Dar prioridad a una fecha explícita posterior sobre una fecha implícita por defecto.
- Conservar las correcciones de fechas inválidas y las respuestas sin fecha.

**Non-Goals:**

- No inferir fechas nuevas sin una expresión explícita.
- No cambiar la resolución de año ni el análisis de fechas del parser.

## Decisions

- La fusión adoptará la fecha de respuesta cuando `dateExplicit` sea verdadero y el borrador no tenga una fecha explícita previa. Esto distingue una fecha real de la fecha actual aplicada por defecto.
- Se conserva la condición existente para respuestas sin fecha: no sobrescriben la fecha del borrador.
- Alternativa descartada: tratar una fecha omitida como campo faltante. Forzaría una confirmación adicional en flujos que hoy guardan correctamente con la fecha actual.

## Risks / Trade-offs

- [La persona envía una nueva fecha explícita después de haber indicado otra] → La primera fecha explícita se preserva; cambiar una fecha ya confirmada sigue siendo una actualización de movimiento, fuera de este flujo.

## Migration Plan

1. Ejecutar las pruebas de fusión de borradores y del backend.
2. Desplegar sin migración de datos.
3. Revertir la regla de fusión si se detecta un efecto no previsto; no hay cambios persistentes de esquema.
