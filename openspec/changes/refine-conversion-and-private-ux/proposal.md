## Why

Expenses Tracker ya ofrece funciones relevantes, pero su landing comunica demasiadas capacidades antes de explicar el resultado principal: entender cómo se mueve el dinero. En las superficies privadas, la información y las acciones son accesibles en gran medida, aunque algunos patrones todavía añaden carga cognitiva o no proporcionan una semántica de interacción suficiente.

## What Changes

- Simplificar la landing pública para comunicar primero el resultado, con una sola acción primaria coherente, una jerarquía de contenido más breve y ejemplos localizados y neutrales.
- Reforzar la confianza de la landing con afirmaciones verificables de control y privacidad, sin prueba social, urgencia, escasez ni promesas no demostrables.
- Completar los metadatos de descubrimiento de las rutas públicas con datos estructurados e imagen social, preservando el canon, idiomas alternativos, prerenderizado y exclusión de rutas privadas.
- Reordenar el dashboard para que el resumen y las prioridades lleven a la exploración analítica progresiva, sin retirar gráficos ni sus alternativas textuales.
- Mejorar los flujos privados de gastos, ingresos, presupuestos, categorías y configuración mediante divulgación progresiva, estados vacíos orientados a la próxima acción y consistencia de jerarquía móvil.
- Corregir el banner y el modal de Telegram para evitar controles interactivos anidados y proveer diálogo modal con foco, Escape y retorno de foco correctos.
- Añadir cobertura automatizada de conversión pública, semántica de diálogo, navegación por teclado, reducción de movimiento y vistas de 320 px.

## Capabilities

### New Capabilities
- `public-conversion-landing`: comunicación pública breve, verificable, localizada, semántica y orientada a que una persona entienda el beneficio y pueda crear una cuenta.
- `accessible-private-dialogs`: patrones de aviso y diálogo privado que preservan semántica, foco y teclado sin anidar controles interactivos.

### Modified Capabilities
- `atomic-finance-design-system`: los componentes compartidos y estados vacíos comunicarán una próxima acción clara y mantendrán una jerarquía mobile-first consistente.
- `progressive-finance-navigation`: la divulgación progresiva de filtros y secciones privadas conservará los criterios activos y hará visible el camino principal antes de los controles secundarios.
- `task-first-financial-dashboard`: la exploración de gráficos se presentará progresivamente después del resumen y las prioridades, manteniendo disponibles los gráficos y sus equivalentes textuales.

## Impact

- Afecta `frontend/src/app/features`, componentes compartidos, catálogo i18n, estilos, assets públicos, SSR/prerenderizado y pruebas Playwright/unitarias del frontend.
- No cambia contratos de API, modelo de datos, autenticación ni despliegue de backend.
- Las promesas de privacidad o control en la landing deberán corresponder a comportamiento y documentación existentes verificables.
