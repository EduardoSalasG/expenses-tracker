# Changelog

Todos los cambios relevantes de este proyecto se documentan aquí siguiendo el formato de [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y [Semantic Versioning](https://semver.org/lang/es/).

La política y el flujo de publicación están en [docs/versioning.md](docs/versioning.md).

## [Unreleased]

## [0.1.2] - 2026-09-18

### Added

- Dashboard financiero orientado a salud, prioridades y enlaces accionables.
- Filtros progresivos de gastos con estado URL validado y secciones de Configuración enlazables.

### Changed

- Estados de carga, error y vacío unificados en las superficies financieras.
- Puertos locales movidos a frontend `4300`, backend `3100` y PostgreSQL `6543`.
- Dockerfiles actualizados para incluir los artefactos de versionado requeridos por los builds.

## [0.1.1] - 2026-09-18

### Added

- Dashboard financiero orientado a salud, prioridades y enlaces accionables.
- Filtros progresivos de gastos con estado URL validado y secciones de Configuración enlazables.

### Changed

- Estados de carga, error y vacío unificados en las superficies financieras.
- Puertos locales movidos a frontend `4300`, backend `3100` y PostgreSQL `6543`.
- Dockerfiles actualizados para incluir los artefactos de versionado requeridos por los builds.

### Security

- Se eliminó la emisión pública de tokens de enlace Telegram para impedir que un cliente anónimo genere un acceso para un `chatId` arbitrario.
- La configuración de producción rechaza secretos JWT y base de datos de desarrollo, CORS comodín y Telegram habilitado sin secreto de webhook.

### Changed

- El webhook Telegram solo se registra cuando existe su secreto de verificación.
- Se actualizaron Swagger, Postman, README, checklist y operaciones para reflejar los flujos seguros.
- La versión de `package.json` raíz se valida y se propaga a los manifiestos y al módulo visible del frontend antes de compilar o liberar.

## [0.1.0] - Baseline histórico

Versión base existente antes de adoptar tags de release y un changelog mantenido. No se creó un tag retroactivo: el primer tag formal se publicará desde `main` al promover la siguiente versión.
