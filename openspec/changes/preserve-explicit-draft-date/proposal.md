## Why

Un gasto sin fecha recibe la fecha actual como valor por defecto. Si la persona agrega después una fecha explícita mientras completa otro dato pendiente, el borrador conserva erróneamente la fecha por defecto y registra el gasto en el día equivocado.

## What Changes

- Permitir que una fecha explícita recibida al completar un borrador reemplace su fecha implícita por defecto.
- Mantener la fecha existente cuando una respuesta posterior no contiene una fecha explícita.
- Cubrir el flujo con una regresión para una fecha localizada, como `el 24 de octubre`.

## Capabilities

### New Capabilities

- `draft-explicit-date-preservation`: preserva las fechas explícitas aportadas al completar conversaciones de gastos pendientes.

### Modified Capabilities

- Ninguna.

## Impact

- `backend/src/application/services/messaging-draft.service.ts`.
- Pruebas de fusión de borradores de mensajería.
- Sin cambios de API pública, base de datos ni dependencias.
