## Context

Véase `proposal.md` para la motivación y `specs/localized-custom-categories/spec.md` para el contrato observable. El modelo `Category` ya contiene `name`, `nameEs`, `nameEn` y `translationSource`. La creación invoca un traductor automático, pero la API pública y la biblioteca de categorías sólo exponen la creación. La selección conversacional tiene una normalización y tabla de alias independiente de la usada por el intérprete inicial, por lo que pierde las etiquetas localizadas persistidas.

## Goals / Non-Goals

**Goals:**

- Mantener una única semántica de etiqueta localizada para mostrar y resolver categorías en el chat.
- Dar control explícito a quien administra una cuenta sobre ambos nombres de cada categoría personalizada.
- Evitar que una corrección manual sea reemplazada por una traducción automática posterior.
- Conservar la creación rápida: el nombre requerido se captura en el idioma activo y el nombre contrario puede completarse automáticamente.

**Non-Goals:**

- No editar ni renombrar categorías predeterminadas del sistema.
- No modificar categorías ya registradas en movimientos ni sus identificadores.
- No añadir idiomas más allá de español e inglés ni un flujo de revisión masiva de traducciones.

## Decisions

### Resolver etiquetas del idioma activo en la conversación

Las funciones de selección pendiente recibirán el idioma preferido del usuario y construirán las claves de coincidencia sólo con `nameEs` o `nameEn`, con retorno al nombre canónico si falta la traducción. La misma función elegirá las etiquetas de los mensajes y de las rutas. Se reutilizará la normalización sin acentos y sin diferencias de espaciado.

Se descarta aceptar indiscriminadamente los dos idiomas: contradice la expectativa de que la conversación use el idioma preferido y puede hacer que una etiqueta de otro idioma produzca una selección accidental.

### Persistir una edición explícita como traducción manual

Se añadirá una operación de caso de uso y un endpoint autenticado para actualizar simultáneamente `nameEs` y `nameEn` de una categoría personalizada accesible desde la cuenta activa. La operación valida propiedad y prohíbe categorías predeterminadas; después guarda `translationSource: manual`. El repositorio tendrá una ruta de actualización manual que sobrescribe los valores existentes, distinta de la ruta de enriquecimiento automático que sólo completa campos faltantes.

Se descarta reutilizar directamente `updateTranslations`: su contrato actual usa `coalesce` y protege una fila manual, comportamiento adecuado para el traductor pero incorrecto para una corrección solicitada por la persona usuaria.

### Capturar el idioma de creación en el cliente

El diálogo de creación enviará el idioma activo junto con el nombre. El backend asignará ese valor a `nameEs` o `nameEn` antes de solicitar la traducción contrapuesta. Esto garantiza que crear `Gas` desde español conserva literalmente `Gas` como etiqueta española. La edición posterior abrirá un diálogo accesible con dos campos explícitos y controles de guardar/cancelar con objetivos táctiles existentes.

Se descarta inferir el idioma desde el texto de la categoría: palabras cortas como “gas” son ambiguas y ya causaron una traducción semánticamente errónea.

## Risks / Trade-offs

- [Una categoría histórica no tiene ambas etiquetas] → La resolución y presentación usan el nombre canónico como fallback hasta que la traducción esté disponible o se edite.
- [Dos etiquetas localizadas se normalizan igual] → La selección mantiene el flujo de ambigüedad existente y solicita número o ruta completa.
- [El usuario cambia de idioma mientras edita] → Los campos conservan sus identificadores de idioma; el idioma activo sólo define la etiqueta inicial al crear.
- [Una traducción automática tarda o falla] → La categoría se conserva con el nombre solicitado y sigue siendo editable; no se bloquea la creación.

## Migration Plan

1. Desplegar el contrato de actualización y la persistencia manual de forma compatible con las filas existentes.
2. Desplegar la biblioteca de categorías y el flujo conversacional que usan las etiquetas localizadas con fallback.
3. Verificar creación en español, corrección manual y selección conversacional en ambos idiomas.
4. Rollback: retirar el cliente y endpoint nuevos; las columnas existentes y las traducciones manuales permanecen seguras y la aplicación anterior usa el nombre canónico.
