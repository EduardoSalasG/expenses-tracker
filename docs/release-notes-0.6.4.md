# Notas de release — v0.6.4

- Versión SemVer: `0.6.4` (PATCH).
- Incluye fallback de instalación PWA para iPhone/iPad, detección `navigator.standalone` y activación posterior de notificaciones en la app instalada.
- Validación local: lint, comprobación TypeScript, detector visual y suite unitaria completa del frontend en ChromeHeadless. El comando de pruebas ahora usa un launcher headless sin GPU para evitar sesiones interactivas y fallas de GPU/cache locales.
- Gate posterior: validación manual en iPhone instalado (Compartir → Agregar a pantalla de inicio, reiniciar la app, iniciar sesión y aceptar notificaciones).
