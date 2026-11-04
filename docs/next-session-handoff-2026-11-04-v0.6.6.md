# Handoff — release v0.6.6 — 2026-11-04

## Presupuesto y estado

- Presupuesto informado por el usuario: 98% de la ventana de cinco horas.
- Producción: `main` en `v0.6.6`, SHA inmutable `f97cc98b95d5dfd98854bb6973b5faa8af9d7085`.
- Desarrollo: `dev` sincronizado desde `main` en `f97cc98b95d5dfd98854bb6973b5faa8af9d7085`.

## Trabajo completado

- Se promovió la corrección que excluye de las notificaciones push de gastos compartidos a quien los registra, manteniendo a los demás miembros activos suscritos.
- Se publicó PATCH `0.6.6`, con changelog, módulos de versión backend/frontend y notas de release.
- Se publicó el tag anotado `v0.6.6` sobre el SHA de producción.

## Evidencia de verificación y despliegue

- `pnpm run version:check`, suite backend (201 pruebas correctas; 8 integraciones omitidas), suite frontend (93 pruebas correctas), lint y builds completos fueron correctos sobre `main` fusionada.
- Netlify respondió HTTP 200; API `/health/live`, `/health/ready` y Swagger `/api/docs` respondieron HTTP 200.
- GitHub Actions: el run [41862272297](https://github.com/EduardoSalasG/expenses-tracker/actions/runs/41862272297) para el SHA promovido finalizó correctamente.

## Próximo slice y brechas conocidas

- Archivar el cambio OpenSpec `exclude-expense-creator-push` cuando se considere concluida su trazabilidad.
