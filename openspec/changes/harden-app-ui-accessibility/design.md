## Context

Las rutas viven en una SPA Angular con páginas públicas y un shell autenticado. Los contratos existentes ya cubren navegación móvil, visualizaciones y filtros financieros; el código aún mezcla nombres ARIA localizados con cadenas inglesas, y `styles.css` aplica una anulación global de movimiento. Véanse `proposal.md` y sus delta specs.

## Goals / Non-Goals

**Goals:**

- Consolidar una única política accesible de labels, iconos, foco, estados y movimiento para todas las rutas.
- Conservar contratos de URL, filtros, navegación, datos y permisos existentes.
- Convertir el informe UX/UI en una matriz de aceptación repetible con datos locales.

**Non-Goals:**

- No rediseñar la identidad visual, modificar cálculos financieros, alterar APIs ni desplegar a producción.
- No reabrir requisitos ya verificados del shell o del resumen de filtros salvo que la auditoría detecte una regresión concreta.

## Decisions

### Matriz por rutas, no una pasada visual genérica

Se inventariarán las diez rutas declaradas y se asignará a cada una una comprobación de semántica, teclado, estado y anchos 320/390/escritorio. Las rutas autenticadas usarán el seed demo local y no credenciales o datos productivos. Se descarta una sola captura del dashboard: no valida formularios, vacíos, diálogos ni rutas públicas.

### Localización y semántica desde los contratos existentes

Las cadenas de nombre accesible se trasladarán a `I18nService` y se mantendrá el texto visible cuando ya exista. Los iconos se marcarán decorativos sólo cuando su contenedor aporte el mismo significado; las acciones conservarán un nombre explícito. Se descarta ocultar todos los iconos: algunos representan acciones independientes.

### Movimiento reducido específico

La regla global se reemplazará por reglas del componente o familia de interacción: sin traslación ni rebote cuando se reduce movimiento, con cambio estático u opacidad breve para conservar feedback. Se descarta añadir una librería de animación o restaurar movimiento por defecto sin preferencia.

### QA en capas

Los valores puros y plantillas tendrán pruebas unitarias; Playwright verificará navegación, teclado, diálogo, filtro y responsive con el stack local. Una pasada manual asistida revisará contraste, modo oscuro y preferencias del sistema que el navegador automatizado no pueda emular de forma fiable.

## Risks / Trade-offs

- [Etiquetas nuevas cambian snapshots o pruebas de plantilla] → actualizar sólo expectativas que expresen el contrato localizado y conservar ids/URLs estables.
- [Un icono se marque decorativo pese a aportar contexto] → revisar cada caso según el nombre accesible resultante del control, no sólo por su clase CSS.
- [Los datos demo no ejerciten un vacío o error] → incorporar fixtures controlados o interceptar la respuesta en la prueba sin tocar servicios productivos.
- [Preferencias del sistema no emulables en el navegador disponible] → documentar la limitación y confirmar el CSS computado en una pasada manual.

## Migration Plan

1. Añadir pruebas de contratos por ruta y de movimiento reducido antes de cada ajuste.
2. Aplicar los cambios en grupos coherentes: rutas públicas/auth, financieras y estilos compartidos.
3. Ejecutar build, pruebas afectadas y matriz Playwright local; registrar evidencia y limitaciones.
4. Desplegar como frontend compatible. El rollback es volver al artefacto frontend previo; no hay migración de datos.
