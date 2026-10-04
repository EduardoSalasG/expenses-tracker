## 1. Base de rutas y renderizado estático

- [x] 1.1 Añadir pruebas que describan la landing española e inglesa sin JavaScript, incluidas una sola jerarquía principal, idioma, enlaces y CTAs; verificar que fallan antes de configurar prerender.
- [x] 1.2 Configurar rutas públicas estables para `/` y `/en` y prerender estático compatible con guardias y servicios existentes; verificar que el build genera HTML distinto y localizado para ambas rutas sin afectar rutas autenticadas.
- [x] 1.3 Centralizar la URL pública por entorno de build y fallar o validar la ausencia de placeholders en artefactos de producción; verificar canonical absoluto generado desde una única fuente.

## 2. Metadatos y descubrimiento

- [x] 2.1 Generar título, descripción, `lang`, canonical, `hreflang`, Open Graph y Twitter Cards coherentes para cada variante; verificar el HTML de salida con pruebas de metadatos y una inspección sin JavaScript.
- [x] 2.2 Publicar `robots.txt` y sitemap XML estáticos con URLs canónicas indexables; verificar sus tipos y contenidos después del build, sin fallback HTML de SPA.
- [ ] 2.3 Ajustar la configuración de hosting para que rutas prerenderizadas, `robots.txt` y sitemap se sirvan antes del fallback SPA; verificar la configuración en preview/local y documentar la comprobación post-deploy.

## 3. Mensaje y experiencia pública responsable

- [x] 3.1 Revisar el contenido de landing contra funcionalidades y textos legales verificables, conservando Telegram como opción y sin prueba social, escasez, urgencia ni promesas no demostrables; verificar copy bilingüe y CTAs existentes.
- [x] 3.2 Verificar teclado, foco, contraste, 320 px, 390 px, escritorio y movimiento reducido en las dos variantes prerenderizadas; registrar cualquier limitación de emulación.

## 4. Verificación de release

- [x] 4.1 Ejecutar pruebas afectadas, build de producción, detector Impeccable y validación del HTML/recursos generados; verificar salida sin errores de compilación ni metadatos cruzados entre idiomas.
- [ ] 4.2 Tras un deploy autorizado, comprobar por HTTP público `robots.txt`, sitemap, canonical, `hreflang` y HTML prerenderizado de ambas rutas; registrar evidencia antes de cerrar la release.
- [x] 4.3 Actualizar documentación de operación/SEO y los artefactos OpenSpec con el estado real; verificar `openspec validate make-landing-search-ready --strict` y un árbol de trabajo sin cambios ajenos.
