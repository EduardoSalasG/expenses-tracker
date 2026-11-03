# Notas de release — v0.6.5

## Identificación

- Versión SemVer: `0.6.5` (PATCH).
- Tag anotado: `v0.6.5`.
- SHA inmutable de `main`: pendiente de promoción.
- Fecha y responsable: 2026-11-03, Eduardo Salas.

## Cambios incluidos

- Changed: se añade un favicon SVG con una `E` azul marino (`#0B1F3A`) centrada sobre fondo azul claro (`#93C5FD`), alineado con la identidad visual de la aplicación.

## Datos y compatibilidad

- Migraciones incluidas y versión mínima: ninguna.
- Compatibilidad de API / Swagger: sin cambios.
- Riesgos conocidos y mitigación: los navegadores que no soporten SVG conservan su comportamiento habitual sin un favicon específico.
- Estrategia de rollback o corrección hacia adelante: revertir el commit de release o desplegar el último tag sano.
- Tag sano/SHA de referencia para rollback: `v0.6.4` / `51e0891abe56abbf1b6997b6927fe4e811f4fda1`.

## Evidencia de promoción

- `pnpm run version:check`: correcto para `0.6.5`.
- Build y pruebas: build completo de backend y frontend correcto. El backend completó 200 pruebas; 8 pruebas de integración permanecen omitidas. El runner ChromeHeadless del frontend no pudo iniciar por acceso denegado a `GPUPersistentCache`; excepción de promoción autorizada por el responsable.
- Revisión técnica y QA funcional: revisión estática del SVG confirma una caja de `E` centrada y la referencia se carga desde `index.html`; la validación visual automatizada queda bloqueada junto al runner ChromeHeadless.
- GitHub Actions: pendiente.
- Netlify: pendiente.
- Health checks: pendiente.
