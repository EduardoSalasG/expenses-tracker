## 1. Validación del artefacto y proceso

- [x] 1.1 Añadir una comprobación previa al `up` que exija el ejecutable del daemon en la imagen SHA, y verificarla mediante una prueba/configuración que falle con una ruta ausente.
- [x] 1.2 Añadir una ventana de estabilización que compruebe señal de inicio, estado `running` y contador de reinicios cero, y verificar los casos estable e inestable sin depender de secretos.

## 2. Runbook y regresión

- [x] 2.1 Actualizar el procedimiento de recuperación y la checklist de release para usar el SHA y recrear API y worker juntos; verificar que no recomienda `latest` ni un `up` parcial con `--remove-orphans`.
- [x] 2.2 Ejecutar las pruebas afectadas, la validación estricta de OpenSpec y la validación de sintaxis del workflow; registrar cualquier limitación de prueba remota.
