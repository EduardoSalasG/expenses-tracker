## MODIFIED Requirements

### Requirement: Interacción accesible y mobile-first
Los componentes y controles financieros MUST conservar foco visible, objetivos táctiles de al menos 44 por 44 píxeles CSS cuando sean interactivos, navegación por teclado y respeto de `prefers-reduced-motion`. Las acciones destructivas MUST exponer un nombre accesible localizado que identifique la eliminación y no las anuncie como una acción no relacionada.

#### Scenario: Acción prioritaria en móvil
- **WHEN** una persona activa una acción prioritaria mediante teclado o toque en un ancho de 320 píxeles
- **THEN** el control es alcanzable, describe su destino y no produce desplazamiento horizontal

#### Scenario: Acción destructiva anunciada
- **WHEN** una persona enfoca una acción para eliminar un elemento de un catálogo mediante lector de pantalla o teclado
- **THEN** el control comunica una acción de eliminación localizada y no se anuncia como cierre

### Requirement: Metadatos de transacción legibles en móvil
Las tarjetas y filas financieras MUST priorizar la categoría o subcategoría sobre banco y medio de pago en anchos móviles. Cuando exista una subcategoría, la clasificación visible MUST conservar su jerarquía categoría / subcategoría; los metadatos secundarios extensos SHALL truncarse o distribuirse sin ocultar esa clasificación ni producir desplazamiento horizontal.

#### Scenario: Banco con nombre extenso en móvil
- **WHEN** un gasto con banco de nombre largo se muestra a 320 píxeles de ancho
- **THEN** su ruta de categoría permanece visible y el banco o medio secundario no invade su espacio ni desborda horizontalmente

#### Scenario: Gasto con subcategoría
- **WHEN** una persona revisa un gasto clasificado en una subcategoría en una lista o tarjeta
- **THEN** puede distinguir la categoría raíz y la subcategoría sin depender del nombre del banco o del medio de pago
