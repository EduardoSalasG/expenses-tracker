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
