## Context

El frontend Angular tiene componentes standalone, tokens de marca parciales y
componentes compartidos puntuales. Dashboard concentra carga de datos, métricas,
gráficos y comportamiento visual; gastos, categorías y configuración repiten
patrones de panel, feedback y control. La indexación estructural está desfasada,
por lo que las decisiones se validarán contra fuente antes de cada edición. Ver
`proposal.md` para la motivación y las especificaciones de esta propuesta para el
contrato observable.

## Goals / Non-Goals

**Goals:**
- Convertir los patrones financieros repetidos en una capa semántica estable y
  componentes Angular pequeños, localizables y accesibles.
- Hacer que dashboard responda primero a decisiones del período y luego a análisis.
- Hacer que los filtros y la configuración puedan profundizarse sin saturar móvil.

**Non-Goals:**
- No modificar contratos backend, persistencia, permisos ni cálculos financieros.
- No reemplazar Angular Material, Chart.js ni la identidad visual actual.
- No migrar todas las pantallas en un único paso ni añadir una dependencia de UI.

## Decisions

1. **Tokens semánticos sobre los tokens de marca existentes.** Se añadirán tokens
   CSS para intención (`surface`, `emphasis`, `success`, `warning`, `danger`,
   `focus`) y escala, y los componentes los consumirán. Evita una migración masiva
   de colores crudos; se descartó un rediseño completo porque rompería superficies
   estabilizadas y elevaría el riesgo visual.

2. **Componentes por responsabilidad, no un kit genérico.** Se crearán átomos y
   moléculas financieras de propósito limitado: tarjeta de métrica, prioridad
   accionable, encabezado de sección y contenedor de divulgación. Cada uno recibe
   texto/localización y contenido, sin consultar APIs. Se descartó un único
   `Card` configurable porque concentraría demasiadas variantes y ocultaría la
   semántica del dominio.

3. **Dashboard derivado del estado ya cargado.** Las prioridades se computarán de
   `report`, progreso de presupuesto, cuotas y balances ya presentes. No habrá
   consultas extras ni heurísticas persistidas. Las prioridades usan rutas
   existentes con query params de contexto cuando proceda.

4. **Jerarquía de decisión mobile-first.** Cabecera y controles de período,
   salud financiera, prioridades, actividad reciente y análisis visual se
   ordenarán así en un flujo vertical. En escritorio se enriquecerá la grilla, no
   se cambiará el orden semántico. Las transiciones no esenciales respetarán
   `prefers-reduced-motion`; no se añadirán gestos ni movimiento decorativo.

5. **Estado de URL como contrato de navegación.** Las secciones de configuración
   y filtros secundarios usarán parámetros explícitos, con valores validados y
   degradación al estado por defecto. Esto permite deep links y retroceso del
   navegador. Se descartó estado exclusivamente en memoria porque no es enlazable.

## Risks / Trade-offs

- [Una migración parcial deja estilos antiguos] → migrar primero las cuatro
  superficies objetivo y prohibir nuevos valores crudos en los componentes nuevos.
- [Las prioridades se perciben como ruido] → mostrar solo señales accionables,
  limitar su cantidad y conservar análisis colapsable.
- [Query params inválidos] → validar contra secciones y filtros permitidos antes
  de modificar el estado de la vista.
- [Foco se pierde al expandir contenido] → usar controles nativos, foco programado
  sólo para navegación explícita y pruebas ChromeHeadless.

## Migration Plan

1. Añadir tokens y componentes con pruebas aisladas, sin migrar rutas.
2. Reestructurar dashboard con los datos actuales y mantener gráficos/tablas.
3. Aplicar divulgación y deep links en gastos, categorías y configuración.
4. Verificar móvil 320 px, móvil representativo y escritorio; compilar frontend,
   ejecutar pruebas afectadas y detector visual.
5. Rollback: revertir los commits de cada slice; no existen migraciones ni datos
   persistidos asociados.
