# Inventario de accesibilidad por ruta — 2026-09-22

## Alcance

Rutas declaradas en `frontend/src/app/app.routes.ts`, revisadas contra semántica, nombres accesibles, estados y comportamiento responsive. El inventario usa datos de código y una matriz Playwright local; no consulta datos productivos.

| Ruta | Superficie | Contratos revisados | Estado inicial | Acción de esta entrega |
| --- | --- | --- | --- | --- |
| `/` y `/en` | Landing localizada | landmark, salto, selector de idioma, CTAs, preview ilustrativo | Base sólida; iconos de capacidades decorativos | Ocultar iconos decorativos al lector de pantalla y verificar ambas variantes |
| `/login` | Acceso/registro | retorno, formularios, error/estado, foco | Inicio hardcodeado y sin salto | Localizar inicio y añadir skip target |
| `/terms` | Términos | jerarquía pública, retorno, foco | `header` dentro de `main`, retorno ambiguo | Separar landmarks, añadir salto y retorno explícito |
| `/privacy` | Privacidad | jerarquía pública, retorno, foco | Igual que términos | Separar landmarks, añadir salto y retorno explícito |
| `/dashboard` | Resumen | período, gráficos, prioridades, diálogos | Labels de gráficos/período en inglés | Localizar etiquetas y ocultar iconos decorativos |
| `/expenses` | Gastos | filtros, resumen, tabla, vacío | Labels de filtro en inglés; vacío sin recuperación | Localizar y ofrecer limpiar filtros |
| `/incomes` | Ingresos | filtros, tabla, vacío | Mes en inglés; vacío sin recuperación | Localizar y ofrecer limpiar filtros |
| `/budgets` | Presupuestos | formulario, estado, progreso | Labels de categoría/subcategoría en inglés | Localizar etiquetas |
| `/categories` | Categorías | búsqueda, filtros, vacío | Ya localizado y con feedback | Mantener; comprobar en matriz de navegador |
| `/settings` | Configuración | secciones, catálogos, acciones destructivas | Iconos de botones redundantes | Marcar iconos decorativos |

## Criterios de cierre de navegador

- Cada ruta se probará a 320 px, 390 px y escritorio, sin overflow horizontal.
- Se recorrerán los controles primarios con teclado y se comprobará foco visible.
- Gastos e ingresos ejercitarán filtro con cero resultados y la recuperación mediante `Limpiar`.
- Tema claro, oscuro y movimiento reducido se registrarán explícitamente, incluyendo limitaciones de emulación.

## Matriz automática local

`frontend/e2e/accessibility-matrix.spec.ts` verifica las cinco rutas públicas y las seis autenticadas a 320 px, 390 px y escritorio. Para rutas autenticadas instala una sesión demo con respuestas controladas equivalentes al perfil y cuenta creados por `database/seeds/001_demo.sql`; así no transmite ni modifica datos productivos.

La ejecución es reproducible y levanta Angular si no hay un servidor ya disponible:

```bash
pnpm --filter @expenses-tracker/frontend run test:e2e
```

La base de datos demo real continúa siendo optativa y local para pruebas manuales o de contrato backend:

```bash
pnpm dev:db
pnpm db:bootstrap
pnpm db:seed
```

La matriz comprueba el salto a contenido principal, el foco real en `main`, el ancho sin overflow, el vacío recuperable de gastos, el error de acceso recuperable, un banco de nombre largo, `prefers-reduced-motion` y un smoke de tema oscuro emulados por Playwright. La ejecución del 2026-09-23 pasó 44 casos sin datos productivos. La emulación oscura valida viewport, contenido y colores base; no sustituye una revisión visual manual ni una pasada con lector de pantalla nativo, que permanecen como limitación explícita.
