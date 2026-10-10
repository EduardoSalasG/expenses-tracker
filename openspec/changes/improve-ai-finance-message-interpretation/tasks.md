## 1. Preferencias persistentes por cuenta

- [x] 1.1 Crear la migración idempotente de preferencias de categoría por cuenta, con origen, evidencia, referencias de categoría/subcategoría e índice único por cuenta/señal; verificar con bootstrap local que la migración se aplica una sola vez.
- [x] 1.2 Añadir el puerto, servicio y repositorios PostgreSQL/en memoria para resolver preferencias explícitas y consenso de tres movimientos; verificar pruebas unitarias de normalización, prioridad explícita, umbral de tres y aislamiento entre cuentas.
- [x] 1.3 Componer el repositorio y servicio en el contenedor; verificar `pnpm --filter @expenses-tracker/backend build`.

## 2. Contrato de interpretación y cuenta en línea

- [x] 2.1 Extender el contrato validado de creación de gastos e ingresos con nombre de cuenta opcional y extracción determinista de `cuenta <nombre>`/`account <name>`; verificar que el marcador no quede en el concepto con pruebas de intérprete.
- [x] 2.2 Actualizar prompt, ejemplos y normalización del proveedor para aceptar solo cuentas accesibles del contexto actual sin transmitir historial; verificar pruebas del proveedor y el respaldo determinista ante respuesta inválida.

## 3. Resolución segura del movimiento conversacional

- [x] 3.1 Resolver la cuenta explícita antes de cargar catálogos y dependencias con alcance de cuenta; verificar en pruebas de WhatsApp y Telegram que el gasto se guarda en la cuenta accesible indicada sin cambiar el contexto persistente.
- [x] 3.2 Rechazar cuentas inexistentes, inaccesibles o ambiguas sin escritura financiera y con una respuesta correctiva; verificar que contexto y repositorios no cambian.
- [x] 3.3 Aplicar precedencia de categoría explícita, preferencia aprendida e inferencia validada; conservar borradores para incertidumbre y verificar que nunca se asigne Other automáticamente.
- [x] 3.4 Registrar correcciones explícitas de inmediato y observaciones confirmadas para consenso; verificar aprendizaje compartido dentro de cuenta compartida y aislamiento entre cuentas.
- [x] 3.5 Mantener cuotas y confirmaciones; verificar `3 cuotas`, `3x`, fecha explícita y la fecha del gasto como primera cuota predeterminada.

## 4. Consolidación histórica y documentación

- [x] 4.1 Implementar un comando idempotente de consolidación histórica por cuenta que cree solo preferencias no conflictivas con tres movimientos; verificar integración PostgreSQL y una segunda ejecución sin duplicados ni reemplazo de correcciones explícitas.
- [x] 4.2 Documentar sintaxis de cuenta en línea, aprendizaje, privacidad, aclaraciones y cuotas en el README y diagramas de mensajería; verificar enlaces/renderizado Mermaid y `git diff --check`.

## 5. Verificación integral

- [x] 5.1 Ejecutar la suite backend completa y el build; verificar `pnpm --filter @expenses-tracker/backend test` y `pnpm --filter @expenses-tracker/backend build` sin fallos.
- [x] 5.2 Ejecutar lint y las pruebas de integración de mensajería con base local; verificar `pnpm --filter @expenses-tracker/backend lint` y la prueba PostgreSQL de mensajes inbound.
