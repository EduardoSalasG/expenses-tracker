## Purpose

Garantiza que los gastos de cuentas compartidas avisen a los miembros pertinentes sin notificar redundante e innecesariamente a quien los registró.

## ADDED Requirements

### Requirement: Notificar solo a miembros distintos del registrador

Al crear un gasto en una cuenta compartida, el sistema SHALL encolar una notificación push para cada suscripción activa de los miembros con estado activo cuyo identificador de usuario sea distinto al del usuario que registró el gasto. El sistema MUST excluir todas las suscripciones del registrador, incluso cuando también sea quien pagó el gasto.

#### Scenario: Gasto registrado por un miembro con suscripción

- **WHEN** un miembro activo registra un gasto en una cuenta compartida y tanto él como otro miembro activo tienen suscripciones push activas
- **THEN** el sistema encola notificaciones solo para las suscripciones del otro miembro

#### Scenario: Gasto registrado en cuenta personal

- **WHEN** un usuario registra un gasto en su cuenta personal
- **THEN** el sistema no encola notificaciones push de gasto compartido
