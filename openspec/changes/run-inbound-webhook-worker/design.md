## Context

Véase `proposal.md` para la causa y el impacto. La admisión HTTP ya persiste los eventos y el comando `worker:inbound-events` ejecuta una única ronda de procesamiento; el compose de producción sólo inicia la API. La infraestructura de entrega, reintentos y dead-letter ya existe, por lo que falta asegurar que haya un consumidor activo y verificable.

## Goals / Non-Goals

**Goals:**

- Mantener un consumidor de eventos inbound activo con el mismo artefacto y configuración que la API de producción.
- Permitir detener el consumidor ordenadamente para que Docker pueda recrearlo sin abandonar recursos abiertos.
- Hacer que el despliegue falle antes de completarse si API o consumidor no usan la imagen SHA esperada o no se mantienen en ejecución.
- Conservar el comando de una sola ronda para cron, operaciones manuales y pruebas.

**Non-Goals:**

- No se cambia el contrato del webhook de Telegram, la semántica de deduplicación, ni las políticas existentes de reintento o dead-letter.
- No se introduce una nueva cola externa, broker, base de datos, endpoint HTTP ni dependencia de infraestructura.
- No se reprocesan automáticamente los registros que ya terminaron en dead-letter.

## Decisions

### Proceso daemon separado y reutilización del consumidor existente

Se añadirá un punto de entrada de larga duración que crea un contenedor una vez, ejecuta tandas con el servicio inbound existente y espera sólo cuando no haya trabajo. El intervalo y el tamaño de tanda serán configurables por variables de entorno, con valores seguros por defecto. Capturará `SIGTERM` y `SIGINT`, terminará la ronda actual y cerrará el contenedor antes de salir.

Esto conserva el comando de una ronda para cron y evita crear un bucle de shell que no pueda coordinar correctamente el cierre, el registro estructurado o una futura instrumentación. También evita duplicar la lógica de retries y envío de respuestas, que seguirá siendo responsabilidad del servicio actual.

Alternativas consideradas:

- Ejecutar cron en el host: se descarta porque es estado operativo externo al despliegue, puede desaparecer tras una reconstrucción del servidor y no permite verificarlo junto con la API.
- Ejecutar un bucle en `command` de Compose: se descarta porque acopla el ciclo de vida a shell y hace menos explícitos los logs y el apagado.
- Procesar en el controlador HTTP: se descarta porque rompería la admisión rápida y durable requerida para los reintentos.
- Incorporar un broker: se descarta porque el almacenamiento durable ya cumple la necesidad y aumentaría alcance y operación.

### Servicio Compose dedicado con imagen SHA compartida

El compose de producción declarará un servicio `expenses-tracker-inbound-worker`, sin puertos publicados, con `restart: unless-stopped`, el mismo `BACKEND_IMAGE` y `env_file` que la API, y el nuevo comando daemon. El nombre estable del contenedor permitirá que operación y CI inspeccionen explícitamente su estado.

La API y el worker comparten la imagen, pero son procesos independientes: una caída del worker se reinicia sin reiniciar la API y una caída de la API no deja de consumir trabajos ya admitidos.

### Despliegue atómico de los dos procesos y validación por imagen/configuración

El workflow resolverá el conjunto único de imágenes de Compose, exigirá que sea exactamente el tag SHA del commit y recreará API y worker con `--pull never` después de haber descargado ese tag. Después inspeccionará ambos contenedores para exigir el ID de imagen y `Config.Image` esperados, además de que sigan en estado `running`. La comprobación HTTP existente de la API se conserva; para el worker se usará estado del contenedor y logs de diagnóstico en el error, ya que no expone HTTP.

Se prefiere comprobar tanto ID como tag configurado: el ID evita una imagen equivocada y el tag evita que un contenedor haya sido creado accidentalmente desde `latest` con el mismo digest.

## Risks / Trade-offs

- [Dos consumidores pueden solaparse durante una recreación] → El repositorio de eventos ya reclama trabajos de forma durable; el despliegue toma un lock y recrea ambos servicios en una misma operación.
- [Un bug hace que el daemon termine] → `restart: unless-stopped` lo reinicia y el workflow detecta que no permanece ejecutándose inmediatamente después del deploy.
- [Un intervalo corto aumenta consultas cuando no hay mensajes] → Se aplicará espera configurable sólo en bandeja vacía y un valor por defecto moderado.
- [Una tanda prolongada retrasa el apagado] → Docker envía la señal de terminación y el worker deja de iniciar nuevas tandas tras completar la actual; la duración queda acotada por el tamaño de tanda configurado.

## Migration Plan

1. Publicar una imagen que incluya el daemon y la definición Compose del worker.
2. El workflow ejecuta migraciones y backfills idempotentes con esa imagen, recrea API y worker desde el mismo tag SHA, y verifica ambos procesos.
3. Confirmar en producción el estado de ambos contenedores, el health de la API y un evento inbound procesado mediante logs saneados.
4. Si hay regresión, desplegar el último tag saludable para restaurar la API; luego ejecutar manualmente el comando de una ronda contra la misma base de datos para drenar eventos pendientes hasta corregir el worker.
