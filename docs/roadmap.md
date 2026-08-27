# Roadmap

## Delivered

- Web-first registration, password access, Resend magic links, and optional Telegram linking.
- Personal expense and income tracking, permanent budgets, reports, categories, payment catalogs, and installments.
- Spanish/English public experience, responsive dashboard, dark mode, and first-run onboarding.
- Shared accounts: invitations, active account selection, shared movement visibility, account-scoped catalogs, member attribution, equal/custom allocations, balances, and settlements.
- Telegram capture, account switching, account-specific questions, shared split capture, movement corrections, and provider-neutral LLM interpretation.
- Production foundations: Docker backend, Oracle/Nginx deployment, Netlify frontend, health probes, PostgreSQL bootstrap/migrations/backfill, Swagger, Postman, Mermaid, and release evidence.

## Next Product Work

### Shared Accounts

- Surface balances, settlements, and upcoming obligations more prominently in the shared-account dashboard.
- Add percentage allocation presets and reusable split rules.
- Add shared-account monthly summaries and reminders.

### Finance Experience

- Improve recurring movement support and monthly forecasting.
- Extend installment planning with payment reminders and card-statement views.
- Continue improving interpreter accuracy with versioned QA cases and evaluated model prompts.

### Platform

- Add another inbound messaging adapter when there is a product need; the application port is already channel-neutral.
- Add product analytics only with an explicit privacy review.
- Keep automated visual regression checks for mobile and desktop critical flows.

## Release Rule

1. Develop and verify on `dev`.
2. Update Swagger, Postman, READMEs, diagrams, and query notes when the behavior requires it.
3. Commit and push `dev`.
4. Promote `dev -> main` only after the release checklist and QA evidence are complete.
5. Let Netlify and the Oracle backend workflow deploy from `main`.
