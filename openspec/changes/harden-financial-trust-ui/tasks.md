## 1. Pruebas de contrato de confianza

- [ ] 1.1 Añadir pruebas unitarias primero para el resumen localizado de filtros de gastos, incluida la ruta categoría / subcategoría y los fallbacks, y verificar que fallan antes de implementar el selector derivado.
- [ ] 1.2 Añadir pruebas de plantilla para la divulgación semántica de filtros de Ingresos y los nombres accesibles de eliminación en Configuración, y verificar que fallan contra la implementación actual.

## 2. Contexto verificable de gastos

- [ ] 2.1 Implementar el resumen derivado de filtros efectivos sin cambiar la serialización ni los parámetros URL existentes; verificar las pruebas de filtros de Gastos y que la combinación de subcategoría, banco y período sigue enviando sólo los criterios actuales.
- [ ] 2.2 Mostrar la ruta completa de clasificación en las filas y tarjetas de Gastos, con fallback localizado y prioridad visual móvil; verificar las pruebas de etiqueta y ausencia de overflow horizontal a 320 px.
- [ ] 2.3 Diferenciar las etiquetas visibles/localizadas de opción de medio y tipo de medio de pago cuando ambos filtros estén disponibles; verificar que cada control conserva su valor y etiqueta correctos.

## 3. Divulgación y acciones accesibles

- [ ] 3.1 Migrar los filtros secundarios de Ingresos al componente de divulgación compartido, preservando el identificador de onboarding, estado inicial para filtros activos y deep links; verificar las pruebas de Ingresos y la navegación por teclado.
- [ ] 3.2 Corregir los icon-buttons destructivos de bancos y medios de pago para usar el nombre accesible localizado de eliminación, sin alterar confirmaciones ni llamadas API; verificar la prueba de Configuración.

## 4. Verificación integrada

- [ ] 4.1 Ejecutar las pruebas unitarias afectadas y `pnpm --filter @expenses-tracker/frontend build`; verificar salida exitosa sin errores TypeScript ni de plantilla.
- [ ] 4.2 Realizar QA de escritorio, 390 px y 320 px: filtros combinados, resumen de valores, tarjeta con banco largo, teclado/foco, modo oscuro y `prefers-reduced-motion`; registrar evidencia y cualquier limitación.
- [ ] 4.3 Actualizar los artefactos OpenSpec con el estado real de las tareas y preparar el commit en `dev`; verificar `openspec validate harden-financial-trust-ui --strict` y `git status` sin cambios ajenos.
