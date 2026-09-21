## 1. Bandeja durable

- [x] 1.1 Crear migración, puerto y repositorios en memoria/PostgreSQL; verificar pruebas de deduplicación y reclamo.
- [x] 1.2 Persistir eventos verificados desde controladores; verificar HTTP rápido y ausencia de procesamiento síncrono.

## 2. Worker confiable

- [x] 2.1 Implementar worker que reclame y delegue al servicio existente; verificar éxito y concurrencia.
- [x] 2.2 Implementar retry acotado y DLQ saneada; verificar backoff y agotamiento.

## 3. Operación

- [x] 3.1 Añadir comando, métricas/logs seguros y documentación; verificar build, tests backend y OpenSpec estricto.
