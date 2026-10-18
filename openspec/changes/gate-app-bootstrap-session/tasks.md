## 1. Pruebas de arranque

- [x] 1.1 Añadir pruebas que cubran resolución de sesión válida, inválida y ausente, verificando que fallan antes de introducir el bootstrap.
- [x] 1.2 Añadir pruebas del componente raíz que exijan pantalla de carga antes del router y ausencia de contenido enrutado durante el bootstrap; verificar que fallan inicialmente.

## 2. Resolución de sesión

- [x] 2.1 Implementar una operación idempotente de bootstrap de sesión que renueve tokens cuando corresponda y limpie credenciales inválidas; verificar las pruebas de autenticación.
- [x] 2.2 Implementar el gate del componente raíz y la pantalla de carga accesible con un mínimo de dos segundos; verificar las pruebas de componente.

## 3. Verificación

- [x] 3.1 Ejecutar las pruebas focalizadas de autenticación y componente raíz, más el build de producción del frontend, verificando resultados exitosos.
- [x] 3.2 Ejecutar el detector Impeccable sobre los archivos de UI modificados y realizar una revisión móvil/desktop única; registrar limitaciones de entorno.
- [x] 3.3 Validar el cambio OpenSpec en modo estricto y actualizar el handoff con presupuesto, evidencia y tareas pendientes.
