## Why

Al abrir la aplicación instalada en iPhone, el router puede mostrar brevemente la landing antes de que se resuelva la sesión persistida y se cargue la aplicación autenticada. El cambio elimina ese destello para que cada inicio presente únicamente el destino que corresponde.

## What Changes

- Introducir una fase global de arranque que resuelva la sesión persistida antes de renderizar rutas.
- Mostrar una pantalla de carga de la aplicación durante un mínimo breve de dos segundos mientras se prepara el estado inicial.
- Restaurar una sesión válida o limpiar una sesión inválida antes de decidir entre rutas autenticadas y públicas.
- Añadir pruebas para sesiones válidas, inválidas y ausentes durante el arranque.

## Capabilities

### New Capabilities

- `session-bootstrap-gate`: resolución de sesión y pantalla de carga antes de exponer la navegación de la aplicación.

### Modified Capabilities

- Ninguna.

## Impact

- Afecta el componente raíz, el servicio de autenticación, guards, estilos y pruebas del frontend.
- No modifica APIs ni contratos de datos; reutiliza la renovación de sesión existente.
