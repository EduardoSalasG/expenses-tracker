## Context

Véase `proposal.md` para el problema. El backend declara ESLint 9, pero no contiene un archivo de configuración que esa versión pueda cargar. El código es TypeScript ESM y ya se compila con TypeScript; el lint debe entender su sintaxis sin depender de configuraciones globales o transitivas.

## Goals / Non-Goals

**Goals:**

- Hacer que el comando de lint del paquete backend sea reproducible desde una instalación limpia.
- Analizar exclusivamente los fuentes TypeScript de `backend/src` con una configuración flat versionada.
- Usar dependencias declaradas de forma directa y mantener reglas iniciales conservadoras para no mezclar una migración masiva de estilo con esta reparación de tooling.

**Non-Goals:**

- No añadir lint al frontend ni cambiar sus herramientas.
- No introducir reglas type-aware que requieran cargar el programa TypeScript completo.
- No reformatear ni modificar lógica de producción sólo para satisfacer reglas nuevas.

## Decisions

### Configuración flat local con soporte TypeScript directo

Se añadirá `backend/eslint.config.mjs` y la dependencia directa `typescript-eslint`. La configuración ignorará artefactos generados y aplicará la sintaxis TypeScript a `src/**/*.ts` junto con un conjunto recomendado compatible.

Se prefiere la dependencia directa sobre depender de paquetes transitivos del frontend: el script pertenece al backend y debe ser determinista para CI e instalaciones limpias. Se prefiere una configuración sin type-aware lint en esta primera reparación, porque el objetivo es restaurar el gate básico sin costes de rendimiento ni una oleada de cambios de código no relacionados.

Alternativas descartadas:

- Reducir ESLint a v8 y usar `.eslintrc`: prolonga una configuración obsoleta y contradice la versión actualmente resuelta.
- Añadir un archivo vacío: haría pasar el comando pero no analizaría TypeScript con reglas útiles.
- Activar reglas type-aware: amplía alcance y puede requerir decidir errores existentes fuera de esta corrección.

## Risks / Trade-offs

- [Las reglas recomendadas revelan errores existentes] → corregir sólo los hallazgos necesarios y explícitos para dejar el gate verde; si el volumen cambia el alcance, pausar y proponer un cambio separado.
- [Versiones incompatibles entre ESLint y parser TypeScript] → instalar desde el lockfile, ejecutar lint y la suite backend en una instalación limpia.
- [Un archivo futuro fuera de `src`] → el script actual ya limita su alcance a `src/**/*.ts`; la configuración seguirá la misma frontera.

## Migration Plan

1. Añadir la dependencia y configuración flat.
2. Ejecutar lint para observar los hallazgos de configuración y fuente.
3. Corregir los hallazgos dentro del alcance aprobado y verificar lint, test y build.
4. Si se detecta una regresión, revertir el commit de tooling: el runtime no depende de ESLint.
