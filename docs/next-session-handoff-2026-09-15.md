# Handoff de próxima sesión — 2026-09-15

## Estado de ramas

- `dev` y `origin/dev`: `e743f7e`.
- `main` y `origin/main`: `220df01`.
- No promover `dev` todavía: quedan tareas críticas de seguridad y no se ha preparado una release SemVer completa.

## Trabajo integrado en `dev`

- `1b080ba fix: restrict Telegram link token issuance`
  - eliminó la emisión HTTP anónima de tokens de enlace Telegram;
  - actualizó Swagger, Postman, README y checklist.
- `bc992cb fix: enforce production webhook configuration`
  - rechazó configuración productiva con JWT/base de datos de desarrollo, CORS comodín o Telegram sin secreto;
  - ocultó el webhook Telegram cuando no existe secreto;
  - actualizó `.env.example`, README y operaciones.
- `f0c4be7 docs: define semantic release traceability`
  - incorporó política SemVer, changelog y requisitos futuros de versión visible en Configuración.

## OpenSpec

### `secure-backend-entrypoints` — 6/12 tareas

Completadas:

- vínculo Telegram seguro (1.1–1.3);
- configuración y rutas Telegram de producción (2.1–2.3).

Pendientes, en orden:

1. Abuso/OTP: pruebas de cooldown y rate limit, store testeable, 429 con `Retry-After`, respuesta no enumerable (3.1–3.2).
2. Contrato de errores: `AppError`, adaptación Zod, request ID, middleware opaco, Swagger/Postman (3.3–3.4).
3. Revisión de aislamiento por cuenta y sanitización de logs (4.1–4.2).

### Cambios aún solo propuestos

- `durable-webhook-operations`
- `mobile-accessible-app-shell`
- `atomic-design-system-dashboard`

Antes de implementarlos, completar sus artifacts OpenSpec (`specs`, `design`, `tasks`), validar con `openspec validate <change> --strict` y usar el flujo de diseño/planificación definido en `AGENTS.md`.

### Cambio por crear

Crear un cambio OpenSpec para versionado/release y versión visible en Configuración. Debe cubrir:

- versión coherente en manifiestos relevantes y frontend;
- `CHANGELOG.md` con `Unreleased` y secciones Keep a Changelog;
- incremento SemVer decidido antes de cada promoción;
- tag Git anotado `vX.Y.Z` sobre el commit exacto promovido a `main`;
- notas de release con SHA, migraciones, riesgos y resultado de health checks;
- rollback al último tag sano sin reescribir historial.

## Documentación de referencia

- `AGENTS.md`: flujo obligatorio, SemVer y tags.
- `docs/versioning.md`: política detallada, release y rollback.
- `CHANGELOG.md`: registro humano por versión.
- `docs/operations.md`: requisitos de configuración productiva.

## Verificación conocida

- Última verificación backend: 94 pruebas aprobadas; 5 integraciones PostgreSQL omitidas por no disponer del servicio de integración.
- Build backend TypeScript aprobado.
- `openspec validate secure-backend-entrypoints --strict` aprobado.
- `pnpm --filter @expenses-tracker/backend lint` no ejecutable actualmente: ESLint 9.39.4 no encuentra `eslint.config.*` ni `.eslintrc`. Es una brecha preexistente; crear una slice separada para configurarlo, con prueba/validación de baseline.
- Karma/Chrome requiere ejecutar Angular fuera del sandbox. Usar el comando elevado aprobado `cmd.exe /c pnpm --filter @expenses-tracker/frontend test`.

## Reglas para la siguiente ejecución

1. Consultar el límite de 5 horas antes de abrir una slice y reservar margen para pruebas, documentación y commit.
2. Usar Codebase Memory primero y validar cobertura antes de afirmaciones estructurales.
3. Aplicar TDD: prueba roja observada antes de código de producción.
4. Mantener cada slice pequeña, documentada y con commit en `dev`.
5. Promover a `main` solo después de la compuerta de release; etiquetar y supervisar el despliegue de producción.
