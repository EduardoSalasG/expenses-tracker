## Purpose

Permite identificar sin ambigüedad quién realizó el pago de un gasto compartido y registrar nuevos gastos con un reparto inicial acorde al uso habitual.

## ADDED Requirements

### Requirement: Atribución del pagador original en gastos compartidos
La aplicación SHALL mostrar, para cada gasto de una cuenta compartida, el nombre localizado de la persona que realizó el pago original, independiente de quién registró el movimiento.

#### Scenario: Pagador y registrador diferentes
- **WHEN** un integrante registra un gasto compartido pagado originalmente por otro integrante
- **THEN** la lista de gastos identifica al pagador original y no atribuye ese dato al registrador

#### Scenario: Gasto de una cuenta personal
- **WHEN** la cuenta activa no es compartida
- **THEN** la lista no muestra un metadato de pagador compartido

### Requirement: Reparto inicial equitativo de gastos compartidos
Al crear un gasto nuevo en una cuenta compartida, el formulario SHALL seleccionar `equal` como modo de reparto y calcular partes iguales entre los integrantes activos.

#### Scenario: Creación de gasto compartido
- **WHEN** una persona abre el formulario para crear un gasto en una cuenta compartida
- **THEN** el reparto inicial es partes iguales y las asignaciones se ajustan al monto ingresado

#### Scenario: Edición de un gasto existente
- **WHEN** una persona abre un gasto compartido existente para editarlo
- **THEN** el formulario conserva el modo de reparto almacenado
