## Why

La captura de gastos por chat no reconoce aún la fecha del gasto como un dato explícito y puede guardar conceptos contaminados con fecha o banco. Además, aunque la IA conoce el idioma preferido, recibe nombres canónicos de categoría que pueden estar en inglés, lo que la lleva a esperar o devolver etiquetas que no corresponden al idioma de la persona.

## What Changes

- Interpretar la fecha del gasto en mensajes de chat mediante `ayer`, ISO `YYYY-MM-DD` y `D de mes [de AAAA]`; cuando no exista, usar la fecha actual.
- Exigir un banco configurado y resoluble para tarjeta o transferencia; asociar el gasto al banco y medio de pago correspondientes, y pedir aclaración si falta o no se reconoce.
- Separar fecha y banco del concepto persistido y comunicar los datos resueltos en la confirmación.
- Entregar a la IA las categorías y subcategorías con una etiqueta de presentación según `preferredLanguage`, manteniendo sus nombres canónicos y alias para una resolución estable.
- Hacer que la IA devuelva referencias canónicas de categoría, incluso cuando la persona habla o escribe en su idioma preferido.

## Capabilities

### New Capabilities

- `localized-chat-expense-capture`: Captura gastos por chat con fecha, asociación de banco y categorías presentadas e interpretadas según el idioma preferido de la persona.

### Modified Capabilities

- Ninguna.

## Impact

- Backend: parser de gastos, contrato del intérprete de mensajes, proveedor de IA, selección de bancos/medios de pago y caso de uso de mensajería inbound.
- Pruebas unitarias y de integración del flujo de interpretación y persistencia de gastos por chat.
- No se modifica la API pública ni se requieren migraciones: las asociaciones de banco y medio de pago ya existen.
