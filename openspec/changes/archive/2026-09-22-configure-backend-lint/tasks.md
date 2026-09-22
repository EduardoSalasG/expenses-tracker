## 1. Configuración reproducible

- [x] 1.1 Añadir soporte TypeScript de lint como dependencia directa del backend y verificar una instalación congelada con `pnpm install --frozen-lockfile`.
- [x] 1.2 Crear la configuración flat versionada, limitada a `backend/src/**/*.ts`, y verificar que ESLint resuelve el archivo con `pnpm --filter @expenses-tracker/backend lint`.

## 2. Cierre de calidad

- [x] 2.1 Corregir únicamente los hallazgos de lint que impidan el gate y verificar que el comando lint termina con código cero.
- [x] 2.2 Ejecutar lint, test y build backend, validar estrictamente OpenSpec y revisar el diff; verificar que todos los comandos finalizan correctamente.
