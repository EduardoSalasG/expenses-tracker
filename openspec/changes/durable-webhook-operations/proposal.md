## Why

Los webhooks procesan mensajes de forma síncrona y la operación depende casi exclusivamente de logs, lo que aumenta reintentos, duplicados y tiempo de diagnóstico.

## What Changes

- Los eventos verificados SHALL persistirse y acusarse rápidamente antes de procesamiento externo.
- La deduplicación SHALL preceder a cualquier efecto, incluidos comandos.
- El procesamiento SHALL tener reintentos acotados, DLQ, métricas y trazabilidad segura.
- El proxy y logs MUST configurarse de forma explícita y redactar datos sensibles.

## Capabilities

### New Capabilities
- `durable-inbound-messaging`: entrega durable, deduplicada y reintentable de eventos inbound.
- `production-observability`: correlación, métricas y logging seguro.

### Modified Capabilities

- Ninguna; no existen specs base.

## Impact

Controladores webhook, servicio inbound, repositorios, worker, configuración, métricas, CI e infraestructura de despliegue.
