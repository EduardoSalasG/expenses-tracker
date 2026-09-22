## Context

El Compose de producción define la API y el consumidor inbound con la misma imagen y archivo de entorno. La validación actual sólo consulta que el contenedor esté `Running`; un proceso que falla inmediatamente con `restart: unless-stopped` puede cumplir esa condición durante una ventana breve. Véase `proposal.md` para la motivación.

## Goals / Non-Goals

**Goals:**

- Convertir la validación del worker en una prueba del artefacto y de su inicio estable.
- Mantener el despliegue atómico en torno al mismo tag SHA para API y worker.
- Ofrecer un procedimiento manual seguro y reproducible para recuperación.

**Non-Goals:**

- No cambiar el protocolo de webhooks, la semántica de la cola ni el esquema de base de datos.
- No exponer secretos, payloads de Telegram ni tokens de acceso en logs o documentación.

## Decisions

### Verificar el artefacto antes de recrear servicios

El workflow ejecutará una comprobación efímera sobre la imagen SHA mediante Compose, con un `entrypoint` de shell, para exigir la existencia de `dist/infrastructure/process-inbound-events-daemon.js` antes del `up`. Así una imagen incompleta falla sin sustituir la API saludable.

Se descarta confiar en que TypeScript compile: la imagen de runtime puede diferir de los artefactos de build o del tag solicitado.

### Verificar inicio observable y ausencia de reinicios

Tras crear ambos servicios, el workflow esperará un tiempo acotado hasta encontrar el evento de log de inicio del worker. En la misma ventana exigirá contador de reinicios igual a cero y estado `running`; cualquier infracción imprimirá los últimos logs saneados y fallará.

Se descarta validar sólo `State.Running`, porque Docker lo expone como verdadero entre reinicios breves.

### Documentar recuperación con imagen inmutable y ambos servicios

El runbook mostrará una asignación explícita de `BACKEND_IMAGE` al SHA y una recreación conjunta de API y worker. También advertirá que ejecutar `--remove-orphans` contra sólo la API puede retirar el consumidor.

Se descarta recomendar `latest`: no identifica una release ni permite reproducir ni verificar el artefacto.

## Risks / Trade-offs

- [Los logs podrían cambiar] → La comprobación de inicio busca una señal estable y conservadora ya emitida por el daemon; si cambia, las pruebas de workflow obligarán a actualizarla deliberadamente.
- [El deploy tarda algunos segundos más] → La espera se limita y sólo corre una vez por promoción a producción.
- [Una recuperación manual puede usar un SHA incorrecto] → El runbook exige imprimir la imagen resuelta por Compose antes de recrear servicios.

## Migration Plan

1. Añadir la prevalidación del artefacto y la verificación de estabilidad al workflow.
2. Actualizar el runbook y la checklist de release con el procedimiento seguro.
3. Ejecutar las pruebas de configuración y el build backend en `dev`.
4. Promover por el flujo normal; el primer deploy verificará el worker con las nuevas condiciones.

Para rollback, desplegar el SHA de la última tag saludable mediante el mismo workflow. No se requieren migraciones ni reversión de datos.
