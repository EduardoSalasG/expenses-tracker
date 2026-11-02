## 1. Base PWA y consentimiento

- [x] 1.1 Configurar manifiesto, assets, service worker y caché de producción; verificar build Angular genera manifiesto y ngsw.json.
- [x] 1.2 Implementar servicio y banners de instalación/permiso con i18n, teclado, 44 px y movimiento reducido; verificar pruebas frontend para instalado, denegado y no soportado.
- [x] 1.3 Añadir configuración VAPID y endpoints autenticados para registrar/revocar dispositivos; verificar pruebas HTTP de autorización y validación Zod.

## 2. Entrega Push de gastos compartidos

- [x] 2.1 Crear migraciones y repositorios para suscripciones y outbox de entregas; verificar índices únicos y pruebas PostgreSQL.
- [x] 2.2 Publicar evento tras persistir gasto compartido y ejecutar worker idempotente; verificar que POST /expenses responde aunque falle Push.
- [x] 2.3 Configurar worker y observabilidad de producción; verificar Compose y logs sanitizados de éxito, reintento y endpoint inválido.

## 3. Informes mensuales PDF por cuenta

- [x] 3.1 Crear dispatches por cuenta/destinatario/período y extender correo con adjuntos; verificar idempotencia y base64 PDF en prueba del proveedor.
- [x] 3.2 Construir modelo KPI, tablas, gráficos y renderer PDF determinista; verificar valores multi-moneda, insights condicionados y cabecera PDF.
- [x] 3.3 Implementar job por cuenta y destinatarios activos con email; verificar cuenta personal, compartida, omisión de email y reintento sin duplicados.

## 4. Operación y calidad

- [x] 4.1 Versionar scheduler mensual y documentación operativa; verificar configuración de despliegue y ejecución one-shot idempotente.
- [ ] 4.2 Ejecutar pruebas backend/frontend, builds, e2e PWA y revisión móvil 320 px/móvil/escritorio; verificar accesibilidad y navegación desde notificación.
- [x] 4.3 Actualizar Swagger, README, diagramas, changelog y versión de release; verificar release:verify y git diff --check.
