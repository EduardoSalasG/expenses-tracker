## Why

La conversación financiera muestra categorías en el idioma preferido, pero al responder una aclaración sólo resuelve el nombre canónico y un conjunto limitado de alias. Además, una traducción automática equivocada de una categoría personalizada no puede corregirse desde el producto.

## What Changes

- Localizar las opciones, rutas y coincidencias de categoría del chat según el idioma preferido de la persona usuaria.
- Hacer que el flujo conversacional resuelva la etiqueta correspondiente a ese idioma, sin depender de nombres canónicos en inglés.
- Añadir edición explícita de los nombres español e inglés de categorías personalizadas.
- Exponer una API protegida para guardar esas etiquetas como traducciones manuales y evitar que procesos automáticos posteriores las reemplacen.
- Permitir que la creación de una categoría personalizada guarde explícitamente el nombre escrito para el idioma activo y complete la otra etiqueta mediante la traducción automática existente cuando sea necesario.

## Capabilities

### New Capabilities

- `localized-custom-categories`: Etiquetas localizadas y editables de categorías personalizadas en la biblioteca y en la conversación financiera.

### Modified Capabilities

- Ninguna.

## Impact

- Backend: interpretación de mensajes, casos de uso financieros, contrato HTTP, validación y repositorios de categorías.
- Frontend: biblioteca de categorías, diálogo de creación/edición, cliente API e internacionalización.
- Pruebas: casos de selección conversacional por idioma, persistencia manual de traducciones y UI accesible para editarlas.
