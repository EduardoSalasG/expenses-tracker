## 1. Vínculo de mensajería seguro

- [x] 1.1 Escribir pruebas HTTP que demuestren que una solicitud anónima no puede emitir ni consumir una sesión mediante un chatId; verificar que fallan contra el comportamiento actual.
- [x] 1.2 Restringir la emisión de vínculo a sesión autenticada o webhook verificado y derivar el chat desde el contexto de servidor; verificar las pruebas de 1.1 y los flujos de vínculo admitidos.
- [x] 1.3 Actualizar rutas, Swagger y pruebas de regresión del vínculo; ejecutar `pnpm --filter @expenses-tracker/backend test`.

## 2. Configuración y canales productivos

- [ ] 2.1 Añadir pruebas de configuración para secreto JWT predeterminado, CORS incompleto y canales habilitados sin secreto; verificar rechazo de arranque en producción.
- [ ] 2.2 Aplicar refinamientos Zod y composición condicional de rutas inbound; verificar que una configuración válida conserva health y que una inválida no inicia.
- [ ] 2.3 Documentar variables obligatorias y actualizar ejemplos/operaciones; ejecutar `pnpm --filter @expenses-tracker/backend build`.

## 3. Abuso y contrato de errores

- [ ] 3.1 Crear pruebas con reloj controlado para cooldown OTP, límite por IP/identidad, 429/Retry-After y respuesta no enumerable; verificar fallo inicial.
- [ ] 3.2 Implementar rate-limit y estado de OTP mediante puertos testeables; verificar límites, expiración y rutas legítimas.
- [ ] 3.3 Definir `AppError`, adaptador Zod, request ID y middleware de error opaco; verificar contratos 400, 401, 403, 404, 409, 422 y 500 sin datos internos.
- [ ] 3.4 Actualizar Swagger/Postman y ejecutar tests, lint y build backend completos.

## 4. Revisión de seguridad

- [ ] 4.1 Añadir matriz de pruebas de aislamiento por cuenta para mutaciones e IDs ajenos; verificar rechazo en cada ruta afectada.
- [ ] 4.2 Revisar logs de prueba para confirmar que no contienen tokens, cuerpos de webhook ni detalles internos; documentar la brecha de integración PostgreSQL si no hay servicio CI disponible.
