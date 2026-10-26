# Notas de release — v0.5.1

## Identificación

- Versión SemVer: `0.5.1` (PATCH).
- Estado: preparada en `dev`; pendiente de promoción y verificación de producción.
- Fecha de preparación: 2026-10-26.

## Cambios incluidos

- Fixed: cuando falta la categoría de un gasto, la pregunta de aclaración se dirige al chat que originó el mensaje, incluido el adaptador de Telegram.
- Fixed: una fecha explícita enviada al completar un borrador sustituye la fecha predeterminada; una fecha que ya era explícita no se reemplaza por una respuesta posterior ni por un marcador desactualizado.

## Datos y compatibilidad

- Migraciones incluidas: ninguna.
- Compatibilidad: no se modifican contratos API ni Swagger.
- Riesgo y mitigación: el cambio se limita a la selección del destinatario de respuestas y a la fusión de fechas en borradores; se cubren ambos sentidos de preservación de fecha explícita.
- Rollback: el último tag saludable es `v0.5.0`; ejecutar primero `pnpm run release:rollback:preview -- --tag v0.5.0`.

## Evidencia previa a promoción

- Revisión técnica: sin bloqueos tras correcciones y segunda pasada.
- Pruebas backend: 185 correctas y 7 integraciones PostgreSQL omitidas por no disponer de configuración de DB.
- Build backend y validaciones OpenSpec estrictas: correctos.
- Pendiente de completar antes del cierre: sincronización de versión, pruebas/build de release, promoción a `main`, tag anotado, despliegues y comprobaciones públicas.
