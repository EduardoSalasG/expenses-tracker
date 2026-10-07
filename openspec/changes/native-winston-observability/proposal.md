## Why

El backend usa Winston de forma parcial y el frontend no correlaciona sus solicitudes con los registros del servidor. Esto dificulta diagnosticar fallos y latencias de una petición sin exponer datos sensibles ni depender de una plataforma externa.

## What Changes

- Centralizar Winston como logger JSON nativo a `stdout`, con nivel configurable y metadatos de servicio, entorno y versión.
- Añadir correlación HTTP segura mediante `X-Request-ID`, generado por el frontend, validado y devuelto por el backend.
- Registrar una finalización estructurada por solicitud HTTP y errores correlacionados con ruta normalizada, estado y duración.
- Unificar logs de ciclo de vida de API, readiness y worker inbound bajo el mismo contrato seguro.
- Documentar configuración, campos de evento y diagnóstico por identificador de solicitud.

## Capabilities

### New Capabilities

Ninguna.

### Modified Capabilities

- `production-observability`: extiende la trazabilidad segura existente a solicitudes HTTP, correlación con el frontend y eventos de ciclo de vida del proceso.

## Impact

- Backend: adaptador Winston, configuración, middleware HTTP, arranque, health/readiness y pruebas.
- Frontend: interceptor HTTP de correlación y pruebas, sin telemetría propia.
- Documentación: guía operativa y variables de entorno.
- API: todas las respuestas incluirán la cabecera `X-Request-ID`; no cambia cuerpos ni autenticación.
