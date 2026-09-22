## ADDED Requirements

### Requirement: Metadatos de transacción legibles en móvil
Las tarjetas y filas financieras MUST priorizar la categoría o subcategoría sobre banco y medio de pago en anchos móviles. Los metadatos secundarios extensos SHALL truncarse o distribuirse sin ocultar la categoría ni producir desplazamiento horizontal.

#### Scenario: Banco con nombre extenso en móvil
- **WHEN** un gasto con banco de nombre largo se muestra a 320 píxeles de ancho
- **THEN** su categoría permanece visible y el banco o medio secundario no invade su espacio ni desborda horizontalmente
