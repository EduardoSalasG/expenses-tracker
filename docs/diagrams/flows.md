# Mermaid Flow Diagrams

This index summarizes the current system diagrams. Each diagram has its own Mermaid source file so changes can be reviewed and updated independently.

## Index

- [OTP Login](otp-login.mmd): WhatsApp OTP request, verification, user upsert, tenant creation, category seeding, and token storage.
- [WhatsApp Expense Capture](whatsapp-expense-capture.mmd): Upstream sender allowlisting, defensive registered-user checks, message interpretation, clarification, expense/income persistence, and finance answers.
- [Message Interpretation](message-interpretation.mmd): Provider-agnostic LLM/deterministic intent extraction before backend validation.
- [Manual Expense Creation](manual-expense-creation.mmd): Authenticated frontend expense form submission and tenant-scoped save.
- [Income Creation](income-creation.mmd): Authenticated frontend income form submission and tenant-scoped save.
- [Category Management](category-management.mmd): Tenant-scoped main category and subcategory creation.
- [Monthly Budget Flow](monthly-budget-flow.mmd): Monthly category budget upsert from the dashboard.
- [Report Generation](report-generation.mmd): Dashboard report request, period reads, and currency-separated totals.
- [WhatsApp Report Delivery](whatsapp-report-delivery.mmd): Scheduled one-shot worker selection and WhatsApp summary delivery.
- [Profile Settings](profile-settings.mmd): Current user profile edits and report preference updates.
- [Tenant-Scoped Request Flow](tenant-scoped-request-flow.mmd): JWT tenant extraction and repository-level tenant filtering.
- [Database and Report Query Flow](database-report-query-flow.mmd): Decision path for direct SQL vs PostgreSQL functions and query analysis updates.
- [Domain Relationships](domain-relationships.mmd): Core tenant, user, category, expense, income, and budget relationships.

## Resume

The diagrams describe the MVP from user identity through daily financial tracking. Users authenticate with WhatsApp OTP, store access and refresh tokens, and every frontend request is scoped by the tenant id inside the JWT. Expired access tokens are refreshed once before the original request is retried. Finance messages can enter through WhatsApp only for registered/test-approved senders or through the manual Angular forms. WhatsApp text is interpreted through a provider-agnostic port that can use deterministic parsing or an OpenAI-compatible LLM provider before backend validation. Incomes, categories, budgets, profile data, and report preferences are managed from the dashboard. Report data is read by tenant and period, with totals kept separated by currency until exchange-rate conversion is introduced.

The database flow documents the engineering rule for query choices: use direct parameterized SQL for simple reads and writes, PostgreSQL functions for atomic multi-step operations or heavier aggregation, and update `database/query-analysis.md` whenever critical query behavior changes.
