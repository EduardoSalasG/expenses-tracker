# Notas de release — v0.6.6

## Identificación

- Versión SemVer: `0.6.6` (PATCH).
- Tag anotado: `v0.6.6`.
- SHA inmutable de `main`: pendiente de promoción.
- Fecha y responsable: 2026-11-04, Eduardo Salas.

## Cambios incluidos

- Fixed: al registrar un gasto en una cuenta compartida, se excluyen todas las suscripciones push de quien lo registró; los demás miembros activos suscritos conservan la notificación.

## Datos y compatibilidad

- Migraciones incluidas y versión mínima: ninguna.
- Compatibilidad de API / Swagger: sin cambios de contrato público.
- Riesgos conocidos y mitigación: el filtrado usa el usuario registrador, no el pagador; la regresión cubre múltiples suscripciones del registrador y una suscripción de otro miembro.
- Estrategia de rollback o corrección hacia adelante: revertir el commit de release o desplegar el último tag sano.
- Tag sano/SHA de referencia para rollback: `v0.6.5` / `fb5776b6a128adfc59835596cc83edf8a780e1a2`.

## Evidencia de promoción

- `pnpm run version:check`: correcto para `0.6.6`.
- Build y pruebas: build de backend y frontend correcto; backend con 201 pruebas correctas y 8 integraciones omitidas; frontend con 93 pruebas correctas.
- Revisión técnica y QA funcional: revisión técnica independiente sin hallazgos críticos ni importantes; regresión de destinatarios push y presentación de versión en Configuración cubiertas por pruebas.
- GitHub Actions: pendiente.
- Netlify: pendiente.
- Health checks: pendiente.
