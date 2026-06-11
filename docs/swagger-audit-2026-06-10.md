# Swagger Audit - 2026-06-10

Final API contract pass against `backend/src/interfaces/http/openapi.ts` and `/api/docs`.

## Scope

Checked for each relevant route:

- success example
- validation or business-rule error example
- auth error example when the route is authenticated
- current Telegram/web auth wording

## Public auth and onboarding

- `POST /auth/register/lead`
  - success: lead saved
  - validation: invalid lead payload
- `POST /auth/register`
  - success: created session
  - validation/business: invalid payload, phone already registered
- `POST /auth/login`
  - success: created session
  - validation/business: invalid payload, invalid credentials
- `POST /auth/magic-link/request`
  - success: email sent + masked destination
  - validation/business: missing account, missing email, provider send failure
- `POST /auth/magic-link/consume`
  - success: created session
  - validation/business: invalid or expired token
- `POST /auth/otp/request`
  - success: linked existing user and registration-required user examples
  - validation/business: invalid payload, Telegram not linked
- `POST /auth/otp/verify`
  - success: verified session
  - validation/business: invalid code, expired code
- `POST /auth/telegram/registration-link`
  - success: deep link generated
  - validation/business: invalid phone, missing bot username
- `POST /auth/telegram/link-token`
  - success: token generated
  - validation/business: invalid chat id
- `POST /auth/telegram/consume-link-token`
  - success: linked user, unlinked user, chat-only variants
  - validation/business: invalid or expired token
- `POST /auth/refresh`
  - success: refreshed session
  - validation/business: invalid refresh token

## Authenticated profile/configuration

- `GET /me`
  - success example present
  - auth error example present
- `PUT /me`
  - success example present
  - validation example present
  - auth error example present
- `PUT /report-preferences`
  - success example present
  - validation example present
  - auth error example present

## Expenses

- `GET /expenses`
  - success example present
  - validation example present
  - auth error example present
- `GET /expenses/recent`
  - success example present
  - validation example present
  - auth error example present
- `POST /expenses`
  - success example present
  - validation/business examples: payload, category, subcategory
  - auth error example present
  - installments documented
- `PUT /expenses/{expenseId}`
  - success example present
  - validation/business examples: payload, subcategory mismatch
  - not-found example present
  - auth error example present
- `DELETE /expenses/{expenseId}`
  - success example present
  - not-found example present
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

## Categories, budgets, catalogs

- `GET /categories`
- `POST /categories`
- `GET /banks`
- `POST /banks`
- `PUT /banks/{bankOptionId}`
- `DELETE /banks/{bankOptionId}`
- `GET /payment-method-options`
- `POST /payment-method-options`
- `PUT /payment-method-options/{paymentMethodOptionId}`
- `DELETE /payment-method-options/{paymentMethodOptionId}`
- `GET /budgets`
- `PUT /budgets`
- `GET /budgets/monthly` (deprecated)
- `PUT /budgets/monthly` (deprecated)

For all routes above:

- success examples are present
- validation/business-rule examples are present where applicable
- auth error example is present
- the contract is aligned with the current private UI flows:
  - expense create/edit can create category, subcategory, bank, and payment method inline
  - budget create/edit can create category and subcategory inline
  - incomes do not expose category/bank/payment-method selects because the current income model does not include those fields

## Reports and messaging

- `GET /reports`
- `GET /reports/expenses/yearly-monthly`
- `GET /reports/expenses/monthly-daily`
- `GET /reports/expenses/weekly-daily`
- `GET /reports/incomes/yearly-monthly`
- `GET /reports/incomes/monthly-daily`
- `GET /reports/expenses/category-totals`
- `GET /reports/expenses/upcoming-installments`
- `POST /webhooks/telegram`

For the report endpoints:

- success examples are present through standard authenticated collection/object responses
- validation examples are present
- auth error example is present

For the Telegram webhook:

- accepted webhook example present
- create/edit processing example present
- invalid secret example present

## Notes

- The contract is now aligned with Telegram as the active messaging channel.
- Deprecated budget aliases remain documented for backward compatibility.
- Swagger already reflects manual edit/delete flows for expenses and incomes.
- The remaining legacy `/budgets/monthly` references are explicitly deprecated compatibility aliases, not the canonical product flow.
