# Post-Deploy QA Template (Production)

Use this template after each `dev -> main` promotion.

## Deployment context

- Date:
- Commit:
- Frontend URL (Netlify):
- Backend URL (Render/API):
- Operator:

## Health checks

- [ ] `GET /health/live` = 200
- [ ] `GET /health/ready` = 200

Evidence:
- live response:
- ready response:

## Auth checks

- [ ] OTP request works from login
- [ ] OTP verify works
- [ ] Invalid code shows frontend error
- [ ] Expired code shows frontend error

Evidence:
- phone used:
- screenshot/log ref:

## Core finance checks

- [ ] Create manual expense in web (modal flow)
- [ ] Create manual income in web (modal flow)
- [ ] Dashboard updates for selected month
- [ ] Budget progress includes category/subcategory expenses

Evidence:
- expense id:
- income id:
- screenshot/log ref:

## Telegram checks

- [ ] `/start` response OK
- [ ] `/link +phone` response OK
- [ ] Natural-language expense saved
- [ ] Duplicate confirmation (`guardar` / `descartar`) works
- [ ] Update movement by reference works

Evidence:
- chat id:
- sample messages:
- screenshot/log ref:

## API compatibility checks

- [ ] `/budgets` used by frontend
- [ ] `/budgets/monthly` deprecated behavior verified (or disabled)
- [ ] Swagger `/api/docs` reachable and current

Notes:
- If `LEGACY_BUDGETS_ENDPOINTS_ENABLED=false`, expect `/budgets/monthly` to be unavailable.

## Result

- Release status: PASS / FAIL
- Observations:
- Follow-up tasks:

