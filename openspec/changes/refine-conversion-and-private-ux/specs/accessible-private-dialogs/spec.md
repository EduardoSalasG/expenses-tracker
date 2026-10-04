## Purpose

Garantizar que avisos y diálogos privados de Expenses Tracker se operen con teclado, lector de pantalla y toque sin controles anidados ni pérdida de foco.

## ADDED Requirements

### Requirement: Avisos con acciones independientes
Un aviso privado que ofrezca una acción principal y descarte SHALL exponer controles independientes con nombres accesibles. MUST evitar un elemento interactivo que contenga otro control interactivo.

#### Scenario: Descartar un aviso de mensajería
- **WHEN** una persona navega por teclado o lector de pantalla hasta un aviso con acción y cierre
- **THEN** puede activar cada acción por separado y entiende su propósito sin controles anidados

### Requirement: Diálogo privado con foco gestionado
Un diálogo privado MUST anunciarse como modal, mover el foco a un elemento útil al abrirse, permitir cerrarse con Escape y devolver el foco al control que lo abrió. Sus acciones interactivas SHALL mantener objetivos táctiles de al menos 44 por 44 píxeles CSS.

#### Scenario: Abrir y cerrar el diálogo de Telegram
- **WHEN** una persona abre el detalle de conexión de Telegram y luego presiona Escape o usa cerrar
- **THEN** el diálogo se cierra y el foco vuelve al activador original
