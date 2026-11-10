## Purpose

Permite que las categorías personalizadas conserven nombres correctos por idioma y que las personas las seleccionen en el chat usando la etiqueta que ven según su preferencia lingüística.

## ADDED Requirements

### Requirement: Selección conversacional localizada
El sistema SHALL presentar categorías y subcategorías en las solicitudes de aclaración usando la etiqueta del idioma preferido de la persona usuaria. Al recibir una respuesta de selección, el sistema MUST resolver categorías, subcategorías y rutas usando esa misma etiqueta localizada, ignorando diferencias de mayúsculas, acentos y espacios de formato.

#### Scenario: Persona con idioma español selecciona una categoría localizada
- **WHEN** el chat solicita una categoría a una persona cuyo idioma preferido es español y recibe el nombre español de una categoría disponible
- **THEN** el sistema guarda el movimiento con esa categoría sin solicitar que se responda el nombre canónico en inglés

#### Scenario: Persona con idioma inglés selecciona una ruta localizada
- **WHEN** el chat presenta alternativas a una persona cuyo idioma preferido es inglés y recibe una ruta de categoría y subcategoría en inglés
- **THEN** el sistema resuelve la ruta correspondiente y guarda la selección correcta

#### Scenario: Etiqueta de otro idioma no coincide con la selección activa
- **WHEN** una respuesta contiene únicamente la etiqueta de una categoría en un idioma distinto del idioma preferido de la persona
- **THEN** el sistema no la utiliza como una coincidencia automática de la selección pendiente y solicita una respuesta válida

### Requirement: Nombres manuales de categorías personalizadas
El sistema SHALL permitir que una persona autenticada vea y edite los nombres español e inglés de una categoría o subcategoría personalizada de su cuenta activa. Al guardar los dos nombres, el sistema MUST marcarlos como traducción manual y MUST conservarlos frente a procesos de traducción automática posteriores.

#### Scenario: Corrección de una traducción automática equivocada
- **WHEN** una persona reemplaza el nombre español generado automáticamente de una categoría personalizada por un nombre elegido por ella
- **THEN** las vistas y conversaciones en español muestran el nombre corregido y no la traducción automática anterior

#### Scenario: Protección de categorías predeterminadas
- **WHEN** una persona intenta editar los nombres localizados de una categoría predeterminada o de una categoría fuera de su cuenta activa
- **THEN** el sistema rechaza la operación sin modificar ninguna categoría

### Requirement: Creación localizada de categorías personalizadas
El sistema SHALL tratar el nombre escrito al crear una categoría personalizada como el nombre del idioma activo de la persona. Si falta la etiqueta del otro idioma, el sistema MAY completar esa etiqueta mediante el mecanismo de traducción existente, pero MUST permitir que la persona la corrija posteriormente.

#### Scenario: Crear una categoría en español
- **WHEN** una persona que usa español crea la categoría personalizada "Gas"
- **THEN** la categoría conserva "Gas" como su etiqueta en español y se muestra como "Gas" en la biblioteca y el chat en español

