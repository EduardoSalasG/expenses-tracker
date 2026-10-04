## Why

La auditoría transversal identificó que el shell y varias superficies financieras ya cumplen sus contratos principales, pero persisten etiquetas accesibles sin localizar, iconografía ambigua, estados asíncronos desiguales y una regla global de movimiento reducido que elimina feedback útil. Corregirlos por ruta permite que la aplicación sea clara y operable en móvil, escritorio, teclado y lector de pantalla sin cambiar contratos financieros ni APIs.

## What Changes

- Establecer un contrato de accesibilidad de página para las rutas públicas y autenticadas: nombres localizados, jerarquía semántica, foco visible, estados de carga/error/vacío recuperables y controles táctiles utilizables.
- Sustituir etiquetas ARIA hardcodeadas y revisar iconos decorativos e interactivos para que no añadan anuncios redundantes ni oculten propósito.
- Afinar `prefers-reduced-motion` para conservar feedback estático o de opacidad, contraste y contenido, sin transiciones vestibulares ni una anulación global indiscriminada.
- Uniformar la divulgación progresiva, la prioridad de datos en móvil y la comunicación de filtros/estados en las superficies financieras existentes.
- Añadir una matriz automatizada de QA de rutas públicas y autenticadas, con pruebas de teclado, tamaños 320/390/escritorio y preferencias de accesibilidad; el recorrido E2E usará datos demo locales, no producción.

## Capabilities

### New Capabilities
- `page-accessibility-quality`: Contrato transversal para nombres localizados, semántica, foco y estados recuperables de cada página.

### Modified Capabilities
- `accessible-feedback-preferences`: Precisar feedback perceptible y movimiento reducido por componente, sin suprimir indiscriminadamente toda transición.
- `atomic-finance-design-system`: Exigir iconografía semántica, estados reutilizables y comportamiento responsive verificable en las superficies financieras.
- `progressive-finance-navigation`: Precisar la comunicación accesible de filtros, resultados y estados vacíos en gastos, ingresos, presupuestos, categorías y configuración.

## Impact

- Frontend Angular: rutas, shell, páginas públicas, dashboard y superficies financieras, `I18nService`, estilos globales y componentes compartidos.
- Pruebas unitarias y Playwright/local demo seed para evidencia de interacción, responsividad y accesibilidad.
- No cambia APIs, base de datos, reglas de cálculo, filtros URL ni datos productivos.
