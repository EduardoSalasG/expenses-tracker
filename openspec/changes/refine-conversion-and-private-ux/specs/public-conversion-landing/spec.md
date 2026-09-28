## Purpose

Comunicar el valor de Expenses Tracker de forma breve, localizada y verificable para que una persona pueda decidir crear una cuenta sin presión ni información innecesaria.

## ADDED Requirements

### Requirement: Propuesta pública centrada en el resultado
La landing SHALL comunicar en su encabezado que el producto ayuda a entender cómo se mueve el dinero y a ordenar gastos e ingresos. MUST exponer una acción primaria de creación de cuenta y una alternativa secundaria no competitiva para iniciar sesión o conocer el flujo, con etiquetas localizadas y objetivos táctiles accesibles.

#### Scenario: Persona nueva llega a la landing
- **WHEN** una persona visita la landing en español o inglés
- **THEN** identifica el resultado principal, una acción primaria para crear su cuenta y una alternativa secundaria sin recorrer capacidades redundantes

### Requirement: Confianza pública verificable
La landing SHALL diferenciar los ejemplos ilustrativos de datos reales y MUST mantenerlos coherentes con el idioma mostrado. No SHALL usar urgencia, escasez, testimonios, contadores ni afirmaciones de privacidad o resultados que no estén sustentados por el comportamiento o documentación vigente del producto.

#### Scenario: Revisión de ejemplo y confianza
- **WHEN** una persona revisa la vista previa o los mensajes de confianza de la landing
- **THEN** puede reconocer qué es ilustrativo y no recibe una promesa de producto no verificable

### Requirement: Descubrimiento público enriquecido
Las rutas públicas indexables SHALL conservar canon, idiomas alternativos, robots, sitemap y metadatos sociales localizados. MUST incluir datos estructurados válidos del producto y una imagen social representativa sin indexar rutas autenticadas.

#### Scenario: Rastreador consulta la landing prerenderizada
- **WHEN** un rastreador solicita una ruta pública prerenderizada
- **THEN** recibe título, descripción, canon, alternativa de idioma, metadatos sociales, datos estructurados y una política de indexación coherentes con esa ruta
