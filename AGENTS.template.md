# AGENTS.md — Plantilla de trabajo para agentes

> Adapta los campos entre `<...>` al proyecto. Conserva solo las reglas que sean verificables y propias del repositorio; elimina lo que no aplique.

## Propósito y contexto

`<nombre-del-proyecto>` es `<descripción breve del producto y su objetivo>`. Antes de modificar código, identifica el flujo afectado, las capas involucradas y los contratos que podrían cambiar.

## Mapa del repositorio

- `<directorio-1>/`: `<responsabilidad y tecnología>`.
- `<directorio-2>/`: `<responsabilidad y tecnología>`.
- `<directorio-de-datos>/`: migraciones, bootstrap, semillas y utilidades de datos.
- `docs/`: arquitectura, operación, decisiones y evidencia de QA/release.

Añade un `AGENTS.md` más específico dentro de un subdirectorio solo cuando sus reglas no apliquen al resto del repositorio.

## Comandos verificados

Ejecuta los comandos desde `<raíz o directorio indicado>`. Mantén esta sección sincronizada con los scripts reales del proyecto.

- Instalar dependencias: `<comando>`.
- Iniciar dependencias locales: `<comando>`.
- Iniciar backend: `<comando>`.
- Iniciar frontend: `<comando>`.
- Build completo: `<comando>`.
- Tests completos: `<comando>`.
- Lint completo: `<comando>`.
- Migrar o preparar la base de datos: `<comando>`.

Para una modificación acotada, ejecuta primero la verificación de la superficie afectada y amplía la validación según el riesgo.

## Flujo de trabajo

1. Lee el código, la documentación y los cambios locales relevantes antes de editar.
2. Para cambios no triviales, define alcance, módulos afectados, riesgos, contratos, impacto en datos/documentación y criterios de aceptación antes de implementar.
3. Implementa la menor unidad coherente; evita refactors no relacionados.
4. Actualiza pruebas, contratos y documentación como parte del mismo cambio.
5. Revisa el diff y verifica las superficies afectadas con los comandos reales.
6. Comunica con claridad qué se verificó y qué brecha de prueba, si existe, queda pendiente.

## Reglas por tipo de cambio

### API y contratos

- Mantén validación, manejo de errores y tipos consistentes entre clientes y servidores.
- Actualiza la especificación API (por ejemplo, Swagger/OpenAPI), ejemplos y clientes afectados cuando cambie el contrato.
- No cambies contratos públicos sin evaluar compatibilidad y plan de transición.

### Datos y persistencia

- Todo cambio de esquema requiere una migración versionada y revisable; no dependas de cambios manuales en entornos compartidos.
- Evalúa bootstrap, seed, importación/exportación, rollback y compatibilidad con datos existentes.
- No alteres ni elimines datos de forma destructiva sin autorización explícita y un plan de recuperación.

### Interfaz y mensajes

- Conserva la coherencia con el sistema de diseño y los patrones existentes.
- Verifica estados de carga, vacío, error y permisos, además del flujo exitoso.
- Actualiza i18n, accesibilidad y vistas de escritorio/móvil cuando el cambio sea visible para usuarios.

### Documentación

- Actualiza README, diagramas, guías operativas y decisiones de arquitectura cuando cambien setup, flujos o límites del sistema.
- Usa documentación viva: rutas, comandos y decisiones deben poder comprobarse en el repositorio.

## Roles de colaboración

En cambios con suficiente alcance, separa responsabilidades sin fragmentar la propiedad del resultado:

1. **Diseño:** delimita alcance, dependencias, riesgos y aceptación.
2. **Implementación:** realiza el cambio, pruebas y documentación asociada.
3. **Revisión técnica:** busca regresiones, desviaciones de contrato, migraciones, i18n y documentación omitida.
4. **QA funcional:** valida el flujo completo y los dispositivos o canales afectados.
5. **Release:** confirma la evidencia, la higiene del cambio y la promoción entre ramas.

## Ramas y entrega

- Trabaja en `<rama-de-integración>` por defecto.
- Promueve a `<rama-de-release>` solo tras revisión, QA y verificaciones requeridas.
- Si existe un hotfix directo en la rama de release, regulariza la rama de integración inmediatamente.
- No mezcles cambios no relacionados ni cambios locales ajenos en la misma entrega.

## Definition of Done

- Las aplicaciones o paquetes afectados compilan.
- Las pruebas y el lint relevantes pasan, o la brecha se declara explícitamente.
- Las migraciones, contratos, i18n y documentación se actualizaron cuando correspondía.
- El diff fue revisado y no incluye archivos generados, secretos ni cambios ajenos.
- La evidencia de QA y release requerida por el proyecto quedó registrada.

## Mantenimiento de esta guía

- Prefiere instrucciones breves, concretas y comprobables sobre principios genéricos.
- No dupliques información que ya se descubre con facilidad; enlaza al documento fuente cuando haga falta más detalle.
- Actualiza o elimina una instrucción en el mismo cambio que la vuelva inexacta.
- Cuando un error se repita, primero considera automatizar su prevención (test, lint, script o CI) antes de añadir otra regla.
