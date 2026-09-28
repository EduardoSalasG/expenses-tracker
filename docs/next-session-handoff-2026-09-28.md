# Handoff — 2026-09-28

## Presupuesto comunicado

- Ventana de cinco horas: 99 % disponible al iniciar esta continuidad.

## Trabajo completado en árbol local, pendiente de revisión y commit

- OpenSpec `refine-conversion-and-private-ux`: 12/12 tareas marcadas completas.
  - Landing localizado, metadatos SSR y salida prerenderizada cubiertos en ES/EN.
  - Telegram utiliza controles hermanos y un diálogo Material con foco inicial, Escape y retorno al activador.
  - Dashboard incorpora divulgación progresiva de analítica y CTA contextual que preserva el período.
  - Gastos e ingresos priorizan período, resultado y creación; ingresos muestra filtros activos eliminables en móvil.
  - Estados vacíos privados, foco, objetivos táctiles y movimiento reducido quedaron cubiertos por la matriz de accesibilidad.
  - El proxy de desarrollo ahora elimina el prefijo `/api` antes de reenviar al backend local en 3100, de modo que el stack demo permite probar las rutas privadas.

- OpenSpec `period-scoped-shared-account-summary`: 5/5 tareas completadas, pendiente de revisión y commit.
  - Las cuentas compartidas reemplazan ingresos y balance neto por “Tu saldo del período”.
  - El saldo se deriva de la persona autenticada y del rango mensual/anual activo; comunica “Debe”, “A favor” o “Al día” con importes absolutos y por moneda.
  - Las cuentas personales conservan sus cuatro métricas actuales sin cambios.
  - Corrección posterior de regresión: la tarjeta de cabecera también usa el saldo del período en cuentas compartidas; antes conservaba un balance neto negativo aunque las tarjetas de salud ya estaban correctas.

## Evidencia

- `pnpm --filter @expenses-tracker/frontend exec playwright test landing-prerender-output.spec.ts --reporter=line`: 4 passed.
- Prueba Playwright focalizada de Telegram: passed; prueba de componente del diálogo: 1 success.
- Prueba Playwright focalizada de divulgación analítica: passed.
- Prueba Playwright focalizada de estado vacío contextual: passed.
- `pnpm --filter @expenses-tracker/frontend exec ng test --watch=false --include src/app/features/dashboard.component.spec.ts`: 12 success.
- `pnpm --filter @expenses-tracker/frontend test`: 70/70 success.
- `pnpm --filter @expenses-tracker/frontend exec playwright test --reporter=line`: 48 passed.
- `pnpm --filter @expenses-tracker/frontend build --configuration production`: successful; SSR prerendered `/` and `/en`.
- `openspec validate refine-conversion-and-private-ux --strict`: passed.
- QA manual con base demo local: landing, registro/autenticación privada, dashboard, diálogo Telegram y la vista de ingresos a 320 px. Se verificó el resumen de filtros activos y su eliminación. No se abrió el enlace externo de Telegram.
- El sandbox bloquea Angular/Playwright con errores de lectura de dependencias; la verificación real se ejecutó elevada. Persiste el warning no bloqueante de presupuesto inicial de bundle en el build de producción.
- `pnpm --filter @expenses-tracker/frontend test`: suite unitaria completa aprobada.
- Prueba Playwright focalizada a 320 px: cuenta compartida con saldo de deuda muestra “Debe $5.000”, no muestra ingresos ni balance neto, y mantiene el comportamiento al pasar a anual.
- `pnpm --filter @expenses-tracker/frontend build --configuration production`: SSR de producción completado; prerender actualizado.
- `openspec validate period-scoped-shared-account-summary --strict`: passed; detector Impeccable sin hallazgos.
- Reproducción manual en “Casa · Compartida”, agosto de 2026: la cabecera inicialmente mostró `Balance neto -$181.360`; tras la corrección por HMR muestra `Tu saldo del período · A favor $28.000`. El caso Playwright de regresión a 320 px terminó passed (1/1).

## Pendiente

1. Revisar y hacer commit coherente en `dev` del resumen de cuenta compartida; no hay autorización para promoción, tag o deploy.
2. La comprobación de cuenta compartida se cubrió con un fixture Playwright a 320 px; una sesión manual con datos compartidos reales queda opcional si se requiere inspección visual adicional.
3. Si se desea persistir el stack demo, normalizar la configuración local de la base de datos; para esta QA se usó el puerto expuesto por Docker de forma temporal.

## Estado Git

- Rama: `dev`; no hay autorización para deploy, promoción a `main`, tag o release.
- El árbol contiene cambios locales deliberados de accesibilidad/SEO y los cambios de este slice; todavía no hay commit. No se debe mezclar trabajo ajeno sin revisión al preparar el commit.
