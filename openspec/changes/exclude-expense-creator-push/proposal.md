## Why

Hoy, al registrar un gasto en una cuenta compartida, la notificación push también se encola para quien lo registró. Esa persona ya recibió confirmación por la acción que realizó, por lo que la notificación es redundante.

## What Changes

- Al crear un gasto en una cuenta compartida, excluir al usuario que lo registró de los destinatarios de notificaciones push.
- Conservar las notificaciones para los demás miembros activos que tengan una suscripción push vigente.
- Mantener sin cambios las cuentas personales, el contenido de la notificación y la tolerancia a errores de entrega.

## Capabilities

### New Capabilities

- `shared-expense-push-notifications`: Encola notificaciones de gastos compartidos únicamente para miembros activos distintos del registrador.

### Modified Capabilities

- Ninguna.

## Impact

- `backend/src/application/use-cases/finance.use-cases.ts`
- `backend/src/application/use-cases/queue-shared-expense-push.use-case.ts`
- Pruebas unitarias de la cola de notificaciones compartidas.
- Sin cambios de API, esquema de base de datos ni dependencias.
