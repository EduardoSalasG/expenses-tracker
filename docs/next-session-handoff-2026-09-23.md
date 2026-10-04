# Handoff — 2026-09-23

## Presupuesto comunicado

- Ventana de cinco horas: 94 % disponible al comenzar esta continuidad.

## Trabajo terminado en árbol local, pendiente de verificación y commit

- Cambio OpenSpec `harden-app-ui-accessibility`:
  - Labels accesibles bilingües, iconos decorativos, skip links con foco real en login/términos/privacidad, estados vacíos recuperables y regla de movimiento reducido no vestibular.
  - Matriz Playwright local en `frontend/e2e/accessibility-matrix.spec.ts`: 33 casos para rutas públicas/autenticadas, 320/390/escritorio, skip-focus, vacío recuperable y media feature reducida.
  - Pruebas focalizadas pasaron para skip focus, ruta autenticada de gastos, movimiento reducido y recuperación de filtros. La corrida global aún no se ha registrado como final.
  - El detector Impeccable sólo informó avisos preexistentes de Inter y una franja lateral de Configuración.
- Cambio OpenSpec `make-landing-search-ready`:
  - Se añadió la prueba roja `frontend/e2e/landing-prerender-output.spec.ts`; hoy falla porque `dist/frontend/browser/en/index.html` no existe.
  - Se incorporó Angular SSR/prerender a 19.2.21 y el generador creó `main.server.ts`, `server.ts`, configuración de servidor y ajustes de Angular.
  - Se creó `src/app/app.config.ts` extrayendo sin cambios los providers que estaban en `main.ts`; `tsc -p frontend/tsconfig.app.json --noEmit` pasa.
  - Falta configurar rutas `/en`, metadatos absolutos/localizados, prerender explícito, robots/sitemap, Netlify y pruebas de salida.

## Hallazgos y bloqueos

- El build normal dentro del sandbox falla falsamente con `Cannot read directory "../../.."` y módulos no resueltos. Usar build elevado para evidencia real.
- El build elevado de prerender fue lanzado pero el receptor de salida se perdió antes de terminar; al momento del handoff `frontend/dist/frontend/browser/en/index.html` sigue ausente. Reejecutar y capturar resultado antes de modificar la configuración adicional.
- La prueba de vacío inicialmente fue bloqueada por el overlay de onboarding; el fixture Playwright marca sus flows como `done` sólo en `localStorage`, sin cambiar código de producto.
- No usar datos ni credenciales productivas. La matriz autenticada intercepta `/api` y usa una fixture equivalente al seed local. Para pruebas backend manuales: `pnpm dev:db`, `pnpm db:bootstrap`, `pnpm db:seed`.
- No hay autorización para release, merge a `main`, tag ni deploy.

## Próximo slice

1. Confirmar build SSR/prerender elevado y diagnosticar cualquier fallo real.
2. Añadir `/en` como ruta pública estable y hacer la landing derivar idioma de URL sin romper selector, guardias ni CTAs.
3. Centralizar URL pública por entorno y generar canonical, alternates, OG/Twitter y `lang` por ruta.
4. Añadir `robots.txt`, sitemap y reglas Netlify específicas antes del fallback.
5. Ejecutar build, inspeccionar HTML prerenderizado y completar la matriz SEO/UX; luego marcar sólo tareas OpenSpec realmente completas.

## Estado Git

- Rama: `dev`.
- Hay cambios locales deliberados de accesibilidad, Playwright y prerender; no se ha hecho commit de esta continuidad.
- `pnpm run version:sync` se ejecutó para reparar el formato exigido por `version:check`; por eso `backend/package.json` y `frontend/src/app/generated/app-version.ts` pueden aparecer modificados aunque la versión se mantiene en `0.3.3`.

## Actualización — prerender, SEO y regresión accesible

- `make-landing-search-ready`: 9/11 tareas verificadas.
  - El build de producción genera solamente `/` y `/en` como rutas prerenderizadas públicas; no genera HTML de las rutas autenticadas.
  - La URL pública de producción está en `frontend/src/environments/public-site.ts`; canonical, `hreflang`, Open Graph, Twitter, sitemap y robots se derivan o validan contra ella.
  - `frontend/e2e/landing-prerender-output.spec.ts` pasó con las dos variantes, sus metadatos, recursos de descubrimiento y copy responsable.
  - `netlify.toml` resuelve `/en`, headers de recursos y el fallback. El preview local sigue bloqueado: `@netlify/angular-runtime@4.0.0` exige Node `>=22.22` y esta sesión usa `22.13.1`. No actualizar Node global ni interpretar esto como fallo productivo sin una decisión explícita.
  - Quedan 2.3 (preview local con runtime compatible) y 4.2 (HTTP público tras deploy autorizado).
- `harden-app-ui-accessibility`: 12/13 tareas verificadas.
  - Se corrigió un overflow real del dashboard a 320 px: las tarjetas de gráficos heredaban el ancho intrínseco de canvas. `min-width: 0` permite encogerlas sin ocultar contenido.
  - La matriz Playwright ahora cubre `/en`, error recuperable de acceso, banco largo en filtros y recorrido por teclado de Catálogos. La ejecución combinada de 41 casos terminó sin directorios de fallo de Playwright; los dos casos añadidos después se verificaron focalmente.
  - Permanece 5.2: pasada manual de modo oscuro y lector de pantalla nativo.
- Evidencia local adicional: `pnpm --filter @expenses-tracker/frontend build --configuration production` pasó y prerenderizó 2 rutas; informa únicamente el warning existente de presupuesto inicial (1.43 MB frente a aviso 1.15 MB, bajo el máximo de error de 1.5 MB). `tsc --noEmit`, `openspec validate` de ambos cambios y `git diff --check` pasaron.

## Actualización — cierre de revisión técnica y QA automatizada

- Presupuesto comunicado más reciente: 42 % de la ventana de cinco horas.
- Revisión técnica independiente: no detectó críticos. Se corrigieron dos hallazgos importantes:
  - `netlify.toml` normaliza `/en/` hacia la URL canónica `/en` antes del fallback y fija `NODE_VERSION = "22.22.0"`, compatible con `@netlify/angular-runtime`.
  - `LoginComponent` protege `sessionStorage` con `isPlatformBrowser`; `CommonEngine` recibe una allowlist cerrada de `localhost`, `127.0.0.1` y el host público. Tras build fresco, `GET /login?accountInvitationToken=ssr-proof` en el SSR local devolvió `200`, incluyó `ng-server-context` y no registró errores de `sessionStorage` ni fallback CSR.
- QA automatizada fresca: la matriz Playwright completa terminó con `status: passed`, 44 casos y sin fallos. Incluye smoke de tema oscuro a 390 px, además de los contratos públicos/autenticados en 320/390/escritorio.
- Sigue pendiente de forma honesta: revisión visual manual en oscuro + lector de pantalla nativo (OpenSpec a11y 5.2); preview `netlify dev` en una máquina con Node 22.22+ (SEO 2.3); y evidencia HTTP pública posterior a un deploy autorizado (SEO 4.2). No hay autorización registrada en esta continuidad para deploy, promoción a `main` o tag.
