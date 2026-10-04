## Purpose

Garantiza que cada ruta pública y autenticada se pueda comprender, recorrer y recuperar de fallos con teclado, lector de pantalla y pantalla pequeña.

## ADDED Requirements

### Requirement: Semántica y nombres localizados por página
Cada ruta pública y autenticada SHALL exponer un título de página, landmarks y controles interactivos con nombres accesibles localizados. Los iconos decorativos MUST quedar fuera del nombre accesible y los iconos que disparan acciones MUST comunicar su acción antes de activarse.

#### Scenario: Recorrido con lector de pantalla
- **WHEN** una persona recorre landing, acceso, términos, privacidad, dashboard, gastos, ingresos, presupuestos, categorías o configuración con lector de pantalla
- **THEN** puede identificar el propósito de la página, sus regiones y cada acción sin recibir nombres técnicos, duplicados ni cadenas en otro idioma

### Requirement: Estados recuperables por página
Las páginas que cargan o mutan datos SHALL mostrar y anunciar un estado localizado de carga, éxito, error o vacío que describa la siguiente acción disponible. El estado MUST conservarse visible sin depender sólo de color, movimiento o una notificación transitoria.

#### Scenario: Consulta sin resultados
- **WHEN** una búsqueda o filtro válido no devuelve registros
- **THEN** la página comunica que no hay resultados, conserva los filtros aplicados y ofrece una acción clara para ajustarlos o limpiarlos

#### Scenario: Fallo recuperable
- **WHEN** una consulta o acción de una página falla
- **THEN** el error explica el problema en lenguaje claro y ofrece reintentar, corregir o volver a una ruta segura sin perder contexto innecesariamente

### Requirement: Uso responsive y por teclado verificado
Cada ruta SHALL permanecer operable a 320 px, 390 px y escritorio, sin desplazamiento horizontal causado por su contenido. Los controles interactivos MUST ser alcanzables por teclado, conservar foco visible y ofrecer objetivos táctiles de al menos 44 por 44 píxeles CSS cuando la densidad lo permita.

#### Scenario: Ruta móvil estrecha
- **WHEN** una persona usa una ruta a 320 píxeles de ancho
- **THEN** puede leer el contenido prioritario, accionar sus controles y volver o avanzar sin recorte ni desplazamiento horizontal
