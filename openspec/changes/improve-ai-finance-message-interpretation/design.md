## Context

La interpretación actual recibe categorías y cuentas accesibles, valida la salida de IA y tiene un respaldo determinista. Sin embargo, la resolución de la cuenta se realiza después de la categoría en el guardado de gastos, y no existe memoria persistente de elecciones de categoría. Véase `proposal.md` para la motivación y la especificación delta para el contrato observable.

## Goals / Non-Goals

**Goals:**

- Resolver la cuenta efectiva antes de cargar catálogos, método de pago, división compartida o categorías.
- Mantener una memoria duradera por cuenta con precedencia explícita y consenso reproducible.
- Reutilizar los borradores y aclaraciones actuales sin guardar datos en decisiones ambiguas.
- Mantener las cuotas y el respaldo determinista sin ampliar datos enviados al proveedor de IA.

**Non-Goals:**

- No entrenar modelos, almacenar perfiles por persona ni enviar historial de transacciones a servicios externos.
- No cambiar el comando persistente de Telegram ni añadir una interfaz web para administrar preferencias en este cambio.
- No modelar intereses, distintos montos o calendarios no mensuales de cuotas.

## Decisions

### Resolver cuenta antes de cualquier dependencia con alcance de cuenta

El caso de uso resolverá el nombre de cuenta en línea contra las membresías accesibles y solo para el mensaje actual. Después cargará categorías, bancos, métodos de pago y reglas compartidas de esa cuenta. Esta decisión evita mezclar un catálogo Personal con un gasto destinado a Hogar. Se descarta reutilizar el cambio de contexto de Telegram porque alteraría conversaciones futuras y no cubre WhatsApp.

### Preferencia persistente por cuenta y señal normalizada

Una tabla de preferencias asociará cuenta, señal de concepto normalizada, categoría/subcategoría, origen, evidencia y auditoría. Una corrección explícita actualiza la preferencia inmediatamente; las observaciones no explícitas materializan consenso al llegar a tres coincidencias. Se descarta guardar una preferencia por usuario porque impediría el beneficio común de una cuenta compartida y contaminaría cuentas distintas de una misma persona.

### Orden de resolución explícito y conservador

La aplicación priorizará una categoría declarada por el mensaje, luego una preferencia, y finalmente la inferencia de IA o reglas. Los conflictos y la baja certeza se dirigirán al borrador de aclaración existente. Se descarta usar Other como valor por defecto porque ocultaría el error de interpretación y contradice el requisito de confirmación.

### IA con contexto mínimo y contrato ampliado

El contrato estructurado agregará el nombre opcional de cuenta para creación de gasto/ingreso y el proveedor recibirá solo cuentas y catálogos accesibles del mensaje actual. El historial se consolida internamente; no se transmite. Se descarta usar el historial como few-shot prompt por privacidad, costo y falta de control determinista.

## Risks / Trade-offs

- [Una señal de concepto demasiado amplia genera una preferencia incorrecta] → Normalizar de forma conservadora, dar prioridad a correcciones explícitas y pedir aclaración ante conflicto.
- [La migración o backfill aumenta el tiempo de despliegue] → Usar tabla/indexes idempotentes y ejecutar la consolidación en un comando controlado, no dentro de la migración crítica.
- [El mensaje puede nombrar una cuenta con coincidencia ambigua] → Aceptar únicamente una coincidencia normalizada única y solicitar corrección en cualquier otro caso.
- [La expansión del contrato del proveedor puede recibir respuestas antiguas] → Mantener campos opcionales, validación Zod y respaldo determinista.

## Migration Plan

1. Aplicar la migración de preferencias por cuenta antes de desplegar el código que las escribe.
2. Desplegar repositorios, resolución de cuenta y aprendizaje con lectura segura cuando la tabla está vacía.
3. Ejecutar el comando idempotente de consolidación histórica en un entorno controlado y registrar su resumen, sin enviar datos al proveedor de IA.
4. Verificar mensajes de cuenta en línea, corrección de categoría y cuotas con la matriz automatizada.
5. Para revertir, detener el uso de preferencias con el despliegue previo; conservar la tabla y datos para no perder correcciones. No ejecutar una eliminación de datos durante un rollback.
