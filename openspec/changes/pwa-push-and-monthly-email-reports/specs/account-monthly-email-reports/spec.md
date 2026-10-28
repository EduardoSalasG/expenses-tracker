## Purpose

Entrega a los participantes de cada cuenta una evaluación mensual privada, visual y explicable de su desempeño financiero.

## ADDED Requirements

### Requirement: Informe mensual por cuenta
El sistema SHALL generar un PDF por cuenta para el mes calendario cerrado con KPI deterministas, tablas, gráficos e insights explicables.

#### Scenario: Cuenta compartida
- **WHEN** corre el trabajo mensual
- **THEN** genera un informe común y entrega una copia individual a cada miembro activo con email

### Requirement: Entrega idempotente
El sistema SHALL registrar la entrega por cuenta, destinatario, canal y período para evitar duplicados en reintentos.

#### Scenario: Reejecución
- **WHEN** se reintenta el mismo período
- **THEN** omite destinatarios ya entregados y conserva los fallidos para reintento
