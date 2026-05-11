# Mermaid Flow Diagrams

This index summarizes the current system diagrams. Each diagram has its own Mermaid source file so changes can be reviewed and updated independently.

## Index

- [OTP Login](otp-login.mmd): WhatsApp OTP request, verification, user creation, onboarding greeting, category seeding, and token storage.
- [WhatsApp Expense Capture](whatsapp-expense-capture.mmd): Upstream sender allowlisting, defensive registered-user checks, message interpretation, pending draft clarification, expense/income persistence, and finance answers.
- [Message Interpretation](message-interpretation.mmd): Provider-agnostic LLM/deterministic intent extraction before backend validation.
- [Manual Expense Creation](manual-expense-creation.mmd): Authenticated frontend expense form submission and tenant-scoped save.
- [Income Creation](income-creation.mmd): Authenticated frontend income form submission and tenant-scoped save.
- [Category Management](category-management.mmd): Tenant-scoped main category and subcategory creation.
- [Monthly Budget Flow](monthly-budget-flow.mmd): Monthly category budget upsert from the dashboard.
- [Report Generation](report-generation.mmd): Dashboard report request, period reads, and totals in the tenant working currency.
- [WhatsApp Report Delivery](whatsapp-report-delivery.mmd): Scheduled one-shot worker selection and WhatsApp summary delivery.
- [Profile Settings](profile-settings.mmd): Current user profile edits and report preference updates.
- [Tenant-Scoped Request Flow](tenant-scoped-request-flow.mmd): JWT tenant extraction and repository-level tenant filtering.
- [Database and Report Query Flow](database-report-query-flow.mmd): Decision path for direct SQL vs PostgreSQL functions and query analysis updates.
- [Domain Relationships](domain-relationships.mmd): Core tenant, user, category, expense, income, and budget relationships.
- [Backend Architecture](backend-architecture.mmd): Clean/hexagonal backend dependency direction and module responsibilities.

## Resume

The diagrams describe the MVP from user identity through daily financial tracking. Users authenticate with WhatsApp OTP, store access and refresh tokens, and every frontend request is scoped by the tenant id inside the JWT. Existing phone numbers use an OTP-only login path. Unknown phone numbers must provide first name, last name, preferred name, email, country, and preferred currency before OTP verification creates the profile. After a new profile is created, the backend sends a WhatsApp greeting using the preferred name and includes usage examples for expense, income, report, and budget questions. Preferred name is the name used in app-to-user communication. Expired access tokens are refreshed once before the original request is retried. Finance messages can enter through a provider-specific messaging adapter such as WhatsApp, only for registered/test-approved senders, or through the manual Angular forms. The messaging adapter translates inbound text into the provider-neutral finance-message use case. Text is interpreted through a provider-agnostic port that can use deterministic parsing or an OpenAI-compatible LLM provider before backend validation. Incomplete messaging movements create a 30-minute pending draft so the user can answer with only the missing detail or cancel. Messaging-created movements use the user's preferred currency from profile settings instead of per-message currency. Incomes, categories, budgets, profile data, and report preferences are managed from the dashboard. Report data is read by tenant and period in the tenant working currency.

The database flow documents the engineering rule for query choices: use direct parameterized SQL for simple reads and writes, PostgreSQL functions for atomic multi-step operations or heavier aggregation, and update `database/query-analysis.md` whenever critical query behavior changes.
