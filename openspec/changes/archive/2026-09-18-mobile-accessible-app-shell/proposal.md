## Why

La aplicación se usa principalmente desde móvil, pero el shell autenticado no ofrece bypass de navegación, el menú móvil no gestiona completamente el foco y los gráficos no tienen equivalente textual.

## What Changes

- El shell SHALL ser mobile-first, con navegación táctil, landmark principal, skip link y foco predecible.
- Los gráficos SHALL exponer resumen y tabla o alternativa textual navegable.
- Los estados asíncronos MUST anunciar carga, éxito y error; el movimiento reducido SHALL conservar feedback sin animación vestibular.

## Capabilities

### New Capabilities
- `accessible-mobile-shell`: navegación autenticada accesible, responsive y orientada a pulgar.
- `accessible-financial-visualizations`: equivalentes textuales para análisis financiero.
- `accessible-feedback-preferences`: estados vivos y preferencias de movimiento, contraste y transparencia.

### Modified Capabilities

- Ninguna; no existen specs base.

## Impact

Shell Angular, dashboard, estilos y pruebas de teclado/lector de pantalla/mobile.
