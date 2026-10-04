## Context

El backend ya construye un logger Winston único, pero sólo configura timestamp, errores y JSON. El identificador de solicitud se genera en `createApp`, el manejo de errores lo registra de forma segura y los proveedores/worker reciben el logger desde el contenedor. El frontend tiene un interceptor de autenticación que puede componer cabeceras, pero no propaga correlación. Véase `proposal.md` para la motivación y la delta de `production-observability` para el contrato observable.

## Goals / Non-Goals

**Goals:**

- Emitir eventos JSON homogéneos y seguros a `stdout` para API, worker y procesos de infraestructura.
- Correlacionar el navegador con la API mediante una cabecera UUID por solicitud.
- Hacer visibles resultado y duración HTTP sin registrar datos financieros ni personales.
- Mantener los contratos de cuerpo HTTP, autenticación y health existentes.

**Non-Goals:**

- Añadir almacenamiento, métricas persistentes, tracing distribuido, dashboards o alertas.
- Registrar cuerpo, query string o cabeceras de solicitudes.
- Enviar errores del navegador a una ruta de telemetría.

## Decisions

### Contrato de logger enriquecido

El adaptador Winston añadirá `service`, `environment` y `version` como metadatos por defecto. La versión se exporta desde un módulo backend generado por el sincronizador de versiones existente, por lo que coincide con los manifiestos también dentro de la imagen compilada. `LOG_LEVEL` se valida con Zod y se entrega desde `AppConfig`, por lo que todos los puntos de entrada usan una configuración coherente. El contenedor pasa la configuración de forma explícita; los scripts y workers que hoy crean un logger directamente resuelven el mismo `AppConfig` central como fallback. La alternativa de leer `process.env` desde cada logger se descarta porque permitiría discrepancias entre API, scripts y worker.

### Correlación en dos capas

El interceptor Angular crea un UUID con `crypto.randomUUID()` y lo añade a cada solicitud. El backend acepta solamente UUIDs, genera uno para clientes que no lo envían o lo envían inválido y fija `X-Request-ID` en la respuesta. Esta doble capa da trazabilidad a web y clientes externos sin confiar en texto arbitrario. Se descarta reutilizar siempre un solo ID de sesión porque impide separar peticiones concurrentes.

### Un evento HTTP de cierre

Un middleware instalado antes de rutas mide el tiempo con un reloj monotónico y escucha `response.finish`. Emite `http_request_completed` con `requestId`, método, ruta de Express, estado y duración. El middleware de errores continúa emitiendo `http_request_failed` con metadatos saneados; no escribe rutas crudas ni datos de request. Se descarta registrar al inicio y al cierre: duplicaría volumen sin aportar el resultado final.

### Ruta normalizada y sanitización por construcción

El evento utiliza el patrón de ruta resuelto por Express cuando exista y una etiqueta estable para rutas no encontradas; no usa `originalUrl`. La metadata de error se mantiene como lista explícita de campos permitidos. El stack se omite en producción y nunca se devuelve en HTTP. Se descarta una sanitización genérica recursiva porque puede omitir nuevos campos sensibles.

### Ciclo de vida consistente

API, readiness y worker usarán nombres de evento estables y metadatos limitados. Los scripts ya construyen el mismo adaptador y heredarán formato/nivel sin instrumentación de cada consulta SQL. Esta alternativa concentra valor en límites operativos y evita ruido o exposición de parámetros de base de datos.

## Risks / Trade-offs

- Un `response.finish` puede ocurrir después de que un error fue manejado → se esperan dos eventos para errores (fallo y cierre), ambos con el mismo `requestId`; esto distingue causa y resultado.
- `crypto.randomUUID()` no está disponible en algunos contextos SSR antiguos → el interceptor se limita a solicitudes ejecutadas en navegadores soportados por la versión Angular/Node actual; la API siempre tiene fallback propio.
- La ruta de Express no está resuelta para 404 → se registra una etiqueta fija de no encontrada, sin usar URL cruda.
- Los logs JSON pueden aumentar volumen bajo alta carga → se registra sólo un cierre por solicitud y se mantiene `info` como nivel productivo predeterminado.

## Migration Plan

1. Incorporar configuración, adaptador y middleware con pruebas unitarias/HTTP.
2. Publicar el frontend que propaga IDs; clientes existentes continúan compatibles porque el backend genera el ID faltante.
3. Desplegar sin migraciones de datos ni cambios de infraestructura; el colector actual de `stdout` recibe los nuevos campos.
4. Si ocurre una regresión, revertir la versión de aplicación; no hay estado persistente ni migración que deshacer.
