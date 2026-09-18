## Why

La aplicación no tiene todavía una fuente verificable de versión consumida por el frontend ni un procedimiento ejecutable que una cambios en `dev`, promoción a `main`, changelog y tag. Esto dificulta identificar la versión en producción y volver con seguridad a una revisión anterior.

## What Changes

- Establecer versionado semántico como contrato de release, con una versión coherente entre el workspace, backend y frontend.
- Añadir una versión generada y verificable al frontend y mostrarla de forma discreta como el último elemento de Configuración.
- Formalizar la promoción `dev` → `main`, el tag anotado `vX.Y.Z`, changelog, notas de release y el procedimiento de rollback trazable.
- Definir verificaciones que impidan publicar artefactos cuya versión declarada no coincida con la versión de release.

## Capabilities

### New Capabilities

- `semantic-release-traceability`: selección, sincronización y publicación trazable de versiones SemVer.
- `application-version-display`: exposición accesible y no intrusiva de la versión actual de la aplicación en Configuración.

### Modified Capabilities

- Ninguna; el proyecto no tiene especificaciones principales existentes.

## Impact

- Afecta manifiestos `package.json`, scripts de workspace y la configuración/build del frontend Angular.
- Afecta `frontend/src/app/features/settings.component.ts`, sus pruebas y las cadenas de i18n correspondientes.
- Afecta `CHANGELOG.md`, `docs/versioning.md`, `docs/agent-protocol.md`, checklist de release y el flujo de GitHub/Git tags.
- No modifica contratos HTTP, esquema de base de datos ni dependencias de producción.
