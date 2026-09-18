# Diseño: operaciones durables de webhooks

## Objetivo

Desacoplar la recepción verificada de Telegram y WhatsApp del procesamiento de comandos y movimientos, sin cambiar los contratos de los proveedores ni duplicar efectos financieros.

## Arquitectura

Cada controlador verificará primero la autenticidad actual y extraerá mensajes. En vez de invocar `InboundMessagingService.receive` dentro de la solicitud, persistirá cada evento en una bandeja PostgreSQL con una clave única `(channel, provider_message_id)` y responderá `200` al proveedor. Una interfaz de bandeja admite PostgreSQL en producción e implementación en memoria para pruebas.

Un worker explícito reclamará filas pendientes mediante bloqueo transaccional, invocará el servicio existente y marcará éxito. Los fallos aplicarán backoff acotado; agotados los intentos, la fila pasa a `dead_letter` con una causa saneada. Los controladores nunca registrarán cuerpos de webhook ni secretos.

## Datos y operación

La migración crea `inbound_webhook_events` con payload normalizado mínimo, estado, intentos, próximo intento, correlación y timestamps. La clave de deduplicación elimina reentregas. Un comando worker se ejecuta en el contenedor/API o mediante scheduler; métricas estructuradas cubren accepted, duplicate, processed, retry y dead-letter.

## Compatibilidad y errores

Telegram y WhatsApp conservan sus URLs, firma/secretos y respuesta exitosa. Un evento duplicado responde exitosamente sin reprocesarlo. Un fallo de persistencia devuelve 503 para inducir reintento del proveedor; un fallo del worker no afecta la respuesta del webhook. El worker usa el mismo `InboundMessagingService` para preservar comandos, respuestas y procesamiento financiero.

## Pruebas

Pruebas unitarias cubren deduplicación, reclamo, éxito, retry y DLQ. Pruebas HTTP verifican que controladores aceptan rápidamente sin ejecutar procesamiento síncrono. Una integración PostgreSQL valida el índice único y el reclamo concurrente cuando la base esté disponible.

## Límites

Esta entrega no incorpora una cola externa, panel de administración ni reproceso manual de DLQ; deja las filas y métricas preparadas para esas extensiones.
