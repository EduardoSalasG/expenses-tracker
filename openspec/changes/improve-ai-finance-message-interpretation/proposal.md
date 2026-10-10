## Why

La captura conversacional no identifica siempre la categoría correcta y hoy no permite dirigir un gasto a otra cuenta dentro del mismo mensaje. Las cuotas ya existen, pero la interpretación debe conservar su comportamiento mientras mejora la seguridad y precisión de la captura.

## What Changes

- Añadir una preferencia de categoría persistente y aislada por cuenta financiera, compartida por los miembros de una cuenta compartida.
- Permitir que un gasto o ingreso nombre una cuenta accesible solo para esa operación, sin cambiar el contexto persistente del chat.
- Priorizar categoría explícita, luego preferencia aprendida y finalmente inferencia validada; ante incertidumbre, solicitar aclaración sin guardar.
- Aprender inmediatamente de correcciones explícitas y crear una preferencia por consenso después de tres movimientos confirmados consistentes.
- Mantener el respaldo determinista, la validación estructurada y el comportamiento existente de cuotas.

## Capabilities

### New Capabilities

- `ai-finance-message-interpretation`: Interpretación segura de mensajes financieros con cuenta en línea, categorías aprendidas por cuenta y aclaración obligatoria ante incertidumbre.

### Modified Capabilities

- Ninguna.

## Impact

- Backend: contrato Zod de interpretación, caso de uso inbound, nuevos puertos/repositorios y composición del contenedor.
- Datos: migración para preferencias de categoría por cuenta y proceso idempotente de consolidación histórica.
- Canales: comportamiento coherente para entradas WhatsApp y Telegram; el contexto persistente de Telegram no cambia por una cuenta en línea.
- Documentación y pruebas: README de mensajería, diagrama de interpretación, Vitest unitario e integración PostgreSQL.
