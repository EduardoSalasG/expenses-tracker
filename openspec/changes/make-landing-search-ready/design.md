## Context

La landing Angular actual actualiza metadatos en cliente, mientras `index.html` entrega idioma, título y descripción genéricos. El build de aplicación no configura prerender ni recursos estáticos de descubrimiento. La decisión aprobada es prerender estático bilingüe, no SSR.

## Goals / Non-Goals

**Goals:**

- Generar HTML público indexable por idioma con metadatos y enlaces alternativos consistentes.
- Publicar recursos de descubrimiento estáticos que el hosting no reescriba hacia la SPA.
- Mantener la persuasión responsable y la experiencia actual de rutas/CTAs.

**Non-Goals:**

- No añadir servidor SSR, CMS, analítica invasiva, contenido inventado ni una dependencia de backend.
- No indexar rutas autenticadas, enlaces con token ni datos privados.

## Decisions

### Prerender estático de rutas públicas localizadas

El build declarará las rutas públicas de landing en español e inglés y producirá HTML por ruta. Es suficiente para contenido estable, entrega metadatos al primer byte y evita infraestructura SSR. Se descarta renderizar metadatos sólo en cliente porque los rastreadores no están obligados a ejecutar la SPA.

### Variante inglesa con URL canónica explícita

La variante española conservará `/` y la inglesa usará una ruta pública estable `/en`; ambas publicarán canonical absoluto, alternates recíprocos y un `x-default` definido. Se descarta resolver idioma únicamente por navegador porque no produce una URL indexable y compartible por idioma.

### Fuente única de URLs públicas

La URL de sitio se configurará explícitamente por entorno de build y alimentará canonical, sitemap y metadatos. El build fallará o verificará ausencia de placeholder en producción. Se descarta hardcodear el dominio en múltiples plantillas, que divergirían entre previews y producción.

### Recursos estáticos primero

`robots.txt`, sitemap y, si corresponde, imagen social se publicarán como assets estáticos y se comprobarán después del build. La configuración de hosting preservará esos paths antes del fallback SPA. Se descarta generar esos recursos exclusivamente en tiempo de cliente.

### Mensaje de conversión verificable

Las afirmaciones se extraerán de funcionalidades existentes y textos legales públicos; no se introducirán métricas o testimonios sin fuente. Este límite implementa influencia responsable: contexto y autonomía antes que presión.

## Risks / Trade-offs

- [Un prerender ejecuta una guardia dependiente de navegador] → adaptar guardias y servicios para plataforma de servidor sin relajar autenticación en cliente.
- [El hosting reescribe archivos públicos a `index.html`] → añadir regla explícita y prueba HTTP post-deploy antes de promover release.
- [La URL pública de producción cambia] → centralizar la variable y fallar la verificación si canonical/sitemap no coinciden con ella.
- [Duplicación de contenido por idioma] → usar canonical propio y `hreflang` bidireccional con idioma declarado en HTML.

## Migration Plan

1. Añadir pruebas de metadatos/HTML estático y una validación de `robots.txt` y sitemap en build local.
2. Incorporar prerender, rutas localizadas y assets estáticos sin cambiar las rutas autenticadas.
3. Verificar salida de build, HTML sin JavaScript, teclado y tamaños móvil/escritorio.
4. En release, comprobar recursos y canonical públicos antes de cerrar el despliegue; rollback mediante el artefacto frontend anterior.
