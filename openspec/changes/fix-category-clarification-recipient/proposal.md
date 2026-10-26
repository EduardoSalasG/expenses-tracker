## Why

Cuando la interpretación de un gasto no identifica la categoría, la pregunta de aclaración puede enviarse a una dirección de origen interna en vez del destinatario de respuesta del canal. El borrador queda activo, por lo que el mensaje siguiente se consume erróneamente como una selección de categoría sin que la persona haya visto la pregunta.

## What Changes

- Entregar inmediatamente la aclaración de categoría al `replyTo` del evento inbound cuando esté disponible.
- Conservar `fromPhoneNumber` como destinatario de reserva cuando el canal no incluya `replyTo`.
- Cubrir el flujo con una regresión de canal cuyo remitente interno difiera de su destinatario de respuesta.

## Capabilities

### New Capabilities

- Ninguna.

### Modified Capabilities

- `durable-inbound-messaging`: la respuesta derivada de un evento inbound debe conservar su destinatario de respuesta configurado por el canal.

## Impact

- `backend/src/application/use-cases/process-inbound-finance-message.use-case.ts`.
- Pruebas unitarias del caso de uso de mensajería inbound.
- Sin cambios de API pública, esquema de base de datos ni dependencias.
