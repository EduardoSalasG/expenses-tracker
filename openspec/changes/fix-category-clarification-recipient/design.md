## Context

Ver `proposal.md` para la motivación. El caso de uso inbound ya resuelve el destinatario como `replyTo` con reserva al remitente en la mayoría de sus respuestas, pero la rama inicial de selección de categoría no conserva esa regla. El borrador se persiste antes de enviar la aclaración, por lo que el fallo afecta la conversación siguiente.

## Goals / Non-Goals

**Goals:**

- Unificar la selección del destinatario de la primera aclaración de categoría con el resto de las respuestas inbound.
- Evitar una regresión cuando el identificador interno de origen y el destinatario de respuesta sean diferentes.

**Non-Goals:**

- No modificar el modelo de borradores, los contratos HTTP ni los adaptadores de mensajería.
- No cambiar el texto, la lógica de inferencia ni la selección de categorías.

## Decisions

- Reutilizar la regla existente `replyTo ?? fromPhoneNumber` en la rama que inicia la selección de categoría. Así se mantiene un único comportamiento de direccionamiento y se conserva la reserva para canales sin `replyTo`.
- Añadir una prueba del caso de uso con un proveedor capturador, un `fromPhoneNumber` interno y un `replyTo` distinto. Es más precisa que probar un adaptador: verifica persistencia del borrador y entrega en la misma transición.
- Alternativa descartada: cambiar el adaptador de mensajería para reinterpretar direcciones internas. Ocultaría el error de orquestación y podría alterar entregas legítimas de otros flujos.

## Risks / Trade-offs

- [Un canal suministra un `replyTo` inválido] → Se conserva el contrato actual del evento inbound; los adaptadores continúan validando o rechazando direcciones según su integración.
- [Cobertura solo del flujo de categoría] → La modificación se limita al único desvío identificado; el patrón existente ya cubre las demás respuestas.

## Migration Plan

1. Ejecutar la prueba de regresión y la suite de backend.
2. Desplegar como cambio compatible, sin migración de datos.
3. Si fuese necesario revertir, restaurar la expresión de destinatario anterior; no hay estado persistente nuevo que revertir.
