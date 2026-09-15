# Versionamiento y releases

Este proyecto usa [Semantic Versioning](https://semver.org/lang/es/) y GitFlow para que cada despliegue de producción pueda identificarse, auditarse y revertirse con precisión.

## Formato de versión

La versión tiene el formato `MAJOR.MINOR.PATCH`.

- **MAJOR**: cambio incompatible de API, datos, autenticación o comportamiento público que exige migración.
- **MINOR**: funcionalidad compatible hacia atrás.
- **PATCH**: corrección compatible, seguridad, documentación o mantenimiento sin nueva funcionalidad pública.

Los pre-releases usan `-alpha.N`, `-beta.N` o `-rc.N` solo cuando se publica una versión de prueba deliberada. No se usan tags móviles como `latest` para identificar una release.

## Fuente de verdad

La versión de una release se conserva de forma coherente en:

1. el manifiesto de la aplicación que construye el frontend;
2. los manifiestos de servicios que se distribuyen con la release;
3. un tag Git anotado con formato `vMAJOR.MINOR.PATCH` en el commit de `main` promovido a producción;
4. las notas de release, con los cambios incluidos, migraciones y riesgos conocidos.

El frontend muestra esa misma versión al final de Configuración, en texto discreto y accesible. Debe poder leerse con zoom y lector de pantalla sin interferir con acciones de configuración.

## Flujo de release

1. Las funcionalidades y correcciones se integran en `dev` y actualizan pruebas, documentación y OpenSpec cuando corresponde.
2. Antes de promover, se decide el incremento SemVer a partir del cambio acumulado en `dev`.
3. Se actualiza la versión y el changelog en un commit de release en `dev`.
4. Se verifican build, pruebas, contratos API, documentación y QA de la superficie afectada.
5. Se fusiona `dev` en `main` mediante un commit de merge rastreable.
6. Se crea un tag anotado `vX.Y.Z` sobre el commit de `main` que se desplegará y se publica junto con `main`.
7. Se supervisan GitHub Actions, despliegue productivo y health checks. Las notas de release registran el SHA, tag, fecha, resultado y cualquier limitación.
8. Se sincroniza `main` de vuelta a `dev` para iniciar el siguiente ciclo desde una base limpia.

No se etiqueta `dev`, no se reutiliza un tag existente y no se crea un tag antes de que el commit esté en `main`.

## Reglas de trazabilidad

- Cada pull request o conjunto de commits en `dev` debe indicar el cambio SemVer esperado o declarar que queda agrupado en una release posterior.
- Las migraciones de base de datos deben mencionar la primera versión que las requiere y si admiten rollback.
- Los cambios de API deben actualizar Swagger/Postman y documentar compatibilidad o migración.
- Los artefactos de despliegue deben registrar el SHA inmutable, además del tag humano de release.
- El changelog debe agrupar cambios como `Added`, `Changed`, `Fixed`, `Security`, `Deprecated` y `Removed`.

## Rollback

Un rollback productivo apunta al último tag de release confirmado como sano, nunca a un SHA elegido informalmente.

1. Identificar el último tag sano y revisar sus notas de release, migraciones y compatibilidad de datos.
2. Re-desplegar el artefacto inmutable asociado a ese tag/SHA.
3. Ejecutar health checks y una verificación funcional mínima.
4. Abrir un incidente o registro de rollback con tag origen, tag destino, motivo, impacto y hora.
5. Regularizar `dev` y `main` con una corrección posterior; no reescribir historial ni mover tags publicados.

Si una migración no es reversible, el rollback debe usar una corrección hacia adelante o un procedimiento de restauración de datos previamente documentado.

## Lista de verificación de release

- [ ] La versión elegida respeta SemVer.
- [ ] Los manifiestos y la versión visible en frontend coinciden.
- [ ] Changelog y notas de release incluyen el SHA y las migraciones.
- [ ] Pruebas, build, documentación y QA están verificados.
- [ ] `dev` fue fusionada en `main`.
- [ ] Se creó y publicó un tag anotado `vX.Y.Z` sobre `main`.
- [ ] El despliegue, API y frontend productivos están sanos.
- [ ] `dev` fue sincronizada con `main`.

