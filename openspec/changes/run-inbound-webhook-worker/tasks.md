## 1. Consumidor persistente

- [x] 1.1 Extraer un ciclo de consumo cancelable que procese tandas, espere sólo con bandeja vacía y valide las variables de tamaño e intervalo; verificarlo con pruebas unitarias de trabajo continuo, espera y apagado.
- [x] 1.2 Añadir el punto de entrada daemon y el script de paquete, conservando el comando de una sola ronda; verificar que la compilación backend produzca ambos entry points.

## 2. Operación y despliegue

- [x] 2.1 Declarar el servicio de worker persistente de producción con la misma imagen y entorno que la API; verificar `docker compose config --images` y la configuración renderizada.
- [x] 2.2 Actualizar el workflow de despliegue para recrear e inspeccionar API y worker con el tag SHA esperado, incluido su estado de ejecución; verificar la sintaxis del workflow y sus aserciones por servicio.
- [x] 2.3 Actualizar la guía operativa con el ciclo de vida, variables, observabilidad, verificación y procedimiento de recuperación; verificar que no conserve la instrucción obsoleta de cron como requisito productivo.

## 3. Verificación integrada

- [x] 3.1 Ejecutar lint, pruebas unitarias relevantes y build backend; verificar que todos finalicen correctamente.
- [x] 3.2 Validar estrictamente OpenSpec y revisar el diff final contra las especificaciones; verificar que las tareas completadas y la documentación reflejen el comportamiento entregado.
