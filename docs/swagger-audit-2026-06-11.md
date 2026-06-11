# Swagger Audit - 2026-06-11

Final endpoint-by-endpoint contract review against `backend/src/interfaces/http/openapi.ts`.

## Audit rule

For each relevant route, verified:

- success example
- validation and/or business-rule error example when applicable
- auth error example for authenticated routes
- wording aligned with current product state:
  - web-first auth
  - optional Telegram linking
  - canonical `/budgets`
  - deprecated `/budgets/monthly` compatibility aliases

## Health and public context

- `GET /health`
  - success example present
- `GET /health/live`
  - success example present
- `GET /health/ready`
  - success example present
- `GET /public/context`
  - success example present

## Auth and onboarding

- `POST /auth/otp/request`
  - success example present
  - validation/business examples present
- `POST /auth/register/lead`
  - success example present
  - validation example present
- `POST /auth/register`
  - success example present
  - validation/business examples present
- `POST /auth/login`
  - success example present
  - validation/business examples present
- `POST /auth/magic-link/request`
  - success example present
  - validation/business examples present
- `POST /auth/magic-link/consume`
  - success example present
  - validation/business examples present
- `POST /auth/telegram/registration-link`
  - success example present
  - validation/business examples present
- `POST /auth/otp/verify`
  - success example present
  - validation/business examples present
- `POST /auth/refresh`
  - success example present
  - validation/business examples present
- `POST /auth/telegram/link-token`
  - success example present
  - validation/business examples present
- `POST /auth/telegram/consume-link-token`
  - success example present
  - validation/business examples present

## Profile

- `GET /me`
  - success example present
  - auth error example present
- `PUT /me`
  - success example present
  - validation example present
  - auth error example present

## Expenses

- `GET /expenses`
  - success example present
  - validation example present
  - auth error example present
- `POST /expenses`
  - success example present
  - validation/business examples present
  - auth error example present
  - installments documented
- `PUT /expenses/{expenseId}`
  - success example present
  - validation/business examples present
  - not-found example present
  - auth error example present
- `DELETE /expenses/{expenseId}`
  - success example present
  - not-found example present
  - auth error example present
- `GET /expenses/recent`
  - success example present
  - validation example present
  - auth error example present

## Incomes

- `GET /incomes`
  - success example present
  - validation example present
  - auth error example present
- `POST /incomes`
  - success example present
  - validation example present
  - auth error example present
- `PUT /incomes/{incomeId}`
  - success example present
  - validation example present
  - not-found example present
  - auth error example present
- `DELETE /incomes/{incomeId}`
  - success example present
  - not-found example present
  - auth error example present

## Categories and catalogs

- `GET /categories`
  - success example present
  - auth error example present
- `POST /categories`
  - success example present
  - validation/business examples present
  - auth error example present
- `GET /banks`
  - success example present
  - auth error example present
- `POST /banks`
  - success example present
  - validation/business examples present
  - auth error example present
- `PUT /banks/{bankOptionId}`
  - success example present
  - validation/business examples present
  - not-found example present
  - auth error example present
- `DELETE /banks/{bankOptionId}`
  - success example present
  - validation/business examples present
  - not-found example present
  - auth error example present
- `GET /payment-method-options`
  - success example present
  - auth error example present
- `POST /payment-method-options`
  - success example present
  - validation/business examples present
  - auth error example present
- `PUT /payment-method-options/{paymentMethodOptionId}`
  - success example present
  - validation/business examples present
  - not-found example present
  - auth error example present
- `DELETE /payment-method-options/{paymentMethodOptionId}`
  - success example present
  - validation/business examples present
  - not-found example present
  - auth error example present

## Budgets

- `GET /budgets`
  - success example present
  - auth error example present
- `PUT /budgets`
  - success example present
  - validation/business examples present
  - auth error example present
- `GET /budgets/monthly`
  - deprecated flag present
  - success example present
  - auth error example present
- `PUT /budgets/monthly`
  - deprecated flag present
  - success example present
  - validation/business examples present
  - auth error example present

## Reports

- `GET /reports`
  - success example present
  - validation example present
  - auth error example present
- `GET /reports/expenses/yearly-monthly`
  - success example present
  - validation example present
  - auth error example present
- `GET /reports/expenses/monthly-daily`
  - success example present
  - validation example present
  - auth error example present
- `GET /reports/expenses/weekly-daily`
  - success example present
  - validation example present
  - auth error example present
- `GET /reports/incomes/yearly-monthly`
  - success example present
  - validation example present
  - auth error example present
- `GET /reports/incomes/monthly-daily`
  - success example present
  - validation example present
  - auth error example present
- `GET /reports/expenses/category-totals`
  - success example present
  - validation example present
  - auth error example present
- `GET /reports/expenses/upcoming-installments`
  - success example present
  - validation example present
  - auth error example present

## Report preferences

- `PUT /report-preferences`
  - success example present
  - validation example present
  - auth error example present

## Telegram webhook

- `POST /webhooks/telegram`
  - accepted webhook example present
  - create/edit processing example present
  - invalid secret example present

## Final notes

- Contract wording is aligned with Telegram as the active optional messaging channel.
- Web-first auth and magic-link flows are documented consistently.
- Deprecated budget aliases remain explicit compatibility paths, not the canonical UI/API flow.
- Swagger is release-ready for backend promotion.
