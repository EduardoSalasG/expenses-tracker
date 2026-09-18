## 1. Fuente y validación de versión

- [x] 1.1 Definir `package.json` raíz como fuente canónica, crear el script de sincronización/validación y verificar que una versión SemVer válida se propaga a manifiestos y módulo TypeScript generado.
- [x] 1.2 Crear pruebas del script que cubran versión válida, manifiesto divergente y versión SemVer inválida; verificar que las pruebas fallan antes de la implementación y pasan después.
- [x] 1.3 Integrar la validación en los scripts de build y release pertinentes sin introducir una dependencia de runtime; verificar build de backend y build de frontend.

## 2. Versión en Configuración

- [x] 2.1 Añadir al componente de Configuración el valor de versión generado y las claves de i18n necesarias; verificar que se renderiza como último contenido después de las secciones funcionales.
- [x] 2.2 Aplicar estilos secundarios del sistema visual para el metadato de versión, con contraste y separación adecuados; verificar en 320 px, un ancho móvil representativo y escritorio.
- [x] 2.3 Ampliar las pruebas de Configuración para comprobar valor exacto, orden final, texto accesible, navegación por teclado y comportamiento con zoom/reduced motion cuando aplique; verificar las pruebas unitarias afectadas.

## 3. Operación de release y documentación

- [x] 3.1 Actualizar `docs/versioning.md`, `docs/agent-protocol.md` y checklist de release con selección SemVer, promoción `dev` → `main`, tag anotado, SHA, monitoreo y sincronización posterior; verificar que no contradigan `AGENTS.md`.
- [x] 3.2 Actualizar `CHANGELOG.md` y plantilla de notas de release para exigir versión, SHA, cambios relevantes y referencia de rollback; verificar que una versión candidata pueda prepararse sin etiquetar retrospectivamente `0.1.0`.
- [x] 3.3 Documentar y probar de forma no destructiva el procedimiento de rollback basado en el tag previo; verificar que la guía identifica comandos, responsable y comprobaciones posteriores.

## 4. Validación y promoción futura

- [x] 4.1 Ejecutar validación de OpenSpec, pruebas de versión, builds y pruebas frontend/backend afectadas; verificar evidencia de comandos y declarar explícitamente cualquier limitación de sandbox.
- [ ] 4.2 En la primera ventana de release, seleccionar PATCH/MINOR/MAJOR, completar el changelog, promover el commit verificado de `dev` a `main` y crear `vX.Y.Z` anotado sobre su SHA; verificar CI, Netlify, health checks y sincronizar `main` de vuelta a `dev`.
