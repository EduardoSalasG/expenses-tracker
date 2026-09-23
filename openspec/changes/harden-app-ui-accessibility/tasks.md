## 1. Línea base y contratos localizados

- [x] 1.1 Inventariar por ruta las etiquetas ARIA, landmarks, iconos, estados y controles con base en las diez rutas declaradas; añadir pruebas de contrato que fallen para los nombres hardcodeados y verificar el inventario contra las rutas.
- [x] 1.2 Añadir las claves bilingües necesarias en `I18nService` y sustituir los nombres accesibles hardcodeados de páginas públicas, autenticación y controles financieros; verificar las pruebas de plantilla en español e inglés.
- [x] 1.3 Marcar iconos decorativos y nombrar las acciones por icono según su resultado, sin modificar ids ni URLs; verificar con pruebas de accesibilidad de plantilla y navegación por teclado.

## 2. Páginas públicas y de acceso

- [x] 2.1 Endurecer landing, login, términos y privacidad con título, landmarks, enlaces de retorno, foco visible y controles táctiles localizados; verificar navegación de teclado y ausencia de overflow a 320 px.
- [x] 2.2 Añadir estados localizados, recuperables y anunciados a los flujos públicos/asíncronos que aún dependan sólo de color o notificación transitoria; verificar casos de carga, error y reintento mediante pruebas unitarias o E2E controladas.

## 3. Superficies autenticadas

- [x] 3.1 Auditar y corregir dashboard y shell para que filtros de período, gráficos, prioridades, diálogos y acciones por icono tengan nombres localizados y foco predecible; verificar teclado, lector de pantalla y 320/390/escritorio.
- [x] 3.2 Corregir gastos, ingresos y presupuestos para que sus filtros, resultados, vacíos, acciones y metadatos móviles preserven contexto y sean localizados; verificar deep links, filtros combinados y un banco de nombre largo.
- [x] 3.3 Corregir categorías y configuración para que formularios, catálogos, diálogos y acciones destructivas comuniquen contexto, error y recuperación; verificar permisos/URLs existentes y el flujo de teclado.

## 4. Preferencias y estados compartidos

- [x] 4.1 Sustituir la anulación global de movimiento reducido por reglas compartidas y de componente que conserven feedback estático u opacidad breve; verificar CSS computado con `prefers-reduced-motion` y ausencia de desplazamiento/rebote.
- [x] 4.2 Consolidar componentes o patrones de carga, error y vacío sólo donde la auditoría detecte divergencias; verificar contraste en temas soportados y anuncios de región viva sin duplicación.

## 5. Evidencia y cierre

- [x] 5.1 Crear o ampliar la matriz Playwright local con seed demo para las rutas públicas y autenticadas, tamaños 320/390/escritorio, teclado, foco, filtros y estados recuperables; verificar ejecución reproducible sin datos productivos.
- [ ] 5.2 Ejecutar pruebas afectadas, build del frontend, detector Impeccable y QA visual acotada en tema claro/oscuro; registrar evidencia, limitaciones de emulación del navegador y resultado por ruta.
- [x] 5.3 Actualizar documentación de accesibilidad y los artefactos OpenSpec con el estado real; verificar `openspec validate harden-app-ui-accessibility --strict` y un árbol de trabajo sin cambios ajenos.
