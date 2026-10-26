## ADDED Requirements

### Requirement: Entrega al destinatario de respuesta del evento inbound
El sistema SHALL entregar toda aclaración solicitada durante el procesamiento de un evento inbound al destinatario de respuesta indicado por el canal cuando exista. Cuando el evento no incluya ese destinatario, MUST usar el remitente del evento como reserva.

#### Scenario: Aclaración de categoría con destinatario de respuesta distinto
- **WHEN** un gasto inbound requiere seleccionar una categoría y su destinatario de respuesta difiere del remitente interno
- **THEN** el sistema entrega inmediatamente la pregunta de categoría al destinatario de respuesta y conserva el borrador para la selección posterior

