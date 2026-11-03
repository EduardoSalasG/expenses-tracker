# Handoff — corrección de instalación y Push en iPhone — 2026-11-02

## Presupuesto y estado

- Presupuesto inicial informado por usuario: 6% de la ventana de cinco horas; posteriormente renovado a 85% para completar la implementación.
- Producción: `main` en `v0.6.3` (`6a9730e`), workflow `41526002348` exitoso.
- Evidencia productiva fresca: `/health/ready` devuelve base de datos `ok`; `/push/public-key` expone la clave pública; Netlify responde 200.

## Incidencia reportada

- En iPhone con Chrome no apareció el banner de instalación.
- Tras instalar, no apareció la solicitud/banner de notificaciones.

## Causa investigada

- `frontend/src/app/core/pwa-engagement.service.ts` solo habilita instalación tras `beforeinstallprompt`. Ese evento no existe en los navegadores de iOS, incluido Chrome, que usa WebKit.
- `isStandalone()` solo evalúa `matchMedia('(display-mode: standalone)')`. En iOS debe también reconocer `navigator.standalone`; de lo contrario `AppComponent.updatePwaBanners()` no muestra el banner de notificaciones después de instalar.
- El banner de notificaciones ya exige una sesión autenticada y `Notification.permission === 'default'`; mantener ese requisito.

## Referencia validada: Omni Dance

- Referencia externa leída: `C:\Users\salas\Documents\omni-dance\apps\web\src\components\install\InstallPrompt.tsx`.
- El componente implementa el patrón que debe trasladarse, adaptado a Angular:
  - considera instalada la app con `display-mode: standalone` **o** `navigator.standalone === true`;
  - identifica iOS por `iphone|ipad|ipod` y muestra instrucciones manuales “Compartir → Agregar a pantalla de inicio”, pues no existe prompt programático;
  - registra el service worker tempranamente para habilitar elegibilidad de instalación Chromium;
  - usa `beforeinstallprompt` solo cuando el navegador lo provee;
  - escucha `appinstalled` para ocultar el aviso y persiste su descarte.
- No copiar JSX ni dependencias de Omni Dance: conservar el visual system Angular/Material/Tailwind de Expenses Tracker y sus textos i18n ES/EN.

## Implementación realizada

1. Se añadió el fallback iOS de instalación: muestra instrucciones manuales “Compartir → Agregar a pantalla de inicio” cuando no existe `beforeinstallprompt`.
2. `isStandalone()` ahora reconoce tanto `display-mode: standalone` como `navigator.standalone` de iOS.
3. Se añadieron pruebas unitarias del servicio y del componente, además de un runner ChromeHeadless determinista para el frontend.
4. Se actualizaron los artefactos OpenSpec, i18n ES/EN, versión y notas de release para `v0.6.4`.

## Validación manual pendiente

1. En un iPhone: iniciar sesión en Chrome, usar Compartir → Agregar a pantalla de inicio y abrir la app desde el icono creado.
2. Confirmar que, tras iniciar sesión dentro de la app instalada, aparece el aviso para habilitar notificaciones y que iOS muestra el permiso tras tocar el botón.
3. Confirmar los estados denegado y ya concedido, más la recepción de una notificación de gasto compartido.

## Riesgos conocidos

- iOS permite Web Push únicamente para web apps añadidas a la pantalla de inicio y con una interacción del usuario para solicitar permiso.
- Chrome en iOS no puede ofrecer el prompt nativo de Chromium; las instrucciones deben ser explícitas y no simular una instalación automática.
