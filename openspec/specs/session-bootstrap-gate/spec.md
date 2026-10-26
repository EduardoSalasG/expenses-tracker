# session-bootstrap-gate Specification

## Purpose

Evita que la navegación inicial muestre contenido público o privado equivocado mientras la aplicación restablece la sesión persistida de la persona usuaria.

## Requirements

### Requirement: Navegación diferida hasta resolver sesión
La aplicación MUST resolver la existencia y validez de la sesión persistida antes de mostrar el contenido enrutado al inicio.

#### Scenario: Sesión persistida válida
- **WHEN** la aplicación inicia con una sesión que puede renovarse correctamente
- **THEN** muestra directamente la navegación autenticada sin presentar la landing de forma transitoria

#### Scenario: Sesión persistida inválida
- **WHEN** la aplicación inicia con una sesión que no puede renovarse
- **THEN** elimina la sesión persistida y muestra únicamente el destino público que corresponde

#### Scenario: Sin sesión persistida
- **WHEN** la aplicación inicia sin tokens persistidos
- **THEN** muestra el destino público correspondiente después de completar el arranque

### Requirement: Pantalla de carga de arranque
La aplicación SHALL mostrar una pantalla de carga accesible mientras resuelve la sesión inicial, durante un mínimo de dos segundos, y MUST sustituirla por una única vista enrutada al terminar.

#### Scenario: Arranque en dispositivo móvil
- **WHEN** una persona abre la aplicación instalada
- **THEN** ve la pantalla de carga sin destellos de la landing ni de una ruta privada antes de que se resuelva su sesión
