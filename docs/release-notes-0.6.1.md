# Notas de release — v0.6.1

## Identificación

- Versión SemVer: `0.6.1` (PATCH).
- Fecha de preparación: 2026-11-02.
- Propósito: corregir el script de despliegue de `v0.6.0` para que ejecute completamente migraciones, recreación de servicios y verificaciones posteriores.

## Correcciones incluidas

- Cada `docker compose run` remoto usa `-T`; así no consume el stdin del heredoc SSH antes de ejecutar los pasos siguientes.
- El workflow comprueba explícitamente que `GET /push/public-key` se exponga desde la API pública y contenga una clave VAPID.

## Evidencia requerida

- Prueba automatizada del workflow que cubre el modo no interactivo y el contrato Push público.
- `pnpm test`, `pnpm lint` y `pnpm run release:verify`.
- Tras promoción: GitHub Actions, health/readiness pública, Swagger Push y Netlify.
