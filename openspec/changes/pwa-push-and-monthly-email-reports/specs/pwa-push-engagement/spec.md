## Purpose

Permite instalar la aplicación y recibir de forma segura avisos oportunos de gastos de cuentas compartidas.

## ADDED Requirements

### Requirement: Activación PWA y consentimiento
La aplicación SHALL ofrecer instalación y permiso de notificaciones como acciones separadas y no bloqueantes después de autenticar al usuario.

#### Scenario: Permiso mediante gesto
- **WHEN** una persona instalada pulsa activar notificaciones
- **THEN** el sistema solicita permiso y registra la suscripción sólo si se concede

#### Scenario: Instalación manual en iOS
- **WHEN** una persona autenticada usa la aplicación desde iPhone o iPad fuera del modo standalone
- **THEN** el sistema SHALL mostrar instrucciones accesibles para usar Compartir y agregar la aplicación a la pantalla de inicio, sin depender de `beforeinstallprompt`

#### Scenario: PWA instalada en iOS
- **WHEN** la aplicación se abre desde la pantalla de inicio de iOS y el permiso está pendiente
- **THEN** el sistema SHALL reconocer el modo standalone nativo y ofrecer la activación de notificaciones mediante una acción explícita

### Requirement: Aviso de gasto compartido
El sistema SHALL notificar a cada dispositivo suscrito de miembros activos, incluido el creador, al crear un gasto en una cuenta compartida.

#### Scenario: Gasto creado
- **WHEN** se persiste un gasto de cuenta compartida
- **THEN** cada destinatario recibe título, cuenta, detalle, monto y una navegación autenticada al gasto

#### Scenario: Fallo de entrega
- **WHEN** un proveedor Push falla
- **THEN** el gasto permanece creado y la entrega queda registrada para reintento
