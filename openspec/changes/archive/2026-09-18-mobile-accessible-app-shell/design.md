## Context

El shell Angular ya separa destinos principales de un menú móvil “Más”, pero no administra el foco del menú ni ofrece salto al contenido. El dashboard renderiza varios gráficos Chart.js que requieren una alternativa equivalente. Ver `proposal.md` para motivación.

## Goals / Non-Goals

**Goals:**
- Hacer el shell navegable con teclado, lector de pantalla y táctil sin cambiar rutas ni permisos.
- Ofrecer equivalentes textuales para las visualizaciones financieras existentes.
- Normalizar feedback y reduced motion en las superficies afectadas.

**Non-Goals:**
- No rediseñar el dominio financiero, sustituir Chart.js ni cambiar contratos backend.
- No introducir una librería de accesibilidad o preferencias persistidas nuevas.

## Decisions

1. El shell usará HTML semántico nativo (`a`, `button`, `main`) y `ViewChild` para transferir foco; evita un gestor externo y conserva el patrón Angular standalone.
2. La navegación móvil conservará sus cuatro opciones visuales, pero el menú secundario tomará/devolverá foco explícitamente. Alternativa descartada: focus trap; sería incorrecto para un menú no modal.
3. Las alternativas de gráficos se derivarán del mismo estado que alimenta Chart.js, en resumen y tabla/`details`, evitando una segunda consulta y divergencia de datos.
4. Reduced motion se implementará con media query global y sin ocultar texto/estados; una preferencia guardada sería más costosa y no está requerida.

## Risks / Trade-offs

- [Foco perdido al navegar] → el enlace de salto y el menú usan elementos nativos y pruebas ChromeHeadless de foco.
- [Duplicar contenido de gráficos] → la alternativa textual usa los datos ya normalizados del componente.
- [Mayor altura móvil] → las alternativas detalladas permanecerán colapsables, dejando un resumen siempre visible.

## Migration Plan

1. Entregar y validar el shell accesible con pruebas de teclado y breakpoints.
2. Entregar equivalentes textuales de dashboard y estados de feedback.
3. Desplegar como cambio compatible; rollback consiste en revertir el commit del slice sin migraciones ni datos persistidos.
