## Purpose

Entrega eventos inbound verificados de manera durable, deduplicada y reintentable.

## ADDED Requirements

### Requirement: Admisión durable e idempotente
El sistema SHALL persistir cada evento inbound verificado antes de reconocerlo al proveedor y MUST deduplicar entregas repetidas antes de producir efectos.

#### Scenario: Reentrega del proveedor
- **WHEN** llega un evento con la misma identidad de proveedor y canal
- **THEN** el sistema responde exitosamente sin crear un segundo procesamiento

### Requirement: Procesamiento con retry y DLQ
El sistema SHALL procesar eventos pendientes fuera de la solicitud HTTP, MUST reintentar fallos transitorios con límite y MUST aislar los agotados en una cola muerta.

#### Scenario: Fallo agotado
- **WHEN** un evento supera el máximo de intentos configurado
- **THEN** queda marcado como dead-letter sin exponer payload sensible
