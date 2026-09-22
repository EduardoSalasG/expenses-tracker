## Purpose

Hace que la landing pública bilingüe sea descubrible y representada de forma fiel por buscadores y plataformas que consumen HTML estático.

## ADDED Requirements

### Requirement: Landing prerenderizada por idioma
El sitio público SHALL entregar una representación HTML prerenderizada de la landing en español e inglés. Cada representación MUST declarar el idioma correcto, contener una sola jerarquía principal de contenido y conservar los enlaces y CTAs públicos funcionales sin requerir JavaScript para descubrirlos.

#### Scenario: Rastreo de la landing en español
- **WHEN** un rastreador solicita la URL pública española sin ejecutar JavaScript
- **THEN** recibe título, descripción, encabezado principal, contenido y enlaces públicos en español

#### Scenario: Rastreo de la landing en inglés
- **WHEN** un rastreador solicita la URL pública inglesa sin ejecutar JavaScript
- **THEN** recibe título, descripción, encabezado principal, contenido y enlaces públicos en inglés

### Requirement: Metadatos públicos canónicos y alternativos
Cada variante pública SHALL publicar un canonical absoluto, alternates `hreflang` bidireccionales, título y descripción por idioma, y metadatos Open Graph y Twitter coherentes con la misma URL canónica.

#### Scenario: Compartir una landing localizada
- **WHEN** una plataforma inspecciona una URL pública localizada
- **THEN** obtiene título, descripción, tipo de contenido y URL canónica del mismo idioma sin mezclar metadatos de la otra variante

### Requirement: Recursos de descubrimiento reales
El despliegue público MUST servir un `robots.txt` y un sitemap XML estáticos, con contenido correspondiente al archivo solicitado y no el fallback HTML de la SPA. El sitemap SHALL enumerar las variantes públicas canónicas que pueden indexarse.

#### Scenario: Rastreo de recursos de descubrimiento
- **WHEN** un rastreador solicita `robots.txt` o el sitemap
- **THEN** recibe el tipo y contenido textual/XML esperado, incluyendo la referencia al sitemap desde `robots.txt`

### Requirement: Persuasión pública responsable
La landing SHALL presentar beneficios verificables, control de la persona usuaria y Telegram como opción explícita. MUST no atribuir testimonios, métricas sociales, escasez, urgencia ni garantías de privacidad que no estén verificadas en el producto y su documentación pública.

#### Scenario: Evaluar el mensaje de conversión
- **WHEN** una persona visita la landing o un revisor inspecciona su HTML prerenderizado
- **THEN** puede comprender el beneficio, crear cuenta o iniciar sesión sin presión engañosa ni afirmaciones no demostrables
