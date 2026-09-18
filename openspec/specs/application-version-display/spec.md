# application-version-display Specification

## Purpose

Permite a las personas usuarias identificar de forma accesible la versión que ejecuta la aplicación sin interferir con las tareas de configuración.

## Requirements

### Requirement: Versión visible en Configuración
La pantalla de Configuración SHALL mostrar la versión actual de la aplicación como su último contenido, con jerarquía visual secundaria y sin desplazar las acciones principales de la vista.

#### Scenario: Consulta de versión desde móvil
- **WHEN** una persona abre Configuración en un viewport móvil
- **THEN** puede encontrar la versión actual al final del contenido mediante desplazamiento normal sin pérdida de legibilidad ni de objetivos táctiles

#### Scenario: Consulta de versión desde escritorio
- **WHEN** una persona abre Configuración en un viewport de escritorio
- **THEN** la versión actual aparece después de todas las secciones funcionales y no compite visualmente con los controles primarios

### Requirement: Versión exacta y accesible
El texto mostrado SHALL coincidir exactamente con la versión de release validada y MUST permanecer disponible para lectores de pantalla, zoom de texto, navegación por teclado y preferencias de reducción de movimiento.

#### Scenario: Uso con tecnología asistiva
- **WHEN** una persona navega Configuración con teclado o lector de pantalla
- **THEN** puede alcanzar y leer el texto de versión sin requerir interacción de puntero ni depender de animación

#### Scenario: Actualización de release
- **WHEN** se construye la aplicación para una versión validada distinta
- **THEN** la pantalla MUST mostrar esa nueva versión y no una versión previamente compilada o codificada de forma independiente
