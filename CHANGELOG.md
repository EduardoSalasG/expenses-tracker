# Changelog

Todos los cambios relevantes de este proyecto se documentan aquí siguiendo el formato de [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y [Semantic Versioning](https://semver.org/lang/es/).

La política y el flujo de publicación están en [docs/versioning.md](docs/versioning.md).

## [Unreleased]

## [0.5.0] - 2026-10-26

### Added

- La captura conversacional de gastos interpreta fechas de compra en español, fechas ISO y `ayer`, conserva por separado la fecha de primera cuota y localiza etiquetas de categorías según el idioma preferido.

### Changed

- Tarjetas y transferencias resuelven el banco de forma única dentro del catálogo accesible; las aclaraciones de fecha, banco y categoría permanecen como borrador hasta completar todos los campos.

### Fixed

- Se rechazan fechas de calendario imposibles y una fecha de primera cuota ya no puede sustituir la fecha de compra.

## [0.4.1] - 2026-10-18

### Fixed

- La aplicación instalada espera la resolución de la sesión antes de exponer rutas y muestra una pantalla de carga accesible, evitando el destello de la landing al restaurar una sesión.
- Las etiquetas de categoría y medio de pago en Gastos conservan el icono alineado y truncan texto largo sin desbordar.
- Presupuestos elimina el selector de mes y el acordeón: la creación y edición se realizan desde un diálogo responsive, siempre para el mes actual.

## [0.4.0] - 2026-10-10

### Added

- La captura conversacional de WhatsApp y Telegram acepta `cuenta <nombre>` o `account <name>` para registrar un movimiento en una cuenta accesible sólo para ese mensaje, sin cambiar el contexto persistente del chat.
- Preferencias de categoría por cuenta financiera: una corrección explícita se aplica de inmediato y tres confirmaciones coherentes generan aprendizaje compartido por los miembros de una cuenta compartida.
- Comando administrativo `db:backfill:category-preferences` para consolidar, de forma idempotente, preferencias históricas no conflictivas.

### Changed

- La interpretación resuelve la cuenta autorizada antes de cargar catálogos, conserva esa selección durante confirmaciones de duplicados y solicita aclaración ante cuentas inexistentes o ambiguas.
- La categorización conserva la elección explícita, usa preferencias aprendidas antes de la inferencia y nunca asigna automáticamente `Other` cuando existe incertidumbre.

## [0.3.6] - 2026-10-07

### Fixed

- Las tarjetas de gastos compartidos muestran “Pagado por” y resuelven el nombre del pagador desde los miembros de la cuenta cuando el historial aún no incluye el nombre.

## [0.3.5] - 2026-10-07

### Fixed

- En cuentas compartidas, el historial de gastos identifica a la persona que pagó originalmente el gasto, en vez de quien lo registró.
- Los nuevos gastos compartidos comienzan con reparto en partes iguales y preservan el reparto guardado al editarlos.

## [0.3.4] - 2026-10-04

### Fixed

- Al crear una categoría o subcategoría desde el formulario de gastos, el historial recarga el catálogo vigente antes de renderizar el egreso y conserva su etiqueta recién asignada.

## [0.3.3] - 2026-09-22

### Fixed

- El despliegue backend verifica el artefacto y estabilidad real del worker inbound.
- Las integraciones PostgreSQL locales se ejecutan en una base temporal aislada.

## [0.3.2] - 2026-09-22

### Fixed

- El consumidor durable de eventos inbound se ejecuta continuamente en producción y retoma los eventos pendientes tras un despliegue o reinicio.
- El deploy backend exige que tanto la API como el consumidor permanezcan ejecutándose desde la imagen inmutable del commit desplegado; ya no acepta una imagen `latest` ni un contenedor anterior.
- La extracción de estados de entrega de WhatsApp conserva explícitamente una lista vacía de errores cuando el proveedor la informa.

### Changed

- El backend incorpora una configuración ESLint nativa para TypeScript, de modo que el control de calidad se ejecuta localmente y en CI con reglas explícitas.

## [0.3.1] - 2026-09-21

### Fixed

- El historial de gastos muestra las fechas de cuota en UTC, por lo que un gasto del primer día del período no aparece visualmente en el mes anterior para personas en Chile.
- El despliegue backend valida el contrato de filtros de `GET /expenses` a través de Nginx y del dominio público; una instancia o proxy antiguo ya no puede pasar sólo con health checks.

## [0.3.0] - 2026-09-21

### Added

- Filtros avanzados para el historial de gastos: búsqueda parcial por concepto, categoría, subcategoría, banco, método de pago, moneda y tipo de método.
- Búsqueda parcial por concepto y estado URL persistente para el historial de ingresos.

### Changed

- El gráfico semanal del dashboard mensual ahora muestra la semana calendario que contiene el primer día del mes seleccionado, incluso cuando incluye días del mes adyacente.
- El historial móvil de gastos prioriza la categoría y trunca de forma segura las etiquetas largas de banco o método de pago.

### Fixed

- La búsqueda de gastos usa límites UTC coherentes con los gráficos del dashboard.

## [0.2.0] - 2026-09-18

### Added

- Bandeja duradera para eventos entrantes de Telegram y WhatsApp, con deduplicación por proveedor, reintentos con backoff y estado terminal de dead-letter.
- Worker ejecutable para procesar el inbox de eventos entrantes desde el artefacto backend de producción.

### Fixed

- Resolución de cuentas personales en PostgreSQL: la cuenta persistida ahora se recupera después de crearla, incluso cuando aún no existía en la transacción.

### Changed

- Los controladores de webhook encolan eventos verificados antes de procesarlos, evitando que una caída transitoria pierda un mensaje recibido.

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
