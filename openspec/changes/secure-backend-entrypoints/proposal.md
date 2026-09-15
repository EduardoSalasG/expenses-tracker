## Why

Los puntos de entrada públicos permiten una toma de cuenta vinculada a Telegram y la producción puede iniciar con secretos o verificaciones de webhook opcionales. Deben cerrarse antes de ampliar la experiencia de producto.

## What Changes

- El flujo de vínculo Telegram SHALL crear y consumir tokens solo desde una identidad autenticada o un webhook verificado por el proveedor.
- La configuración de producción MUST rechazar secretos predeterminados, orígenes abiertos y canales habilitados sin secreto de firma.
- Los endpoints de autenticación SHALL aplicar límites de abuso, enfriamiento OTP y respuestas no enumerables.
- La API SHALL devolver errores tipados, códigos HTTP estables y mensajes 5xx opacos.

## Capabilities

### New Capabilities
- `secure-auth-entrypoints`: autenticación, vínculo de mensajería y defensa contra abuso seguros.
- `production-security-configuration`: inicio seguro y verificación obligatoria de canales productivos.
- `api-error-contract`: contrato consistente y seguro para errores HTTP.

### Modified Capabilities

- Ninguna; no existen specs base.

## Impact

Rutas y casos de uso de autenticación, configuración Zod, middleware de errores, Swagger y pruebas HTTP/integración.
