## MODIFIED Requirements

### Requirement: Trazabilidad segura de eventos
El sistema SHALL registrar correlación, estado e intentos de cada evento inbound y MUST excluir secretos y cuerpos completos de webhook. Para cada solicitud HTTP, el sistema SHALL aceptar o generar un identificador de correlación válido, devolverlo en `X-Request-ID` y emitir un registro estructurado de finalización con método, ruta normalizada, estado y duración. Los registros MUST excluir credenciales, cabeceras de autorización, cuerpos, query strings y datos personales. El despliegue de producción MUST verificar de manera inequívoca que los procesos API y consumidor usan la imagen versionada esperada y que ambos quedan en ejecución.

#### Scenario: Diagnóstico de fallo
- **WHEN** un worker falla al procesar un evento
- **THEN** el registro identifica el evento y el estado saneado sin datos sensibles

#### Scenario: Solicitud HTTP correlacionada
- **WHEN** el frontend realiza una solicitud HTTP con un identificador de correlación válido o el servidor genera uno
- **THEN** la respuesta incluye el mismo `X-Request-ID` y el registro de finalización contiene ese identificador, método, ruta normalizada, estado y duración sin datos sensibles

#### Scenario: Identificador externo inválido
- **WHEN** una solicitud HTTP incluye un `X-Request-ID` que no es válido
- **THEN** el sistema lo reemplaza por un identificador válido, lo devuelve en la respuesta y no registra el valor inválido

#### Scenario: Verificación posterior al despliegue
- **WHEN** finaliza un despliegue de producción
- **THEN** la automatización falla si la API o el consumidor no fueron creados desde la imagen versionada esperada o no permanecen ejecutándose
