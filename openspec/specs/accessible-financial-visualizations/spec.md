# accessible-financial-visualizations Specification

## Purpose

Hace que los análisis financieros expresados en gráficos estén disponibles también como información textual navegable y comparable.

## Requirements

### Requirement: Alternativa textual para gráficos financieros
Cada gráfico financiero SHALL ofrecer un resumen localizado y una alternativa textual navegable que comunique las mismas categorías, periodos y valores relevantes.

#### Scenario: Lector de pantalla consulta un gráfico
- **WHEN** una persona llega a un gráfico mediante lector de pantalla
- **THEN** puede identificar su propósito, resumen y valores sin interpretar información visual

#### Scenario: Datos vacíos
- **WHEN** un gráfico no tiene datos para el periodo seleccionado
- **THEN** la alternativa textual comunica el estado vacío localizado
