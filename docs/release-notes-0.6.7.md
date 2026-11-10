# Notas de release — v0.6.7

## Identificación

- Versión SemVer: `0.6.7` (PATCH).
- Tag anotado: `v0.6.7`.
- SHA inmutable de `main`: pendiente de promoción.
- Fecha y responsable: 2026-11-10, Eduardo Salas.

## Cambios incluidos

- Added: edición manual de los nombres en español e inglés para categorías personalizadas.
- Fixed: el chat resuelve y presenta las categorías usando el idioma preferido; los nombres manuales no son sustituidos por el traductor automático.

## Datos y compatibilidad

- Migraciones incluidas y versión mínima: ninguna.
- Compatibilidad de API / Swagger: se añade `PUT /categories/{categoryId}/translations`, autenticado y limitado a categorías personalizadas de la cuenta activa.
- Riesgos conocidos y mitigación: los nombres manuales deben completarse en ambos idiomas; el diálogo los precarga desde el nombre existente para evitar valores vacíos.
- Estrategia de rollback o corrección hacia adelante: revertir el commit de release o desplegar el último tag sano.
- Tag sano/SHA de referencia para rollback: `v0.6.6` / `f97cc98b95d5dfd98854bb6973b5faa8af9d7085`.

## Evidencia de promoción

- `pnpm run version:check`: pendiente de release.
- Build y pruebas: backend con 204 pruebas correctas y 8 integraciones omitidas; frontend con 94 pruebas correctas; ambos builds correctos.
- Revisión técnica y QA funcional: contrato HTTP, persistencia manual y selección localizada cubiertos por pruebas automatizadas.
- GitHub Actions: pendiente.
- Netlify: pendiente.
- Health checks: pendiente.
