## Context

La versión `0.1.0` existe actualmente en los tres `package.json`, pero el frontend no dispone de un valor de versión propio ni de una verificación que detecte divergencias. La plantilla inline de `SettingsComponent` termina después de sus secciones funcionales, por lo que permite incorporar el dato como contenido final. Véanse `proposal.md` y las especificaciones para la motivación y el contrato.

## Goals / Non-Goals

**Goals:**

- Hacer reproducible y comprobable la propagación de una versión SemVer a los tres paquetes y al bundle Angular.
- Ofrecer un dato de versión sobrio, localizado y accesible al final de Configuración en móvil y escritorio.
- Convertir el proceso documental de `docs/versioning.md` en una secuencia verificable de release, tag y rollback.

**Non-Goals:**

- No automatizar publicación de producción ni crear un tag para la versión histórica `0.1.0`.
- No modificar contratos API, persistencia ni el diseño funcional de Configuración.
- No introducir una dependencia de runtime para leer el manifiesto del workspace desde el navegador.

## Decisions

### Un manifiesto raíz como fuente de versión y artefacto frontend generado

La versión canónica será `package.json` de raíz. Un script local de sincronización validará que los manifiestos de frontend y backend coincidan y generará un módulo TypeScript de versión para el bundle Angular. Los comandos de build, test de release y el checklist invocarán la validación antes de promocionar.

Se descarta duplicar manualmente un valor en `environment.ts`: es sencillo inicialmente, pero permite que el texto de Configuración diverja del release. También se descarta importar `package.json` directamente en el browser porque acopla el bundle a configuración de tooling y no ofrece una comprobación explícita de las tres superficies.

### Presentación como metadato final y no como control

`SettingsComponent` recibirá el valor generado y renderizará un bloque semántico de texto al final de su plantilla, con token de tipografía secundaria, contraste suficiente y separación consistente con el sistema atómico existente. El texto tendrá una etiqueta localizada (por ejemplo, “Versión 0.1.1”), no será un botón ni dependerá de hover o movimiento.

Se descarta colocarlo en el encabezado porque reduciría el foco de la pantalla y dificultaría las tareas recurrentes. Se descarta esconderlo tras un diálogo por ser menos descubrible y menos útil para soporte.

### Release explícito y reversible

La persona Release Agent seleccionará PATCH/MINOR/MAJOR según SemVer, actualizará el changelog antes de la promoción y ejecutará la compuerta. Tras mergear `dev` a `main`, creará `vX.Y.Z` anotado sobre el SHA exacto de `main`, publicará las notas y registrará el SHA. Después verificará CI, Netlify y health checks, y sincronizará `main` de vuelta a `dev`.

Se descarta etiquetar `dev` o usar tags ligeros: ninguno identifica de manera confiable el commit de producción ni guarda el contexto de release.

## Risks / Trade-offs

- [Un artefacto generado queda desactualizado] → el script de validación compara manifiestos y artefacto; build/release fallan ante divergencia.
- [Cambio de versión omitido en un release] → el checklist exige SemVer, changelog y prueba de consistencia antes del merge.
- [Versión visualmente demasiado tenue] → revisar contraste, zoom y lector de pantalla en los breakpoints obligatorios de 320 px, móvil representativo y escritorio.
- [Rollback de código sin rollback de plataforma] → las notas documentarán el tag y la comprobación del despliegue; la ejecución concreta seguirá las capacidades de Netlify/GitHub disponibles en el momento.

## Migration Plan

1. Introducir script de sincronización/validación, módulo generado y pruebas que prueben igualdad y rechazo de discrepancias.
2. Conectar el módulo a Configuración e incorporar claves de i18n y pruebas de UI/accesibilidad responsive.
3. Actualizar documentación, checklist y `CHANGELOG.md`; elegir la primera versión formal en `dev` sin etiquetar retrospectivamente `0.1.0`.
4. Ejecutar las compuertas, promover a `main`, crear el tag anotado y registrar evidencia de CI, Netlify y health checks.
5. Para rollback, elegir el tag previo verificado, restaurar el release según `docs/versioning.md`, y documentar el incidente y la versión reemplazada.
