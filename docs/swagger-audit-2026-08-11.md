# Swagger Audit - 2026-08-11

Focused endpoint-by-endpoint contract review for the shared-account closure pass.

## Audit rule

For each relevant shared-account route, verified:

- success example
- validation and/or business-rule error example when applicable
- auth error example for authenticated routes
- wording aligned with the current product state

## Account CRUD and context

- `GET /accounts`
  - success example present
  - auth error example present
- `POST /accounts`
  - success example present
  - validation/business examples present
  - auth error example present
- `PATCH /accounts/{accountId}`
  - success example present
  - validation/business examples present
  - auth error example present
- `GET /me/account-context`
  - success example present
  - auth error example present
- `PUT /me/account-context`
  - success example present
  - validation/business examples present
  - auth error example present

## Membership and invitations

- `GET /accounts/{accountId}/members`
  - success example present
  - not-found example present
  - auth error example present
- `POST /accounts/{accountId}/invitations`
  - success example present
  - validation/business examples present
  - auth error example present
- `POST /accounts/invitations/{token}/accept`
  - success example present
  - validation/business examples present
  - auth error example present
- `DELETE /accounts/{accountId}/members/{memberUserId}`
  - success example present
  - validation/business examples present
  - auth error example present

## Balances and settlements

- `GET /accounts/{accountId}/balances`
  - success example present
  - shared-account-only example present
  - not-found example present
  - auth error example present
- `GET /accounts/{accountId}/settlement-suggestions`
  - success example present
  - shared-account-only example present
  - not-found example present
  - auth error example present
- `GET /accounts/{accountId}/settlements`
  - success example present
  - shared-account-only example present
  - not-found example present
  - auth error example present
- `POST /accounts/{accountId}/settlements`
  - success example present
  - validation/business examples present
  - shared-account-only example present
  - auth error example present

## Telegram crossover

Reviewed that the Telegram webhook contract still reflects the shared-account-compatible messaging behavior:

- `POST /webhooks/telegram`
  - accepted webhook example present
  - invalid secret example present
  - wording remains aligned with Telegram as the active optional messaging channel

## Final notes

- Shared-account contract coverage is now explicit in Swagger.
- The shared-account settlement-suggestion route is documented in Swagger and Postman.
- Wording is aligned with the current implementation state instead of the old “pending Splitwise layer” wording.

Swagger shared-account surface: RELEASE-READY
