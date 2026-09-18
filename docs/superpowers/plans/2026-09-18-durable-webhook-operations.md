# Durable Webhook Operations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persistir y procesar webhooks entrantes de forma deduplicada, reintentable y observable.

**Architecture:** Los controladores verifican y encolan; un worker reclama eventos en PostgreSQL y delega al servicio de mensajería existente. La bandeja encapsula idempotencia, retry y DLQ.

**Tech Stack:** TypeScript, Express, PostgreSQL, Vitest.

**Spec:** `docs/superpowers/specs/2026-09-18-durable-webhook-operations-design.md`

## Global Constraints

- Conservar las URLs, firmas y respuestas exitosas actuales de Telegram y WhatsApp.
- Nunca persistir secretos ni registrar cuerpos completos de webhook.
- La deduplicación precede cualquier efecto de mensajería o finanzas.

### Task 1: Bandeja y migración durable

**Files:** crear migración, puerto de aplicación, repositorios PostgreSQL/en memoria y pruebas.

- [ ] Escribir pruebas rojas para encolar una vez, deduplicar y reclamar un evento.
- [ ] Crear `inbound_webhook_events` con clave única de proveedor, estado, intentos, próximo intento y correlación.
- [ ] Implementar repositorios con inserción idempotente y reclamo transaccional.
- [ ] Ejecutar pruebas de repositorio y migración.
- [ ] Commit: `feat: add durable inbound event inbox`.

### Task 2: Encolado HTTP y worker

**Files:** controladores Telegram/WhatsApp, servicio inbound, container, comando worker y pruebas HTTP.

- [ ] Escribir pruebas rojas de respuesta rápida y ausencia de procesamiento síncrono.
- [ ] Encolar mensajes y estados ya verificados, devolviendo 503 solo si la persistencia falla.
- [ ] Crear worker que delega al `InboundMessagingService` existente y marca éxito.
- [ ] Ejecutar pruebas HTTP y worker.
- [ ] Commit: `feat: process inbound webhooks asynchronously`.

### Task 3: Retry, DLQ y operación

**Files:** worker, configuración, logs/métricas, documentación y pruebas.

- [ ] Escribir pruebas rojas de backoff, agotamiento y DLQ sin payload sensible.
- [ ] Implementar retry acotado, error saneado y logs con correlación.
- [ ] Documentar ejecución del worker y señales operativas.
- [ ] Ejecutar tests backend, build y validación OpenSpec.
- [ ] Commit: `feat: add webhook retry and dead-letter handling`.
