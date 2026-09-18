# semantic-release-traceability Specification

## Purpose

Garantiza que cada release promovido a producción tenga una versión SemVer, evidencia verificable y una ruta de rollback inequívoca.

## Requirements

### Requirement: Versión coherente de la aplicación
El sistema de release SHALL mantener una única versión SemVer coherente entre el manifiesto raíz del workspace, los manifiestos de frontend y backend, el artefacto de versión consumido por el frontend y la entrada de release activa en el changelog.

#### Scenario: Verificación antes de una promoción
- **WHEN** se ejecuta la verificación de versión para una versión candidata
- **THEN** MUST fallar si cualquiera de las fuentes declara una versión distinta o no válida según SemVer

#### Scenario: Sincronización correcta
- **WHEN** se sincroniza una versión SemVer válida seleccionada para el release
- **THEN** todas las fuentes de versión declaradas MUST reflejar exactamente esa versión

### Requirement: Promoción y tag de release trazables
El proceso de release SHALL promover cambios agrupados desde `dev` a `main` únicamente después de la compuerta de verificación, y SHALL crear un tag anotado con el formato `vX.Y.Z` que apunte al commit exacto de `main` promovido.

#### Scenario: Release aprobado
- **WHEN** la compuerta de release termina satisfactoriamente para una versión candidata
- **THEN** el tag anotado MUST contener la misma versión y resolver al commit de `main` que contiene el release

#### Scenario: Compuerta no aprobada
- **WHEN** falla una prueba, build, validación de versiones o revisión requerida
- **THEN** el proceso MUST no crear un tag de release ni promover el commit a `main`

### Requirement: Notas y rollback verificables
Cada release SHALL disponer de una entrada versionada en `CHANGELOG.md`, notas de release y el SHA del tag publicado, de modo que se pueda identificar el release anterior y ejecutar un rollback documentado sin inferir versiones desde el historial.

#### Scenario: Evidencia del release publicado
- **WHEN** se publica un tag de release
- **THEN** las notas MUST identificar la versión, el SHA del commit etiquetado y los cambios relevantes del changelog

#### Scenario: Preparación de rollback
- **WHEN** se solicita volver a una versión anterior publicada
- **THEN** la documentación MUST indicar cómo seleccionar el tag anterior y restaurar el artefacto o despliegue asociado
