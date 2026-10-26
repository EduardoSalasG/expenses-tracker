## Purpose

Garantiza que una fecha explícita enviada al completar un borrador de gasto reemplace la fecha implícita usada mientras esa fecha no había sido indicada.

## ADDED Requirements

### Requirement: Fecha explícita posterior prevalece sobre una fecha implícita
El sistema SHALL reemplazar la fecha implícita de un gasto pendiente cuando la persona envíe una fecha explícita al completar otro dato del borrador. Una respuesta que no incluya fecha explícita MUST conservar la fecha existente.

#### Scenario: Fecha localizada durante la confirmación de otro dato
- **WHEN** un gasto pendiente tiene la fecha actual por defecto y la persona responde `el 24 de octubre` mientras completa otro campo
- **THEN** el gasto usa el 24 de octubre del año de contexto en lugar de la fecha por defecto

#### Scenario: Respuesta sin fecha
- **WHEN** un gasto pendiente recibe una respuesta que no contiene fecha explícita
- **THEN** el sistema conserva su fecha existente

#### Scenario: Fecha explícita previamente registrada
- **WHEN** un borrador persistido tiene una fecha explícita y recibe una respuesta posterior con otra fecha explícita
- **THEN** el sistema conserva la fecha explícita previamente registrada
