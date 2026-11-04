## Context

La creación de gastos persiste primero el gasto y luego invoca una cola tolerante a fallos para notificaciones push. La cola reconoce las cuentas compartidas, carga a sus miembros activos y encola una entrega por cada suscripción activa; actualmente no recibe la identidad del registrador. Véase `proposal.md` para la motivación y la especificación para el comportamiento observable.

## Goals / Non-Goals

**Goals:**

- Transportar la identidad del registrador hasta la cola de notificaciones de gasto compartido.
- Filtrar al registrador antes de buscar suscripciones activas.
- Proteger el comportamiento con una prueba de regresión.

**Non-Goals:**

- No cambiar el contenido de la notificación, la estrategia de reintentos ni el esquema de entregas push.
- No notificar por correo, WhatsApp o Telegram como parte de este cambio.
- No notificar al pagador solo por ser pagador; la exclusión se define exclusivamente por quien registra el gasto.

## Decisions

- La identidad a excluir será `userId`, el usuario que crea el gasto. Es el dato de actor ya presente en la entrada de creación y coincide con la solicitud: excluir a quien registra, no necesariamente a `paidByUserId`.
- La cola recibirá el identificador del registrador junto con los datos del gasto. Mantiene la decisión de destinatarios donde ya se resuelven cuenta, miembros y suscripciones; la alternativa de filtrar antes de invocar la cola acoplaría la capa financiera a detalles de suscripciones.
- El filtrado se aplicará a los miembros activos antes de consultar sus suscripciones. Así se evita consultar y potencialmente encolar entregas para todas las suscripciones del registrador.
- La ejecución seguirá siendo de mejor esfuerzo después de persistir el gasto. La alternativa de propagar el error de notificación cambiaría la garantía de persistencia existente.

## Risks / Trade-offs

- [Una llamada interna omite el identificador del registrador] → Tipar el parámetro como obligatorio y cubrir el recorrido desde creación hasta la cola con pruebas.
- [Un miembro mantiene varias suscripciones] → El filtro por usuario excluye todas sus suscripciones, mientras preserva todas las del resto de miembros.

## Migration Plan

No hay migración de datos ni cambio de API. El despliegue cambia únicamente la selección de nuevas entregas push; el rollback restaura el comportamiento previo sin afectar entregas ya encoladas.
