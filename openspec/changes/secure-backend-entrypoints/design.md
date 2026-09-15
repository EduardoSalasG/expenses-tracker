## Context

Ver `proposal.md` y los delta specs. El backend Express centraliza configuración Zod, controladores HTTP, casos de uso y middleware; sus rutas de auth y webhooks hoy dependen de verificaciones y clasificación de errores dispersas por texto.

## Goals / Non-Goals

**Goals:**
- Establecer un límite de confianza claro entre HTTP público, identidad autenticada y eventos de proveedor verificados.
- Hacer la configuración productiva inválida imposible de iniciar.
- Ofrecer un contrato de error estable y comprobable para frontend y Swagger.

**Non-Goals:**
- Cambiar proveedores de identidad o el modelo de sesión JWT.
- Incorporar un worker de webhooks; ese cambio pertenece a `durable-webhook-operations`.

## Decisions

### Límite de vínculo de Telegram
El token de vínculo se emitirá solo desde una sesión autenticada o un evento Telegram firmado; el servidor extraerá el chat del contexto verificado. Se elimina la confianza en `chatId` enviado por un cliente anónimo. Alternativa descartada: conservar el endpoint público con un chatId ofuscado; no elimina la posibilidad de enumeración ni prueba de posesión.

### Configuración segura por entorno
La validación Zod aplicará refinamientos condicionales en producción: secreto JWT no predeterminado, CORS explícito y secreto por cada canal habilitado. La composición de rutas registrará solo canales configurados. Alternativa descartada: advertir en logs; no evita que tráfico inseguro llegue al proceso.

### Defensa de abuso sin estado de aplicación
Se agregará un middleware de rate limit con claves por IP e identidad normalizada, y el puerto/repositorio OTP almacenará enfriamiento e intentos. Las respuestas públicas conservarán forma genérica. Alternativa descartada: solo límites de reverse proxy; no cubre identidad distribuida ni reglas de OTP.

### Errores tipados
Un `AppError` con código, estado y mensaje público sustituirá clasificación por texto. Un adaptador Zod y middleware único traducirán errores; los inesperados registrarán detalle con request ID y devolverán un cuerpo opaco. Alternativa descartada: mapear expresiones de mensajes en cada controlador; es frágil y contradice Swagger.

## Risks / Trade-offs

- [Rate limit en memoria se reinicia al desplegar] → usar una interfaz de store y documentar Redis/PostgreSQL como implementación productiva si hay múltiples réplicas.
- [Cambio de enlace rompe clientes no oficiales] → responder error explícito, actualizar Swagger y mantener el flujo autenticado web soportado.
- [Errores tipados incompletos] → pruebas de contrato por ruta y fallback 500 opaco obligatorio.

## Migration Plan

1. Añadir pruebas de regresión que demuestren rechazo de emisión/consumo público y de configuración insegura.
2. Desplegar la validación con secretos productivos configurados y observar métricas de rechazos/429.
3. Publicar contrato de errores y migrar controladores en un cambio coherente.
4. Si una configuración válida impide el arranque, revertir el despliegue y corregir secretos; nunca relajar la validación para aceptar tráfico inseguro.
