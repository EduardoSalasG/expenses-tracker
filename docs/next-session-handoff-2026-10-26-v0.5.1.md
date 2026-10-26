# Handoff — release v0.5.1 — 2026-10-26

## Presupuesto comunicado

- Ventana de cinco horas: 30 % disponible antes de la promoción.

## Trabajo completado

- Se corrigió el destinatario de las preguntas de categoría: las aclaraciones se envían de inmediato al `replyTo` real, incluido Telegram.
- Se corrigió la fusión de borradores: una fecha explícita recibida después sustituye la fecha predeterminada, mientras una fecha ya explícita no se sobrescribe.
- Release PATCH `0.5.1` publicada con manifiestos, módulos de versión visibles, changelog y notas de release actualizados.
- `main` fue promovida en `5fc7cf7332bcabb3ba7e40fffbd1ee35ccabd41f`, se creó el tag anotado `v0.5.1` sobre ese SHA y `dev` se sincronizó con `main` en `42e767d`.

## Verificación

- Revisión técnica: dos pasadas, sin bloqueos finales.
- Backend: 185 pruebas correctas; 7 integraciones PostgreSQL omitidas por no disponer de configuración de DB.
- Frontend: 83/83 pruebas correctas en Karma/Chrome.
- `pnpm run release:verify` elevado: correcto en `dev` y en el commit de promoción de `main`; build backend/frontend y prerender de `/` y `/en`.
- `pnpm run version:check`, las validaciones OpenSpec estrictas de ambos cambios y `git diff --check`: correctos antes de la promoción.
- GitHub Actions: [Deploy expenses-tracker backend #40352726907](https://github.com/EduardoSalasG/expenses-tracker/actions/runs/40352726907) terminó exitosamente para el SHA publicado.
- Salud pública: frontend Netlify HTTP 200; API `/health` HTTP 200 con `{"status":"ok"}`; `/health/ready` HTTP 200 con PostgreSQL `ok`; y Swagger `/api/docs` HTTP 200.
- Netlify respondió públicamente desde `Server: Netlify`, pero el estado interno y el SHA del deploy no pudieron comprobarse sin credenciales de Netlify en este entorno.

## Estado y siguiente paso

- Rama: `dev`, sincronizada con `main` de la release. Falta publicar el commit documental final de evidencia.
- No hay promoción ni despliegues pendientes para `v0.5.1`.
- Siguiente paso: iniciar una nueva iniciativa desde `dev` con su cambio OpenSpec correspondiente.
- Limitación conocida: las pruebas y build Angular requieren ejecución elevada porque Chrome/Angular no pueden acceder a caché/dependencias desde el sandbox. El build conserva la advertencia Angular `NG02801` sobre SSR sin `withFetch()`.
