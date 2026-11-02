## Context

Ver proposal.md y los deltas de especificación. El frontend no registra service worker; el backend ya posee cuentas, miembros activos, correo Resend y trabajos one-shot de reportes.

## Goals / Non-Goals

**Goals:** PWA instalable, Push autenticado e idempotente, y reporte mensual PDF por cuenta con scheduler versionado.

**Non-Goals:** Push para otros eventos, centro interno de notificaciones, PDFs públicos o insights por IA.

## Decisions

- Usar suscripción Web Push por dispositivo y claves VAPID en servidor; evita depender de una plataforma móvil propietaria. Alternativa: Firebase, descartada por introducir cuenta/proveedor externo.
- Persistir una outbox de entregas y usar workers; desacopla la transacción financiera de redes externas. Alternativa: envío síncrono, descartada por latencia y pérdida de confiabilidad.
- Procesar reportes por cuenta y entregar correos individualmente; satisface personal/compartida y no revela destinatarios. Alternativa: selección por preferencia de usuario actual, descartada por omitir participantes.
- Generar PDF temporal y adjuntarlo por correo; evita retención pública de datos financieros. Alternativa: URL compartida, descartada por privacidad.

## Risks / Trade-offs

- [Permiso denegado o navegador incompatible] → mantener experiencia web y ofrecer activación posterior en Configuración.
- [Endpoint Push caducado] → desactivar al recibir fallo permanente y registrar diagnóstico sanitizado.
- [Job interrumpido] → clave única de dispatch y reintento seguro.
- [PDF costoso] → límites por período, generación one-shot y liberación de buffers tras envío.

## Migration Plan

1. Aplicar migraciones de suscripciones, entregas y dispatches.
2. Desplegar API y workers con variables VAPID y correo validadas.
3. Activar scheduler mensual y verificar una ejecución de prueba idempotente.
4. Si falla, detener workers/scheduler; las tablas nuevas no cambian contratos existentes y se puede volver a la imagen previa.
