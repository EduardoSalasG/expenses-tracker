## Why

La base PostgreSQL local está disponible, pero las pruebas de integración se omiten si no se habilitan expresamente y el seed demo no contiene movimientos útiles para QA manual. Se necesita una ruta repetible que ofrezca datos demo sin mezclar los datos aleatorios de pruebas.

## What Changes

- Ampliar el seed demo idempotente para crear datos financieros representativos de desarrollo.
- Añadir un comando de integración que use una base aislada en el PostgreSQL local y deje la base demo intacta.
- Documentar la preparación, ejecución y limpieza de ambos flujos.

## Capabilities

### New Capabilities

- Ninguna; es tooling y datos de desarrollo sin cambio de contrato de producto.

### Modified Capabilities

- Ninguna.

## Impact

- `database/seeds/001_demo.sql`, scripts de desarrollo, comandos raíz y documentación de base de datos.
- PostgreSQL local únicamente; no afecta producción, API ni migraciones.
