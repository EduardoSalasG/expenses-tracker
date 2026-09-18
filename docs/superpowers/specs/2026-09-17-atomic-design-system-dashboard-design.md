# Diseño: sistema atómico financiero y dashboard orientado a decisiones

## Decisión

La interfaz conservará su identidad actual, pero incorporará una capa de tokens
semánticos y componentes Angular reutilizables. El dashboard priorizará salud
financiera y acciones del período antes del análisis visual. Gastos, categorías y
configuración adoptarán divulgación progresiva y deep links validados.

## Arquitectura

`styles.css` será la fuente de tokens de intención visual. Los componentes
standalone compartidos recibirán datos ya preparados y contenido localizado; no
harán consultas ni decidirán reglas de negocio. Las superficies los componen y
conservan la carga de datos en sus servicios y componentes actuales.

El dashboard calculará tarjetas de salud y prioridades desde el `report`, progreso
de presupuesto, cuotas y balances que ya carga. Una prioridad sólo se muestra si
lleva a una acción existente; no habrá nuevos endpoints ni señales persistidas.
La secuencia semántica será: período, salud, prioridades, actividad y análisis.

Los query params declararán sección de configuración y estado de filtros
secundarios. Cada valor se validará antes de alterar la vista; un valor inválido
vuelve al estado por defecto. Los enlaces internos preservarán período y cuenta
activa cuando sean pertinentes.

## Alternativas descartadas

- Un rediseño visual completo: demasiado riesgo para superficies que ya funcionan
  y no aporta a las decisiones financieras.
- Un `Card` universal con numerosas variantes: reduciría semántica, tipos y
  legibilidad frente a componentes financieros de responsabilidad única.
- Nuevas consultas para prioridades: aumentaría latencia y puede introducir
  incoherencias entre el resumen y los gráficos.
- Estado de filtros solamente en memoria: no permite enlaces, historial ni
  recuperación al volver atrás.

## Accesibilidad y responsive

Los controles mantienen foco visible, nombres localizados y objetivos de 44 px.
El orden DOM no cambia entre móvil y escritorio; sólo cambia la grilla. Las
alternativas textuales de Chart.js se mantienen. El cambio evita movimiento
decorativo y respeta `prefers-reduced-motion`.

## Pruebas y entrega

Cada helper de prioridades tendrá una prueba roja/verde. Los componentes
compartidos, deep links y filtros tendrán pruebas ChromeHeadless. La entrega
verifica las superficies afectadas a 320 px, móvil y escritorio, build frontend,
detector Impeccable y validación OpenSpec estricta. No hay migraciones: cada slice
puede revertirse mediante su commit en `dev`.

## Límites

No cambia contratos backend, permisos, cálculos, base de datos, Angular Material
ni Chart.js. El análisis del desfase productivo de suscripciones permanece fuera
de este cambio.
