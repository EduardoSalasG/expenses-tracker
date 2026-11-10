## 1. Contrato y persistencia de nombres manuales

- [x] 1.1 Añadir el contrato HTTP autenticado, validación y caso de uso para actualizar ambos nombres de una categoría personalizada accesible, rechazando categorías predeterminadas; verificar con pruebas de controlador y caso de uso.
- [x] 1.2 Separar en los repositorios en memoria y PostgreSQL la actualización manual sobrescribible del enriquecimiento automático por ausencia; verificar que una edición manual persiste y que el traductor automático no la reemplaza.
- [x] 1.3 Asignar el nombre de creación a `nameEs` o `nameEn` según el idioma activo y conservar el fallback del traductor; verificar el caso de creación española de “Gas”.

## 2. Selección conversacional localizada

- [x] 2.1 Centralizar la etiqueta y clave normalizada de categoría para el idioma preferido, con fallback seguro al nombre canónico; verificar acentos, mayúsculas y ausencia de traducción.
- [x] 2.2 Aplicar esa resolución a selección de categoría, subcategoría, rutas y opciones ambiguas del chat; verificar que español acepta la etiqueta española, inglés la inglesa y el idioma alternativo no se acepta automáticamente.
- [ ] 2.3 Actualizar los mensajes de aclaración y creación para mostrar rutas y ejemplos localizados; verificar el contenido de las respuestas de ambos idiomas.

## 3. Biblioteca de categorías y experiencia móvil

- [ ] 3.1 Ampliar el cliente API y los modelos frontend para crear con idioma activo y actualizar nombres manuales; verificar las peticiones y respuestas con pruebas de servicio.
- [ ] 3.2 Añadir una acción de edición para categorías personalizadas y un diálogo accesible con campos español e inglés, estados de carga/error y controles táctiles; verificar el componente y sus interacciones de teclado.
- [ ] 3.3 Revisar la biblioteca en 320 px, ancho móvil representativo y escritorio, incluida reducción de movimiento y etiquetas accesibles; verificar que la acción no degrade la jerarquía ni los objetivos táctiles.

## 4. Verificación y documentación

- [ ] 4.1 Ejecutar las suites backend y frontend afectadas, lint y builds; documentar resultados o brechas explícitas.
- [x] 4.2 Actualizar Swagger y la documentación de categorías/mensajería para el nuevo contrato y comportamiento por idioma; verificar que los ejemplos reflejen la corrección manual.
