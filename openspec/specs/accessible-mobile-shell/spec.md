# accessible-mobile-shell Specification

## Purpose

Garantiza que la navegación autenticada pueda usarse de forma completa con teclado, lector de pantalla y pantalla táctil en tamaños móviles y de escritorio.

## Requirements

### Requirement: Navegación del shell accesible
El shell autenticado SHALL exponer un enlace para saltar al contenido principal, un landmark `main` identificable y navegación con nombres accesibles localizados. El foco MUST llegar al contenido principal después de usar el enlace de salto.

#### Scenario: Salto al contenido principal
- **WHEN** una persona navega con teclado desde el inicio del shell y activa el enlace de salto
- **THEN** el foco queda en el landmark principal sin requerir apuntador

#### Scenario: Navegación móvil etiquetada
- **WHEN** un lector de pantalla recorre la navegación móvil
- **THEN** anuncia una etiqueta localizada para la navegación y un nombre para cada destino

### Requirement: Menú móvil predecible
El menú móvil de destinos secundarios SHALL exponer su estado expandido, mover el foco al primer destino al abrirse y devolverlo a su activador al cerrarse con Escape.

#### Scenario: Abrir y cerrar con teclado
- **WHEN** una persona activa Más con teclado y luego presiona Escape
- **THEN** el menú se abre con foco en su primer destino y se cierra devolviendo el foco al activador

### Requirement: Controles táctiles y responsive
Los destinos principales y el activador de Más MUST conservar un objetivo táctil de al menos 44 por 44 píxeles CSS y no producir desplazamiento horizontal a 320 píxeles.

#### Scenario: Uso en ancho estrecho
- **WHEN** el shell se renderiza a 320 píxeles de ancho
- **THEN** la navegación permanece visible, usable y sin desbordamiento horizontal
