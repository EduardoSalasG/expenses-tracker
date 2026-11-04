# Handoff — excluir registrador de push de gastos compartidos — 2026-11-04

## Presupuesto y estado

- Presupuesto informado por el usuario: 98% de la ventana de cinco horas.
- Rama objetivo: `dev`.
- Cambio OpenSpec: `exclude-expense-creator-push`.

## Trabajo completado

- Las notificaciones push de un gasto en una cuenta compartida excluyen ahora todas las suscripciones del usuario que registró el gasto.
- La identidad excluida es el `userId` del registrador, no el usuario que figura como pagador.
- Las cuentas personales no encolan estas notificaciones y los fallos de entrega siguen sin afectar la persistencia del gasto.
- Se añadió una prueba de regresión con dos suscripciones del registrador y una de otro miembro activo; solo la del otro miembro se encola.

## Evidencia de verificación

- La prueba de regresión falló antes del ajuste con 3 entregas en vez de 1 y pasó después; se reintrodujo temporalmente el defecto para comprobar su sensibilidad.
- `pnpm --filter @expenses-tracker/backend test`: 201 pruebas correctas; 8 pruebas de integración omitidas.
- `pnpm --filter @expenses-tracker/backend lint`: correcto.
- `pnpm --filter @expenses-tracker/backend build`: correcto.
- `openspec validate exclude-expense-creator-push --strict`: correcto.

## Próximo slice y brechas conocidas

- Revisar y confirmar el commit de este cambio en `dev`.
- Antes de una promoción, seleccionar el incremento SemVer, actualizar changelog y version manifests, y completar revisión, QA funcional y release gate.
