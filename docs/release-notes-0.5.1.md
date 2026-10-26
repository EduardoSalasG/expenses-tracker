# Notas de release — v0.5.1

## Identificación

- Versión SemVer: `0.5.1` (PATCH).
- Estado: publicada y verificada en producción.
- Fecha de publicación: 2026-10-26.
- Commit de release en `main`: `5fc7cf7332bcabb3ba7e40fffbd1ee35ccabd41f`.
- Tag anotado: `v0.5.1`, resuelto al mismo commit inmutable.

## Cambios incluidos

- Fixed: cuando falta la categoría de un gasto, la pregunta de aclaración se dirige al chat que originó el mensaje, incluido el adaptador de Telegram.
- Fixed: una fecha explícita enviada al completar un borrador sustituye la fecha predeterminada; una fecha que ya era explícita no se reemplaza por una respuesta posterior ni por un marcador desactualizado.

## Datos y compatibilidad

- Migraciones incluidas: ninguna.
- Compatibilidad: no se modifican contratos API ni Swagger.
- Riesgo y mitigación: el cambio se limita a la selección del destinatario de respuestas y a la fusión de fechas en borradores; se cubren ambos sentidos de preservación de fecha explícita.
- Rollback: el último tag saludable es `v0.5.0`; ejecutar primero `pnpm run release:rollback:preview -- --tag v0.5.0`.

## Evidencia de release

- Revisión técnica: sin bloqueos tras correcciones y segunda pasada.
- Pruebas backend: 185 correctas y 7 integraciones PostgreSQL omitidas por no disponer de configuración de DB.
- Pruebas frontend: 83/83 correctas en Karma/Chrome.
- `pnpm run release:verify`: correcto sobre `dev` y sobre el commit de promoción en `main`; compila backend y frontend y prerenderiza `/` y `/en`. Persiste sólo la advertencia conocida Angular `NG02801` para SSR sin `withFetch()`.
- `pnpm run version:check`, validaciones OpenSpec estrictas y `git diff --check`: correctos antes de la promoción.
- GitHub Actions: [Deploy expenses-tracker backend #40352726907](https://github.com/EduardoSalasG/expenses-tracker/actions/runs/40352726907) concluyó con éxito para el SHA de release.
- Netlify: el sitio productivo respondió HTTP 200 desde `Server: Netlify` a las `2026-10-26T15:48:22Z`. El estado interno y la asociación criptográfica al SHA no pudieron consultarse porque la API requiere autenticación y el dashboard autenticado está restringido en este entorno.
- Salud pública: `https://expenses-tracker-easg.netlify.app/` devolvió HTTP 200; `https://api.expenses-tracker.eduardosalasg.dev/health` devolvió `{"status":"ok"}`; `/health/ready` confirmó base de datos `ok`; y `/api/docs` respondió HTTP 200.
