## Purpose

Permite instalar la aplicación y recibir de forma segura avisos oportunos de gastos de cuentas compartidas.

## ADDED Requirements

### Requirement: Activación PWA y consentimiento
La aplicación SHALL ofrecer instalación y permiso de notificaciones como acciones separadas y no bloqueantes después de autenticar al usuario.

#### Scenario: Permiso mediante gesto
- **WHEN** una persona instalada pulsa activar notificaciones
- **THEN** el sistema solicita permiso y registra la suscripción sólo si se concede

### Requirement: Aviso de gasto compartido
El sistema SHALL notificar a cada dispositivo suscrito de miembros activos, incluido el creador, al crear un gasto en una cuenta compartida.

#### Scenario: Gasto creado
- **WHEN** se persiste un gasto de cuenta compartida
- **THEN** cada destinatario recibe título, cuenta, detalle, monto y una navegación autenticada al gasto

#### Scenario: Fallo de entrega
- **WHEN** un proveedor Push falla
- **THEN** el gasto permanece creado y la entrega queda registrada para reintento
