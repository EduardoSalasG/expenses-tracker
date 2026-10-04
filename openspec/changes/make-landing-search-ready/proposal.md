## Why

La landing comunica correctamente el producto en el navegador, pero el HTML inicial sigue siendo genérico y no entrega a rastreadores una descripción, idioma, canonical, enlaces alternativos ni recursos de descubrimiento reales. Un prerender estático bilingüe convierte la promesa pública ya aprobada en una superficie indexable, rápida y verificable sin introducir un servidor SSR.

## What Changes

- Prerenderizar la landing pública en español e inglés, entregando HTML con contenido, idioma y metadatos correctos para cada variante.
- Publicar `robots.txt` y sitemap XML reales, además de canonical, `hreflang`, Open Graph y Twitter Cards consistentes con la URL pública de producción.
- Mantener las rutas, CTAs, parámetros de registro, selector de idioma y contenido actual; no inventar prueba social, escasez ni promesas de privacidad no verificables.
- Medir el HTML de salida y la experiencia de teclado/responsividad para confirmar que el contenido indexable conserva una sola jerarquía semántica y enlaces públicos válidos.

## Capabilities

### New Capabilities
- `public-search-discovery`: Descubrimiento e indexación verificables de las rutas públicas bilingües.

### Modified Capabilities

- Ninguna.

## Impact

- Frontend Angular: configuración de build/prerender, rutas públicas, `index.html`, metadatos de landing y activos estáticos de descubrimiento.
- Hosting: la configuración de publicación debe servir los artefactos estáticos generados sin redirecciones SPA que sustituyan `robots.txt` o sitemap.
- No cambia backend, autenticación, base de datos, APIs, contenido financiero ni datos productivos.
