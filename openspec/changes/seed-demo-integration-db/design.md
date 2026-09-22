## Context

Las pruebas PostgreSQL existentes se activan con `RUN_DB_INTEGRATION_TESTS=true` y crean usuarios aleatorios. La instancia Docker local usa el puerto 6543, mientras que la URL de desarrollo por defecto usa 5432. El seed actual es opcional, idempotente y sólo crea usuarios/categorías.

## Goals / Non-Goals

**Goals:**

- Separar datos demo persistentes de los datos efímeros de integración.
- Hacer reproducible la ejecución local mediante un comando explícito.
- Mantener el seed seguro de ejecutar repetidamente.

**Non-Goals:**

- No insertar datos demo en producción ni cambiar el bootstrap de producción.
- No hacer que la suite ordinaria ejecute PostgreSQL sin una decisión explícita.

## Decisions

### Base de integración separada

Un script creará, preparará y eliminará una base temporal en el mismo servidor PostgreSQL local. Las pruebas se ejecutarán con una URL temporal y `RUN_DB_INTEGRATION_TESTS=true`, por lo que sus filas aleatorias no contaminan `expenses_tracker`.

Se descarta ejecutar las pruebas contra la base demo persistente porque deja datos de prueba e introduce dependencia entre ejecuciones.

### Seed demo idempotente y enfocado a QA

El SQL ampliará los usuarios demo existentes con cuenta financiera, categorías por defecto, movimientos de gasto/ingreso, cuotas y presupuesto de ejemplo mediante claves deterministas y conflictos controlados.

Se descarta usar el seed como fixture de pruebas automatizadas: los tests deben conservar aislamiento y crear sus propios datos.

## Risks / Trade-offs

- [El esquema evoluciona] → El script usará el runner de bootstrap actual y validará el seed en una base nueva.
- [Datos demo repetidos] → Las inserciones usan identificadores deterministas o `on conflict`.
- [Limpieza fallida] → El script intentará eliminar sólo la base temporal con nombre fijo y nunca la base demo.

## Migration Plan

1. Crear la prueba/runner de integración aislada y comprobar que falla antes de existir.
2. Ampliar y ejecutar el seed en una base demo local.
3. Ejecutar integraciones habilitadas, builds y la documentación asociada.
