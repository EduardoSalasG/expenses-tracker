# Notas de release — v0.3.2

## Identificación

- Versión SemVer: `0.3.2` (PATCH).
- Tag anotado: pendiente de la promoción verificada de `main`.
- Fecha: 2026-09-22.

## Cambios incluidos

- Fixed: el consumidor durable de eventos inbound se mantiene activo en producción y retoma los eventos pendientes después de reinicios o despliegues.
- Fixed: el workflow exige que API y consumidor se creen desde la imagen etiquetada con el SHA exacto y permanezcan en ejecución.
- Fixed: los estados de entrega de WhatsApp preservan `errors: []` cuando el proveedor lo entrega explícitamente.
- Changed: ESLint queda configurado para las fuentes TypeScript del backend y cubierto por una prueba de resolución de configuración.

## Datos y compatibilidad

- Migraciones incluidas: ninguna.
- Compatibilidad: no cambia el contrato HTTP ni la configuración existente de producción; API y worker reutilizan el mismo archivo `.env` de la instancia.
- Riesgo y mitigación: el worker añade un proceso sin puertos expuestos; el workflow verifica su imagen SHA y su estado antes de completar el deploy.
- Rollback: el último tag sano confirmado es `v0.3.0` (`8aeca00b956fb6253f24d4074107497eb892b232`).

## Evidencia de promoción

- Pendiente: se añadirá el SHA, tag y resultados de despliegue tras comprobar GitHub Actions, Netlify y los health checks públicos.
