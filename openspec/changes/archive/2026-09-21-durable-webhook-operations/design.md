## Context

Los controladores webhook verificados llaman hoy de forma síncrona a `InboundMessagingService`.

## Goals / Non-Goals

**Goals:** bandeja PostgreSQL idempotente, worker con reclamo seguro, retry acotado, DLQ y trazabilidad.

**Non-Goals:** cola externa, panel administrativo o replay manual.

## Decisions

- PostgreSQL es la bandeja durable: evita otra dependencia y permite deduplicación con índice único.
- Los controladores extraen y persisten mensajes normalizados; el worker reutiliza el servicio existente para no alterar comandos.
- El worker reclama filas con bloqueo transaccional; los fallos guardan mensaje saneado y próximo intento.

## Risks / Trade-offs

- Worker detenido acumula eventos → métricas y comando explícito permiten detectarlo.
- Reintentos duplican efectos si la lógica downstream no es idempotente → la clave de proveedor se reclama una sola vez.

## Migration Plan

Aplicar migración mediante bootstrap, desplegar API/worker y verificar pendientes, DLQ y health; rollback detiene worker y mantiene eventos sin procesar.
