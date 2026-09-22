## Why

Un despliegue puede informar éxito aunque el contenedor del consumidor inbound esté en un ciclo de reinicio o la imagen no contenga su daemon. Esto dejó eventos de Telegram persistidos sin procesar hasta una intervención manual.

## What Changes

- Validar, antes de recrear servicios, que la imagen SHA seleccionada contiene el ejecutable del daemon inbound.
- Exigir evidencia de inicio estable del worker y rechazar reinicios durante la ventana de verificación del despliegue.
- Documentar una recuperación manual que siempre use un tag SHA y recree API y worker juntos.

## Capabilities

### New Capabilities

- Ninguna.

### Modified Capabilities

- `durable-inbound-messaging`: el despliegue de producción debe verificar que el consumidor durable puede iniciar y permanece estable con la imagen inmutable seleccionada.

## Impact

- `.github/workflows/deploy-backend-docker.yml`
- `docs/operations.md`
- Pruebas de configuración del despliegue o del Compose, si se requieren para cubrir la regresión.
- Oracle VM durante despliegues futuros; no cambia el contrato HTTP ni el esquema de base de datos.
