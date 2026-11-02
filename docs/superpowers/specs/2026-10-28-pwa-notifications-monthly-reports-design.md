# Diseño — PWA, notificaciones y reportes mensuales

**Fecha:** 2026-10-28  
**Estado:** aprobado para especificación; pendiente de revisión del documento antes de planificar e implementar.

## Objetivo

Convertir la aplicación web en una PWA instalable y habilitar dos canales de comunicación confiables:

- notificaciones Push en tiempo real para gastos creados en cuentas compartidas;
- un informe mensual en PDF, con KPI, tablas, gráficos e insights, enviado por correo a todos los miembros activos de cada cuenta.

La creación de un gasto nunca queda bloqueada por una notificación o por un fallo de entrega.

## Alcance y reglas de producto

### PWA y activación

- La aplicación incorporará manifiesto, iconos, service worker y caché de recursos de aplicación para ser instalable.
- Tras una sesión autenticada, la interfaz mostrará una invitación descartable para instalar la aplicación sólo cuando el navegador exponga la instalación como disponible.
- En iOS/Safari, cuando no exista un evento de instalación, la invitación explicará el flujo nativo de compartir y «Agregar a pantalla de inicio».
- Tras instalarse (o al detectar que ya se ejecuta en modo `standalone`), se mostrará una invitación separada para activar notificaciones. La llamada del permiso del navegador se hará únicamente al pulsar una acción explícita.
- Si el navegador no soporta Push o el usuario deniega el permiso, la aplicación seguirá funcionando y no repetirá la solicitud hasta que el usuario la reactive desde configuración.

### Gastos en cuentas compartidas

- Sólo un gasto creado en una cuenta de tipo `shared` genera una notificación Push.
- El destinatario es cada miembro con estado `active`, incluido el creador del gasto, y cada una de sus suscripciones de dispositivo activas.
- El título y cuerpo usan el idioma preferido del destinatario e incluyen cuenta, categoría o concepto y monto/currency. Ejemplo en español: `Gasto creado · Casa — Frutas y verduras · $5.000`.
- Al pulsar la notificación, la PWA abre el gasto o, si ya no está disponible, la cuenta correspondiente.
- No se enviarán datos de autenticación ni datos financieros no necesarios dentro del payload Push.

### Informe mensual

- Un job mensual se ejecuta en producción para el mes calendario recién cerrado; reemplaza la dependencia actual de un cron externo no versionado.
- El job procesa cada cuenta financiera, no cada usuario. Una cuenta personal produce un informe dirigido a su único miembro; una compartida, un informe común dirigido individualmente a todos los miembros activos que tengan email.
- Cada PDF incluye: período y cuenta; ingresos, gastos, saldo neto y variación contra el período previo cuando sea calculable; desgloses por categoría y moneda; evolución diaria o mensual pertinente; tabla de principales gastos; y 2–4 KPI/insights deterministas basados exclusivamente en datos del período.
- La ausencia de email se registra como destinatario omitido y no impide los demás envíos. Las direcciones no se exponen entre participantes.

## Arquitectura

### Cliente PWA

Angular registra el service worker de producción y entrega el manifiesto e iconos. Un worker propio, compatible con la estrategia de caché de Angular, procesa `push` y `notificationclick` mediante `showNotification` y navegación segura a una ruta interna.

Un `PwaEngagementService` encapsula detección de capacidad, estado de instalación, permiso, alta/baja de `PushSubscription` y persistencia de los banners descartados. El shell autenticado lo inicializa sólo en navegador, después de restaurar sesión. Los banners son accesibles, no bloqueantes y respetan idioma, navegación por teclado y reducción de movimiento.

### API y persistencia

Se añaden puertos y adaptadores para Push y renderización de PDF/correo. La API autenticada registra y revoca suscripciones del dispositivo, asociadas a usuario y endpoint único. Las claves VAPID permanecen sólo en configuración de servidor.

Nuevas entidades persistidas:

- `push_subscriptions`: usuario, endpoint, claves de cifrado, agente/plataforma opcional, estado, timestamps y error de baja.
- `notification_deliveries`: evento, cuenta, gasto opcional, suscripción, canal, estado, intento, error sanitizado y timestamps. Proporciona auditoría, deduplicación y reintento.
- `account_report_dispatches`: cuenta, destinatario, canal `email`, período, estado, intento, hash/metadata del artefacto y timestamps. Su clave única evita reenvíos de un mismo informe mensual.

El use case de creación de gasto publica un evento de dominio después de persistir el gasto. Un worker asíncrono resuelve los miembros activos y sus suscripciones, crea entregas idempotentes y llama al proveedor Web Push. Errores de entrega permanente desactivan la suscripción; errores transitorios quedan disponibles para reintento. La respuesta HTTP de crear gasto conserva su contrato y no espera el envío.

El worker de reportes deja de seleccionar únicamente usuarios con preferencias Telegram. Selecciona cuentas, construye datos agregados reutilizando los reportes financieros existentes, genera un PDF determinista, y entrega el correo individualmente mediante el proveedor de email existente extendido con adjuntos. La programación vive en el compose/deploy de producción y queda verificable con logs, estado de ejecución y alarmas; el job sigue siendo reintentable e idempotente.

### Flujo

```text
Crear gasto compartido
  -> persistir gasto
  -> encolar evento de notificación
  -> worker: miembros activos -> suscripciones activas
  -> proveedor Web Push -> service worker -> notificación -> ruta del gasto

Fin de mes
  -> scheduler versionado -> worker mensual
  -> cuenta -> datos/KPI/gráficos -> PDF
  -> miembros activos con email -> correo individual
  -> registro idempotente de entrega
```

## Seguridad, privacidad y resiliencia

- Push sólo opera bajo HTTPS; el permiso, suscripción y baja requieren sesión autenticada.
- Los endpoints de suscripción validan pertenencia del usuario y no admiten asociar dispositivos de terceros.
- Los payloads Push usan datos mínimos. La vista final obtiene detalles desde la API autenticada.
- Endpoint y claves de Push se tratan como secretos; nunca se registran completos.
- Las operaciones de entrega se deduplican por evento/destino y se reintentan con límites y telemetría. Un proveedor caído no afecta transacciones financieras.
- Los PDFs se generan temporalmente y se eliminan tras envío o se almacenan sólo si se define una política explícita de retención; la primera entrega no añadirá un archivo público ni enlaces compartibles.

## Experiencia, accesibilidad y compatibilidad

- Banners con acciones claras: instalar/ahora no y activar notificaciones/ahora no. Ninguno bloquea el dashboard.
- Las decisiones de posponer o denegar se recuerdan; habrá una ruta en Configuración para reactivar las notificaciones.
- El diseño se valida a 320 px, móvil representativo y escritorio; objetivos táctiles de al menos 44 px, foco visible, lector de pantalla y zoom.
- Con `prefers-reduced-motion`, banners y confirmaciones usarán transiciones de opacidad breves o estáticas.
- Para navegadores sin PWA/Push no habrá errores de consola ni llamadas fallidas repetidas; seguirá disponible email y el resto de la aplicación.

## Pruebas y evidencia de aceptación

- Unitarias: construcción de payload, elegibilidad de miembros, idempotencia, baja de suscripciones inválidas, KPI, datasets de gráficos y contenido de PDF.
- Integración: endpoints de suscripción, persistencia y autorización, creación de gasto sin esperar la entrega, worker de notificaciones, informe por cuenta y destinatarios de cuentas personal/compartida.
- Frontend: estados de instalación, permiso concedido/denegado/no soportado, control de banners, navegación desde notificación y traducciones.
- E2E/manual: Android Chrome y Safari/iOS donde esté disponible, instalación, permiso por gesto, recepción de Push, navegación al gasto y PDF recibido por cada miembro.
- Operaciones: deploy verifica que el scheduler mensual y workers requeridos están configurados, expone logs sanitizados y permite reintentar una ejecución sin duplicar correos.

## Fuera de alcance inicial

- Notificaciones Push para ingresos, ediciones, eliminaciones o mensajes.
- Preferencias de granularidad por tipo de evento.
- Centro de notificaciones dentro de la app.
- Almacenamiento histórico descargable de PDFs o enlaces públicos de informe.
- Insights generados por IA; los KPI son cálculos deterministas y explicables.

## Decisiones abiertas que el plan debe concretar

- Biblioteca concreta para producir PDF y gráficos de servidor, evaluada por compatibilidad con el runtime de despliegue y tamaño de artefacto.
- Mecanismo de scheduler de producción versionado (cron en infraestructura, servicio programado o workflow), sujeto a las capacidades reales del host.
- Política de retención de artefactos temporales y estrategia de reintento (máximo, backoff y alerta).
