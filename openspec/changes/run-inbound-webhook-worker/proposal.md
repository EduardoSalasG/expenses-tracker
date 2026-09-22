## Why

Los webhooks de Telegram se persisten correctamente, pero producción no ejecuta el worker que los consume. Los mensajes quedan pendientes indefinidamente y el bot no responde después de un despliegue o reinicio.

## What Changes

- Ejecutar un worker persistente de eventos inbound junto a la API en Compose de producción.
- Garantizar que el worker usa la misma imagen SHA, configuración y ciclo de reinicio que el backend desplegado.
- Verificar durante el despliegue que API y worker usan la imagen esperada y que el worker permanece ejecutándose.
- Documentar operación, recuperación y observabilidad de la cola inbound.

## Capabilities

### New Capabilities

- Ninguna.

### Modified Capabilities

- `durable-inbound-messaging`: el procesamiento pendiente debe estar disponible continuamente en producción, no depender de una ejecución manual o cron externo.
- `production-observability`: el despliegue y la operación deben hacer visible el estado del worker sin registrar payloads sensibles.

## Impact

- `backend/compose.production.yaml`: servicio worker persistente con la misma imagen y variables de entorno.
- `.github/workflows/deploy-backend-docker.yml`: despliegue y verificaciones de ambos servicios.
- `backend/src/infrastructure/`: ciclo controlado del worker si se requiere un proceso de larga duración.
- `docs/operations.md`: runbook de recuperación y supervisión.
