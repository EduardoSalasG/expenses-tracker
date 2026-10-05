## 1. Logger y configuración

- [x] 1.1 Validar `LOG_LEVEL` en la configuración, generar la versión backend desde el sincronizador y enriquecer Winston con servicio, entorno y versión; verificar con pruebas de configuración, sincronización y logger.
- [x] 1.2 Mantener el formato JSON seguro en procesos API, scripts y worker mediante el fallback de configuración central; verificar que producción no incluya stack ni secretos.

## 2. Correlación y ciclo HTTP

- [x] 2.1 Incorporar middleware de `X-Request-ID` que valide UUID, genere fallback y devuelva la cabecera; verificar solicitudes con ID válido, ausente e inválido.
- [x] 2.2 Registrar finalización HTTP con ruta normalizada, método, estado y duración, y correlacionar errores saneados; verificar logs de éxito, error y 404 sin query strings ni credenciales.
- [x] 2.3 Registrar eventos de arranque, apagado, readiness y worker con el contrato común; verificar regresiones de health y worker.

## 3. Propagación desde frontend

- [x] 3.1 Añadir interceptor de correlación Angular y componerlo con autenticación; verificar UUID por solicitud y preservación de autorización/cuenta financiera.

## 4. Documentación y validación

- [x] 4.1 Documentar `LOG_LEVEL`, campos de eventos y búsqueda por `requestId` en la guía operativa; verificar que no haya instrucciones de telemetría externa.
- [x] 4.2 Ejecutar pruebas backend, frontend, build de superficies afectadas y `openspec validate native-winston-observability --strict`; registrar resultados y actualizar esta lista.
