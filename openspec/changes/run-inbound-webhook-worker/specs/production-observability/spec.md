## MODIFIED Requirements

### Requirement: Trazabilidad segura de eventos
El sistema SHALL registrar correlación, estado e intentos de cada evento inbound y MUST excluir secretos y cuerpos completos de webhook. El despliegue de producción MUST verificar de manera inequívoca que los procesos API y consumidor usan la imagen versionada esperada y que ambos quedan en ejecución.

#### Scenario: Diagnóstico de fallo
- **WHEN** un worker falla al procesar un evento
- **THEN** el registro identifica el evento y el estado saneado sin datos sensibles

#### Scenario: Verificación posterior al despliegue
- **WHEN** finaliza un despliegue de producción
- **THEN** la automatización falla si la API o el consumidor no fueron creados desde la imagen versionada esperada o no permanecen ejecutándose
