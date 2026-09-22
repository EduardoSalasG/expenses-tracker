# atomic-finance-design-system Specification

## Purpose

Define un lenguaje visual semántico y componentes reutilizables para que las superficies financieras mantengan consistencia, accesibilidad y respuesta móvil.

## Requirements

### Requirement: Sistema de tokens semánticos reutilizable
El frontend SHALL exponer tokens semánticos para superficies, texto, bordes, estados financieros, espaciado, radios y foco, sin depender de colores o medidas crudas en los nuevos componentes compartidos.

#### Scenario: Estado financiero consistente
- **WHEN** una superficie muestra un estado de alerta, éxito o información
- **THEN** utiliza el token semántico correspondiente y conserva contraste legible en los temas soportados

### Requirement: Componentes financieros composables
El frontend SHALL ofrecer componentes reutilizables para métricas, estados de prioridad, encabezados de sección y estados vacíos que acepten contenido localizado sin fijar contratos de dominio ni rutas específicas.

#### Scenario: Métrica reutilizada
- **WHEN** dashboard, gastos, categorías o configuración necesitan comunicar una métrica o estado
- **THEN** pueden usar el mismo componente con etiqueta, valor, contexto y semántica accesible consistentes

### Requirement: Interacción accesible y mobile-first
Los componentes compartidos MUST conservar foco visible, objetivos táctiles de al menos 44 por 44 píxeles CSS cuando sean interactivos, navegación por teclado y respeto de `prefers-reduced-motion`.

#### Scenario: Acción prioritaria en móvil
- **WHEN** una persona activa una acción prioritaria mediante teclado o toque en un ancho de 320 píxeles
- **THEN** el control es alcanzable, describe su destino y no produce desplazamiento horizontal

### Requirement: Metadatos de transacción legibles en móvil
Las tarjetas y filas financieras MUST priorizar la categoría o subcategoría sobre banco y medio de pago en anchos móviles. Los metadatos secundarios extensos SHALL truncarse o distribuirse sin ocultar la categoría ni producir desplazamiento horizontal.

#### Scenario: Banco con nombre extenso en móvil
- **WHEN** un gasto con banco de nombre largo se muestra a 320 píxeles de ancho
- **THEN** su categoría permanece visible y el banco o medio secundario no invade su espacio ni desborda horizontalmente
