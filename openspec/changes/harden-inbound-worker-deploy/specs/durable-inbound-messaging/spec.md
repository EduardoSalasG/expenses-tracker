## MODIFIED Requirements

### Requirement: Procesamiento con retry y DLQ
El sistema SHALL procesar eventos pendientes fuera de la solicitud HTTP mediante un consumidor que permanezca activo en producción, MUST reintentar fallos transitorios con límite y MUST aislar los agotados en una cola muerta. Tras un despliegue o reinicio, el consumidor MUST volver a procesar los eventos pendientes sin intervención manual. El despliegue MUST verificar que la imagen inmutable seleccionada contiene el ejecutable del consumidor y que el proceso inicia sin reinicios antes de declararse exitoso.

#### Scenario: Fallo agotado
- **WHEN** un evento supera el máximo de intentos configurado
- **THEN** queda marcado como dead-letter sin exponer payload sensible

#### Scenario: Evento pendiente tras un despliegue
- **WHEN** llega un webhook válido y existe al menos un evento pendiente
- **THEN** el consumidor activo lo procesa fuera de la solicitud HTTP y entrega la respuesta al canal configurado

#### Scenario: Imagen sin ejecutable del consumidor
- **WHEN** la imagen SHA seleccionada no incluye el ejecutable del consumidor inbound
- **THEN** el despliegue falla antes de sustituir los servicios de producción

#### Scenario: Consumidor en ciclo de reinicio
- **WHEN** el proceso del consumidor termina y Docker intenta reiniciarlo durante la verificación posterior al despliegue
- **THEN** el despliegue falla y publica logs saneados del consumidor para diagnóstico
