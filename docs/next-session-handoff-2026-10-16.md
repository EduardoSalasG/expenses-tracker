# Handoff — 2026-10-16

## Presupuesto comunicado

- Ventana de cinco horas: 99 % disponible al comenzar este slice; 70 % comunicado antes de retomar los ajustes de Gastos y Presupuestos; 63 % al continuar la verificación final.

## Trabajo completado

- Cambio OpenSpec `gate-app-bootstrap-session`:
  - `AuthService.bootstrapSession()` resuelve una única vez la sesión almacenada, renueva mediante refresh token cuando existe y limpia tokens inválidos sin propagar el error.
  - `AppComponent` muestra una pantalla de carga accesible durante un mínimo de dos segundos antes de exponer el router; respeta movimiento reducido y no accede a almacenamiento en SSR.
  - Pruebas focalizadas elevadas: `auth.service.spec.ts` y `app.component.spec.ts`, 7/7 exitosas.
  - Build de producción elevado exitoso; prerenderiza `/` y `/en`. Permanece el aviso conocido de presupuesto inicial: 1.44 MB frente a objetivo 1.15 MB.
  - Detector Impeccable sobre `src/app/app.component.ts`: sin hallazgos. Revisión manual: loader visible en 320 px y escritorio, y contenido enrutado visible después de la espera.
- Cambio OpenSpec `refine-expense-tags-and-budget-creation`:
  - Los tags de categoría y pago ahora separan icono no encogible y etiqueta truncable.
  - Presupuestos elimina selector mensual y acordeón; “Crear presupuesto” abre un diálogo responsive, reutilizado para edición. El progreso usa el mes actual.
  - Pruebas rojas confirmadas y corrida elevada verde: 12/12 focalizadas. Build de producción y detector Impeccable pasan; persiste el aviso conocido del presupuesto de bundle.
  - Se añadió `max-width: 100%` al tag y se completó el comportamiento del diálogo: crear empieza con un formulario limpio; al cerrar, guardar o cancelar se restablece el estado.
- Verificación conjunta posterior:
  - La corrida focalizada elevada de `auth.service`, `app.component`, `expenses.component` y `budgets.component` terminó correctamente.
  - El build de producción elevado terminó correctamente tras incorporar i18n del cargador y el cierre/restablecimiento del diálogo.
  - Ambos cambios OpenSpec validan en modo estricto. `git diff --check` no reporta errores; sólo avisos ya conocidos de normalización LF/CRLF.

## Limitaciones y bloqueos

- La primera ejecución de Karma dentro del sandbox no pudo iniciar Chrome Headless debido a GPU/cache temporal, antes de ejecutar Jasmine. Repetir las pruebas fuera del sandbox funciona.
- Para los tests de bootstrap no se pudo registrar el ciclo rojo porque el launcher falló antes de cargar Jasmine; la corrida elevada posterior confirmó el resultado verde.
- No hay autorización para release, promoción a `main`, tag ni deploy.

## Próximo slice

1. Completar la revisión manual autenticada de tags y modal a 320 px, móvil representativo y escritorio; esta sesión no pudo usar una sesión de prueba sin iniciar sesión con datos del usuario.
2. Confirmar visualmente que una instalación de iOS pasa del cargador a la ruta correcta con y sin sesión, y decidir si se desea ajustar la duración mínima de dos segundos.
3. Revisar el diff y crear un commit en `dev` cuando se acepte la limitación de revisión autenticada o se complete esa QA.

## Estado Git

- Rama: `dev`.
- El cambio se registra en `dev`; no hay autorización para promoverlo, etiquetarlo ni desplegarlo.
