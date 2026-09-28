## Context

La landing actual ya dispone de SSR/prerender, rutas ES/EN, etiquetas sociales y un sistema de tokens visuales. El shell, los componentes de estado y las superficies financieras reutilizan Angular Material, Tailwind y componentes compartidos. Ver `proposal.md` para la motivación y los delta specs para el contrato observable.

## Goals / Non-Goals

**Goals:**
- Reducir la carga cognitiva pública y privada sin perder caminos funcionales existentes.
- Resolver los defectos de semántica/foco detectados en el aviso y diálogo de Telegram.
- Mantener la aplicación mobile-first, localizada, compatible con SSR y sin cambios de API.
- Hacer que los nuevos mensajes de confianza sean comprobables en el producto y su documentación.

**Non-Goals:**
- No rediseñar la marca, modificar datos financieros, crear una integración bancaria ni introducir persuasión manipulativa.
- No eliminar gráficos, filtros soportados, idiomas, cuentas compartidas ni canales de autenticación.
- No añadir dependencias de terceros ni cambiar rutas públicas o privadas.

## Decisions

### Landing de resultado, no de catálogo

La portada usará una secuencia corta: resultado financiero, una CTA primaria, una vista previa localizada marcada como ilustrativa, tres pasos compactos y un cierre. El login seguirá disponible como enlace secundario; las CTA repetidas se reducirán a acciones consistentes.

Se conserva la vista previa porque hace tangible el valor antes de registrarse. Se descarta añadir testimonios, contadores o urgencia: no hay evidencia verificable para esas afirmaciones y contradicen la confianza buscada.

### SEO estático y seguro para SSR

Se extenderá la metadata existente con `og:image` y JSON-LD de software/producto generado desde los datos públicos localizados. El contenido se inyectará como texto de un script de tipo `application/ld+json`, sin datos de usuario ni valores externos. La imagen social será un asset estático de marca para no agregar dependencias ni solicitudes de ejecución.

Se descarta incorporar herramientas de analítica, etiquetas publicitarias o contenido indexable de rutas privadas: no son necesarios para descubrimiento y ampliarían superficie de privacidad.

### Progresión de información privada

Dashboard conservará salud financiera y prioridades al inicio. El bloque de gráficos se revelará con una divulgación explícita después de esas decisiones, mientras sus tablas equivalentes permanecen dentro del mismo contexto. La inicialización o redimensionamiento de Chart.js se ejecutará después de mostrar el panel para evitar canvas de ancho cero.

Gastos e ingresos mostrarán período, resultado y acción de registro antes de filtros secundarios. En pantallas estrechas los filtros secundarios irán en una divulgación Material existente o equivalente; chips/resumen conservarán los filtros aplicados fuera del panel. Presupuestos, categorías y configuración reutilizarán el componente de estado vacío con una siguiente acción sólo cuando sea segura y contextual.

Se descarta ocultar filtros activos o cambiar su representación URL, porque rompería enlaces estables y el contexto entre dashboard y detalle.

### Interacción modal y banner de Telegram

El aviso se convertirá en contenido informativo con botones hermanos para abrir y descartar. El detalle usará `MatDialog`, ya disponible en el frontend, con etiqueta, foco inicial, cierre por Escape y retorno de foco gestionados por Angular Material.

Se descarta mantener un `div` con `role="button"` y handlers manuales: permite interacción anidada y deja a la aplicación responsable de recrear semántica modal, atrapamiento de foco y restauración.

### Sistema visual y movimiento

Los cambios reutilizarán tokens semánticos, tipografía, radios y escalas existentes. Los controles conservarán foco visible y 44 px mínimos; ningún cambio dependerá de animación. Las animaciones de carga respetarán la regla global de movimiento reducido.

## Risks / Trade-offs

- [Ocultar gráficos puede parecer pérdida de información] → el disparador comunica qué incluye el análisis y conserva las tablas y gráficos al abrirlo.
- [Canvas inicializado en un panel cerrado] → renderizar o redimensionar tras la apertura y cubrirlo con prueba de interacción.
- [Promesa de confianza desactualizada] → limitar el copy a comportamiento documentado y revisar términos/privacidad durante la implementación.
- [Imagen social aumenta peso de la landing] → usar un asset estático comprimido, con dimensiones adecuadas y sin carga bloqueante.
- [Más divulgaciones añaden clics] → sólo se agrupan controles secundarios; período, resultado, filtros aplicados y acción principal permanecen visibles.

## Migration Plan

1. Implementar y verificar frontend en `dev` con build SSR, unitarias y Playwright.
2. Validar manualmente landing, teclado/modal Telegram y vistas de 320 px con datos demo.
3. Promover mediante el flujo de release existente; no requiere migración de base de datos ni backend.
4. Si una regresión visual o de conversión aparece, revertir el commit de frontend: rutas, contratos y datos no cambian.
