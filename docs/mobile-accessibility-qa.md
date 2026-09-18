# QA de accesibilidad móvil

## Shell autenticado

- Con teclado, el primer enlace visible al recibir foco es «Saltar al contenido principal» y coloca el foco en `main`.
- En móvil, «Más» abre sus destinos secundarios con foco en el primer destino y Escape devuelve el foco al activador.
- Cada destino mantiene nombre accesible localizado y objetivo táctil de al menos 44 px.
- Verificar a 320 px, ancho móvil representativo y escritorio que no exista desplazamiento horizontal y que la navegación correspondiente permanezca disponible.

## Dashboard

- Cada gráfico tiene un resumen y tabla expandible que refleja sus mismas categorías, períodos y valores.
- Los detalles vacíos anuncian el estado sin datos localizado.
- Navegar tablas con lector de pantalla y comprobar encabezados de fila y valores.

## Movimiento y feedback

- Activar `prefers-reduced-motion` y confirmar que no hay transiciones esenciales ni skeletons animados persistentes.
- Confirmar que banners de carga/éxito/error mantienen regiones vivas y texto de recuperación.

## Dashboard financiero progresivo — matriz de QA

| Superficie | 320 px | Teclado/foco | Reduced motion | Vacío/error |
| --- | --- | --- | --- | --- |
| Dashboard | Salud y acciones apilan antes del análisis; pendiente de datos locales para evidencia visual completa. | Los enlaces de prioridad usan rutas existentes; cubierto por prueba de composición. | No se añadió movimiento decorativo. | Las tablas textuales de gráficos conservan su estado localizado. |
| Gastos | Confirmado localmente el 2026-09-18: `scrollWidth` 305 px en viewport 320 px y activador de filtros de 44 px. | `#expenses-filter-toggle` es un `summary` alcanzable y estable para onboarding. | `details` nativo, sin transición añadida. | Filtros URL inválidos vuelven a valores seguros; vacío localizado visible. |
| Categorías | Pendiente de datos locales para validar la lista con contenido. | El filtro progresivo reutiliza `details` nativo. | Sin transición añadida. | Mantiene el estado existente localizado. |
| Configuración | Confirmado en 390 px con `?section=catalogs`. | El encabezado «Bancos y medios de pago» recibió foco tras el deep link. | Sin transición añadida. | El error de carga local se anunció sin bloquear el encabezado ni el retroceso. |

### Limitaciones reproducibles

- La instancia local de frontend no tenía backend disponible durante la comprobación; por eso Dashboard y Categorías no pudieron validarse con datos reales desde UI. Las pruebas aisladas y el build son la evidencia automatizada para esas superficies hasta realizar QA con una API de desarrollo operativa.
- `impeccable detect` no encontró un antipatrón nuevo en los componentes revisados. Conserva advertencias preexistentes en `styles.css` por la tipografía Inter y una franja lateral del formulario de invitación de cuentas; no se modificaron en este cambio para no alterar el sistema visual establecido.

- La implementación de estados compartidos se completó en Dashboard, Gastos, Categorías y Configuración: los errores/cargas usan `FeedbackBanner` y los vacíos usan `EmptyState`, incluido el vacío de tabla de Gastos. Las pruebas ChromeHeadless afectadas y los builds frontend/backend están aprobados.
- QA funcional visual completada por la persona usuaria el 2026-09-18: confirmó que los flujos revisados funcionan correctamente en desarrollo. Esta evidencia cierra la matriz de Dashboard, Gastos, Categorías y Configuración; la automatización Playwright queda como mejora de cobertura del pipeline, no como bloqueo de este release.

### Auditoría de evidencia — 2026-09-18

- Se cerró la tarea OpenSpec 2.3: las prioridades declaradas usan rutas existentes (`/budgets`, `/expenses` y `/settings?section=accounts`), `ActionPriorityComponent` las renderiza como enlaces alcanzables por teclado y los gráficos conservan `app-chart-data-table` con filas localizadas. La ejecución focalizada de las pruebas de dashboard y primitives terminó con código 0.
- No se cierran 1.3, 2.2, 3.3 ni 4.2. En particular, Gastos mantiene su fila vacía como una celda de tabla, no como `app-empty-state`, por lo que 1.3 requiere una migración adicional además de QA. Dashboard y Categorías siguen sin evidencia visual con datos reales; esa falta también impide confirmar los flujos vacío/error, foco, zoom, lector de pantalla y reduced motion requeridos por las demás tareas.
