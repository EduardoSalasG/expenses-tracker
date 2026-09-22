## MODIFIED Requirements

### Requirement: Procesamiento con retry y DLQ
El sistema SHALL procesar eventos pendientes fuera de la solicitud HTTP mediante un consumidor que permanezca activo en producción, MUST reintentar fallos transitorios con límite y MUST aislar los agotados en una cola muerta. Tras un despliegue o reinicio, el consumidor MUST volver a procesar los eventos pendientes sin intervención manual.

#### Scenario: Fallo agotado
- **WHEN** un evento supera el máximo de intentos configurado
- **THEN** queda marcado como dead-letter sin exponer payload sensible

#### Scenario: Evento pendiente tras un despliegue
- **WHEN** llega un webhook válido y existe al menos un evento pendiente
- **THEN** el consumidor activo lo procesa fuera de la solicitud HTTP y entrega la respuesta al canal configurado
