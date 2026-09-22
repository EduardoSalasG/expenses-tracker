## Why

El comando de lint del backend falla antes de analizar código porque ESLint 9 no encuentra una configuración flat. Esto deja sin control estático una superficie TypeScript que se modifica activamente y bloquea el cierre del cambio del worker inbound.

## What Changes

- Configurar ESLint flat para los archivos TypeScript del backend.
- Declarar el soporte TypeScript de lint como dependencia directa del backend.
- Incorporar una prueba de configuración que impida que el comando vuelva a fallar por ausencia de archivo de configuración.
- Mantener el alcance en tooling: no se cambian contratos de API, reglas de negocio ni comportamiento de ejecución.

## Capabilities

### New Capabilities

- Ninguna.

### Modified Capabilities

- Ninguna.

## Impact

- `backend/package.json` y el lockfile: dependencia de lint TypeScript.
- `backend/eslint.config.mjs`: configuración flat del análisis backend.
- Pruebas de infraestructura para comprobar que el comando de lint puede resolver su configuración.
