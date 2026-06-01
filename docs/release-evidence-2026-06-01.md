# Release Evidence (dev -> main) - 2026-06-01

This document records the executed evidence for promotion flow and post-deploy validation.

## Promotion flow

- Branch model: `dev` integration, `main` production.
- Promotion action: `dev -> main` fast-forward merge completed.
- Hotfix regularization rule: if a hotfix is applied to `main`, immediately merge `main -> dev`.

## Build/test gates

- Backend tests: PASS.
- Backend build: PASS.
- Frontend production build: PASS.

## Deploy evidence

- Netlify deploy for `main` completed after:
  - publish path correction in `netlify.toml`.
  - Angular production budget adjustment.

## Messaging smoke evidence (Telegram)

- Telegram webhook configured and accepted by Bot API.
- Inbound text processed by backend.
- OTP delivery path verified through Telegram provider.
- Natural-language movement save flow verified.

## Rollback baseline

If release rollback is required:

1. Roll app runtime to previous `main` commit in hosting platform.
2. Keep DB at current migration level unless a forward-fix migration is prepared.
3. Re-run health checks and smoke auth/messaging after rollback.
