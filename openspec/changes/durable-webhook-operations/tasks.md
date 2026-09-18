## 1. Bandeja durable

- [ ] 1.1 Crear migración, puerto y repositorios en memoria/PostgreSQL; verificar pruebas de deduplicación y reclamo.
- [ ] 1.2 Persistir eventos verificados desde controladores; verificar HTTP rápido y ausencia de procesamiento síncrono.

## 2. Worker confiable

- [ ] 2.1 Implementar worker que reclame y delegue al servicio existente; verificar éxito y concurrencia.
- [ ] 2.2 Implementar retry acotado y DLQ saneada; verificar backoff y agotamiento.

## 3. Operación

- [ ] 3.1 Añadir comando, métricas/logs seguros y documentación; verificar build, tests backend y OpenSpec estricto.
