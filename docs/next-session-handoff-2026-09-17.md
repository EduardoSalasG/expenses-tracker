# Handoff de próxima sesión — 2026-09-17

## Presupuesto y enfoque

- Último presupuesto reportado: `161k / 258k` tokens (la cifra es saldo de tokens, no porcentaje).
- La persona usuaria priorizó seguir el desarrollo y pospuso el diagnóstico del desfase productivo en `Others > Subscriptions`.

## Estado de ramas y árbol

- Rama activa: `dev`.
- Commits recientes: `161525b feat: add accessible dashboard chart alternatives` y `6f4491f fix: align accessible dashboard chart data`.
- Árbol de trabajo limpio al registrar este handoff.
- No promover `dev -> main`: la ventana de release sigue pendiente de QA real y del gate de release.

## Trabajo completado

- OpenSpec `mobile-accessible-app-shell`: 9/9 tareas completas y validación estricta aprobada. Aún no se archiva, porque falta decidir explícitamente si se sincronizan sus tres delta specs al catálogo principal antes de moverlo al archivo.
- Shell móvil: skip link, foco predecible para el menú Más, controles táctiles y reduced motion.
- Dashboard: alternativas textuales colapsables para seis familias de gráficos.
- Corrección posterior: las filas textuales de categoría ahora usan el mismo agregado por categoría/moneda y el mismo orden que Chart.js; el flujo de caja usa claves de traducción ES/EN existentes.

## Evidencia de verificación

- Prueba roja registrada: la alternativa textual devolvía dos filas de subcategorías donde Chart.js mostraba un único total, y devolvía la clave literal `dashboard_income`.
- Verde: `pnpm --filter @expenses-tracker/frontend exec ng test --watch=false --browsers=ChromeHeadless --include=src/app/features/dashboard.component.spec.ts` — 4/4 aprobadas.
- Build: `pnpm --filter @expenses-tracker/frontend build` — aprobado.
- OpenSpec: `openspec validate mobile-accessible-app-shell --strict` — aprobado.

## Cambios OpenSpec pendientes

- `release-version-traceability`: 9/11. Faltan QA visual real de Settings en 320 px/móvil/escritorio y el gate de promoción/versionado/tag/CI/Netlify/health.
- `atomic-design-system-dashboard`: sin tareas; es el siguiente bloque grande recomendado porque consolida tokens/componentes y transforma el dashboard en una superficie accionable, aprovechando el trabajo móvil ya realizado.
- `durable-webhook-operations`: sin tareas; alternativa backend grande para cola durable, deduplicación, reintentos, DLQ y observabilidad.

## Caso productivo diferido

- Las consultas del dashboard suman cuotas por `due_date`; la lista de gastos también proyecta cuotas, pero puede divergir por cuenta activa, rango, categoría/subcategoría o límite de resultados.
- No se hizo ninguna mutación ni corrección. Para retomarlo, solicitar mes, cuenta activa y referencia/concepto del cargo de aproximadamente $19.000, o autorización para una inspección de solo lectura del entorno productivo.
