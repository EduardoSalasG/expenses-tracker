## 1. Regresión de mensajería inbound

- [x] 1.1 Añadir una prueba del caso de uso para un gasto sin categoría con `replyTo` distinto de `fromPhoneNumber`, y verificar que la aclaración se entrega de inmediato al primero y se persiste el borrador de categoría.

## 2. Corrección y validación

- [x] 2.1 Ajustar la rama inicial de selección de categoría para usar el destinatario de respuesta con reserva al remitente, y verificar que pasa la prueba de regresión.
- [x] 2.2 Ejecutar la prueba del caso de uso, la suite de backend y la validación estricta de OpenSpec, y verificar que todos finalizan correctamente.
