# Handoff de próxima sesión — 2026-09-16

## Presupuesto de sesión

- Reportado por la persona usuaria al pausar: `220k / 258k` usados (aprox. 15 % restante).
- No abrir la matriz 4.1–4.2 como trabajo parcial: es el siguiente bloque grande y debe cerrarse con pruebas, auditoría, documentación y commit.

## Estado de ramas y árbol

- Rama activa: `dev`.
- Hay cambios locales sin commit, concentrados en `secure-backend-entrypoints` tareas 3.1–3.4.
- No descartar ni sobrescribir los cambios locales existentes.

## Trabajo completado en esta sesión

- OpenSpec `secure-backend-entrypoints`: 10/12 tareas completas; `openspec validate secure-backend-entrypoints --strict` aprobado.
- OTP: cooldown de 60 segundos; límite de 5 solicitudes por identidad y 20 por IP en 15 minutos; límite de 5 intentos de verificación; respuesta no enumerable; `429` con `Retry-After`.
- Estado OTP persistido con puerto y repositorios in-memory/PostgreSQL; nueva migración `database/migrations/039_otp_abuse_state.sql`.
- Rate limit extraído a `RateLimitStore` inyectable desde el contenedor.
- Contrato HTTP: `AppError`, adaptación Zod a `VALIDATION_ERROR`, request ID, 401/403 centralizados y 500 opaco.
- OpenAPI, README, Postman y diagrama OTP actualizados.

## Evidencia de verificación

- `pnpm --filter @expenses-tracker/backend test`: 106 pruebas aprobadas, 5 pruebas de integración PostgreSQL omitidas por no disponer del servicio.
- `pnpm --filter @expenses-tracker/backend build`: aprobado.
- `pnpm --filter @expenses-tracker/backend lint`: bloqueado por brecha preexistente: ESLint 9.39.4 no encuentra `eslint.config.*`.
- El bloqueo de lint está anotado bajo la tarea 3.4 del cambio OpenSpec.

## Siguiente bloque: tareas 4.1–4.2

### 4.1 Matriz de aislamiento por cuenta

- Crear pruebas de acceso cruzado para mutaciones de gastos, ingresos, bancos, métodos de pago y cuentas compartidas (invitaciones, liquidaciones y miembros).
- La evidencia estructural previa indica que finanzas pasa `tenantId` y `financialAccountId` a sus repositorios; cuentas compartidas usa membresía/rol en `FinancialAccountsUseCases`.
- Usar Codebase Memory primero y revisar cobertura antes de afirmar exhaustividad; los archivos relevantes tienen metadatos de índice desactualizados y deben leerse directamente.

### 4.2 Auditoría de logs

- Ejecutar flujos de fallo con logger capturable y confirmar que no se registran tokens, cuerpos de webhook ni secretos.
- Documentar explícitamente la omisión de integraciones PostgreSQL si sigue sin servicio disponible.

## Reglas de continuación

1. Solicitar/registrar el porcentaje de presupuesto antes de abrir 4.1–4.2.
2. Aplicar TDD: prueba roja observada antes de cambios de producción.
3. No marcar 4.1 o 4.2 hasta completar matriz/auditoría y actualizar el checkbox OpenSpec.
4. Al cerrar el bloque: ejecutar suite backend, build, validar OpenSpec y tratar el lint como brecha separada salvo que se autorice una slice de configuración ESLint.
