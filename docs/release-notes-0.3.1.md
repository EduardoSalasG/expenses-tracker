# Notas de release — v0.3.1

## Identificación

- Versión SemVer: `0.3.1` (PATCH).
- Tag anotado: pendiente de la promoción verificada de `main`.
- Fecha: 2026-09-21.

## Cambios incluidos

- Fixed: el historial de gastos formatea las fechas de cuota con calendario UTC, consistente con los límites de período y los gráficos.
- Fixed: el workflow backend comprueba el contrato de `GET /expenses` por el upstream Nginx y por el dominio público. Una ruta que entregue una instancia previa debe fallar el deploy y exponer la configuración Nginx para diagnóstico.

## Datos y compatibilidad

- Migraciones incluidas: ninguna.
- Compatibilidad: no se modifica el contrato de negocio; se protege que el contrato ya liberado llegue realmente al dominio público.
- Rollback: el último tag sano confirmado es `v0.3.0` (`8aeca00b956fb6253f24d4074107497eb892b232`).

## Evidencia de promoción

- Pendiente: se añadirá SHA, tag y resultado del workflow después de comprobar el dominio público.
