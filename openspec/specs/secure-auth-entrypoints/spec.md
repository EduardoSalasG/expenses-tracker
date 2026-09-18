# secure-auth-entrypoints Specification

## Purpose

Protege los puntos públicos de autenticación y vinculación para impedir toma de cuentas y abuso automatizado.

## Requirements

### Requirement: Vínculo de mensajería verificable
El sistema SHALL emitir o consumir un vínculo de cuenta de mensajería únicamente cuando la identidad solicitante esté autenticada o el evento provenga de un webhook cuya firma haya sido verificada. El identificador de chat MUST derivarse del contexto verificado por el servidor.

#### Scenario: Solicitud pública de token de vínculo
- **WHEN** una solicitud no autenticada intenta emitir un token para un identificador de chat
- **THEN** el sistema MUST rechazarla sin emitir un token ni una sesión

#### Scenario: Consumo de vínculo verificado
- **WHEN** el usuario consume un vínculo creado desde un contexto autenticado o webhook verificado y vigente
- **THEN** el sistema SHALL emitir sesión solo para la cuenta enlazada a ese contexto

### Requirement: Defensa de abuso de autenticación
El sistema SHALL limitar solicitudes de autenticación por identidad e IP, MUST aplicar enfriamiento y máximo de intentos a OTP, y MUST evitar revelar si una cuenta existe en respuestas públicas.

#### Scenario: Límite excedido
- **WHEN** una identidad o IP supera el límite configurado de solicitud OTP
- **THEN** el sistema SHALL responder 429 con Retry-After sin enviar un OTP adicional
