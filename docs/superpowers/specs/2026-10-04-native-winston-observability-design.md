# Diseño: observabilidad nativa con Winston

## Objetivo

Hacer observables los flujos del backend y su relación con las solicitudes del frontend mediante logs JSON estructurados de Winston y un identificador de correlación. La solución funciona únicamente con `stdout` y los health checks ya existentes; no incorpora proveedores ni agentes externos.

## Alcance

- Centralizar el formato, nivel y metadatos base de Winston en el adaptador de infraestructura.
- Registrar el ciclo HTTP completo: solicitud finalizada, error controlado o inesperado, código de estado y duración.
- Propagar un `X-Request-ID` generado por el frontend; el backend lo valida, genera uno alternativo cuando haga falta y lo devuelve en la respuesta.
- Registrar eventos de ciclo de vida de API, readiness y worker inbound usando el mismo formato.
- Documentar configuración, campos de eventos y consulta por correlación.

## Fuera de alcance

- Servicios externos de observabilidad, agentes, OpenTelemetry, Sentry, Grafana o Loki.
- Persistencia de métricas, dashboards, alertas y retención de logs dentro de la aplicación.
- Envío de errores, métricas de navegación o datos de usuario desde el frontend al backend.
- Cambios de contrato funcional de la API distintos a devolver `X-Request-ID`.

## Arquitectura

`backend/src/infrastructure/logger.ts` será el único adaptador que construye Winston. Emitirá JSON a `stdout` y añadirá metadatos base: nombre del servicio, entorno y versión de la aplicación. El nivel procede de `LOG_LEVEL`; es `info` en producción y `debug` en desarrollo cuando no se configura explícitamente.

El middleware de correlación se ejecutará antes de rutas y de manejo de errores. Aceptará sólo UUIDs válidos en `X-Request-ID`; para una cabecera ausente o inválida creará un UUID. Fijará el valor en la solicitud y en la cabecera de respuesta.

El middleware de finalización emitirá exactamente un evento `http_request_completed` por respuesta, incluyendo `requestId`, método, ruta normalizada, estado HTTP y duración en milisegundos. No registrará query strings, cuerpos ni headers. El manejo de errores registrará `http_request_failed` usando el mismo ID y metadatos sanitizados.

Angular añade un interceptor dedicado de correlación. Genera un UUID por solicitud y lo añade como `X-Request-ID`, preservando los encabezados que ya establece el interceptor de autenticación. No tiene transporte de telemetría ni captura global de errores.

## Seguridad y privacidad

- Nunca registrar OTP, JWT, refresh token, secretos de webhook, cabecera `Authorization`, cuerpos HTTP, email, teléfono ni query string.
- El stack sólo podrá estar disponible en logs de desarrollo; las respuestas HTTP siguen sin exponer detalles internos.
- La ruta se toma del patrón de Express cuando esté disponible, evitando identificadores de recursos y datos ingresados por personas.
- Un valor externo inválido de `X-Request-ID` no se reutiliza.

## Configuración

`LOG_LEVEL` admite exclusivamente `error`, `warn`, `info` y `debug`. La configuración inválida falla al iniciar para evitar una observabilidad silenciosamente mal configurada.

## Pruebas

- Backend: validación de `LOG_LEVEL`, propagación/generación de `X-Request-ID`, cabecera de respuesta, evento de éxito con duración y evento de fallo sin secretos.
- Frontend: el interceptor de correlación agrega un UUID y no elimina autorización ni cuenta financiera activa.
- Regresión: health, autenticación, manejo de errores y worker inbound conservan sus contratos actuales.

## Criterios de aceptación

1. Cada respuesta HTTP contiene un `X-Request-ID` UUID válido y su evento de finalización usa el mismo valor.
2. Los logs JSON incluyen servicio, entorno, versión, nivel y timestamp; los eventos HTTP incluyen método, ruta normalizada, estado y duración.
3. Los errores HTTP se correlacionan sin filtrar secretos o datos personales.
4. El frontend propaga un ID distinto por solicitud sin emitir telemetría propia.
5. La configuración y la guía operativa describen cómo seleccionar nivel y buscar una solicitud por ID.
