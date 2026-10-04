## 1. Landing de conversión y descubrimiento

- [x] 1.1 Simplificar la jerarquía, el copy localizado, las CTA y los ejemplos ilustrativos del landing; verificar en ES/EN que exista un resultado principal, una CTA primaria y ejemplos coherentes con el idioma.
- [x] 1.2 Incorporar asset social estático, `og:image` y JSON-LD localizado compatible con SSR; verificar el HTML prerenderizado de `/` y `/en` y que no se indexen rutas autenticadas.
- [x] 1.3 Ampliar las pruebas de landing para copy, semántica, canon, datos estructurados, imagen social y ausencia de persuasión no verificable; ejecutar la suite Playwright correspondiente.

## 2. Accesibilidad de mensajería privada

- [x] 2.1 Reemplazar el aviso interactivo anidado de Telegram por controles hermanos con nombres accesibles; verificar navegación por Tab, Enter y espacio sin control dentro de control.
- [x] 2.2 Extraer el detalle de Telegram a un diálogo de Angular Material con foco inicial, Escape y retorno al activador; verificarlo mediante prueba de componente y flujo Playwright.

## 3. Jerarquía del dashboard

- [x] 3.1 Implementar una divulgación progresiva para los gráficos después del resumen y prioridades, conservando tablas equivalentes y redimensionamiento correcto de Chart.js; verificar apertura, gráficos visibles y tablas navegables.
- [x] 3.2 Ajustar estados sin datos del dashboard hacia una acción localizada y contextual; verificar con pruebas unitarias que no se pierdan cuenta ni período activos.

## 4. Superficies financieras privadas

- [x] 4.1 Reordenar gastos e ingresos para mostrar período, resultado y creación antes de filtros secundarios, manteniendo filtros aplicados visibles, eliminables y serializados en URL; verificar filtros combinados y vista de 320 px.
- [x] 4.2 Mejorar los estados vacíos de presupuestos, categorías y configuración con siguiente acción segura y localizada; verificar cada estado mediante pruebas de componente y datos demo.
- [x] 4.3 Consolidar estilos de jerarquía, foco, objetivos táctiles y movimiento reducido sin introducir valores visuales crudos; verificar foco visible y ausencia de overflow a 320 px.

## 5. Validación integral

- [x] 5.1 Ejecutar pruebas unitarias afectadas y la matriz Playwright de rutas públicas/privadas; corregir regresiones y registrar cualquier cobertura no automatizable.
- [x] 5.2 Ejecutar el build de producción SSR y la validación estricta de OpenSpec; verificar manualmente landing, diálogo Telegram, dashboard y flujos móviles con el stack demo.
