# Notas de release — v0.6.2

## Identificación

- Versión SemVer: `0.6.2` (PATCH).
- Fecha de preparación: 2026-11-02.
- Propósito: completar la corrección del despliegue remoto de `v0.6.1`.

## Corrección incluida

- Cada `docker compose run` remoto usa `-T --interactive=false`. Así los contenedores one-shot no leen el stdin del heredoc SSH y el script continúa hacia `docker compose up`, migraciones y verificaciones públicas.

## Evidencia requerida

- Prueba de regresión del workflow que exige que los cuatro comandos one-shot deshabiliten TTY e stdin interactivo.
- `pnpm test`, `pnpm lint` y `pnpm run release:verify`.
- Tras promoción: GitHub Actions, health/readiness pública, `GET /push/public-key` y Netlify.
