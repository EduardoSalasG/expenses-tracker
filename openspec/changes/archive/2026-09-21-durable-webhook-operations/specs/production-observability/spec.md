## Purpose

Hace observable el ciclo de vida inbound sin almacenar secretos ni cuerpos sensibles.

## ADDED Requirements

### Requirement: Trazabilidad segura de eventos
El sistema SHALL registrar correlación, estado e intentos de cada evento inbound y MUST excluir secretos y cuerpos completos de webhook.

#### Scenario: Diagnóstico de fallo
- **WHEN** un worker falla al procesar un evento
- **THEN** el registro identifica el evento y el estado saneado sin datos sensibles
