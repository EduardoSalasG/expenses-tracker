## Purpose

Mantiene feedback perceptible para carga, éxito y error sin imponer animaciones a personas que prefieren reducir movimiento.

## ADDED Requirements

### Requirement: Feedback asíncrono anunciado
Los estados de carga, éxito y error MUST anunciarse mediante regiones vivas apropiadas y conservar texto de recuperación localizado.

#### Scenario: Error recuperable
- **WHEN** una operación asíncrona falla
- **THEN** el estado visible y el lector de pantalla comunican el problema y la siguiente acción disponible

### Requirement: Preferencia de movimiento respetada
La interfaz SHALL respetar `prefers-reduced-motion`; cuando se reduzca movimiento, el feedback MUST conservar contraste y contenido sin depender de transiciones o desplazamientos.

#### Scenario: Movimiento reducido
- **WHEN** el sistema operativo indica preferencia de movimiento reducido
- **THEN** las transiciones no esenciales se eliminan o reducen sin ocultar feedback
