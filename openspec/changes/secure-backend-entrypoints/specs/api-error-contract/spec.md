## Purpose

Entrega errores HTTP consistentes, seguros y utilizables por clientes, sin exponer detalles internos.

## ADDED Requirements

### Requirement: Clasificación de errores API
La API SHALL devolver códigos y códigos de error estables para validación, autenticación, autorización, ausencia, conflicto y reglas de dominio.

#### Scenario: Error de validación
- **WHEN** una solicitud autenticada contiene datos inválidos
- **THEN** la API SHALL responder 400 con un código de validación y detalle apto para el cliente

### Requirement: Aislamiento de fallos internos
La API MUST registrar internamente un fallo inesperado con identificador de correlación y MUST devolver al cliente un mensaje genérico sin stack, texto de proveedor ni datos de base de datos.

#### Scenario: Excepción no controlada
- **WHEN** una dependencia arroja una excepción inesperada
- **THEN** la API SHALL responder 500 con un identificador de correlación y sin el mensaje original
