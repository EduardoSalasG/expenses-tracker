# Shared Accounts Design

## Objective

Add shared financial contexts without breaking the current personal-account behavior.
User identity remains personal. Financial activity moves under an explicit account context.

## Core Domain

### Financial Account

Types:

- `personal`
- `shared`

Every user must have exactly one personal financial account.
A user may also belong to zero or more shared accounts.

### Membership

Roles:

- `owner`
- `admin`
- `member`

Rules:

- only `owner` or `admin` can invite new members
- only `owner` can transfer ownership
- every shared account must always keep at least one active owner

### Invitation

Invitation is independent from registration state.
It may target an existing user email or a future user email.

## Data Model

### New tables

#### `financial_accounts`

- `id`
- `tenant_id`
- `type` (`personal | shared`)
- `name`
- `currency`
- `created_by_user_id`
- `created_at`
- `updated_at`

#### `financial_account_members`

- `id`
- `financial_account_id`
- `user_id`
- `role`
- `status` (`active | invited | removed`)
- `joined_at`
- `created_at`
- `updated_at`

Unique key:

- `(financial_account_id, user_id)`

#### `financial_account_invitations`

- `id`
- `financial_account_id`
- `invited_by_user_id`
- `email`
- `phone_number`
- `token`
- `status` (`pending | accepted | expired | revoked`)
- `expires_at`
- `accepted_at`
- `created_at`
- `updated_at`

#### `messaging_channel_contexts`

- `id`
- `channel`
- `provider_user_id`
- `user_id`
- `financial_account_id`
- `updated_at`

Purpose:

- store the currently active financial account for Telegram capture

Unique key:

- `(channel, provider_user_id)`

### Existing tables to extend

Add `financial_account_id` to:

- `expenses`
- `incomes`
- `budgets`
- `categories`
- `bank_options`
- `payment_method_options`

Add to `expenses`:

- `created_by_user_id`
- `paid_by_user_id`

## Category Model

Keep system defaults as base catalog.
Each financial account gets:

- system and tenant default categories, inherited as a shared base catalog
- account-level custom categories and subcategories

Functional rule:

- category reads for an active account merge the system defaults, tenant defaults, and that account's custom categories/subcategories
- creating a category or subcategory while a shared account is active creates an account-scoped customization; it never duplicates the base catalog

## Authorization Rules

Any request that reads or writes account-scoped financial data must validate:

1. authenticated user
2. active membership in target `financial_account_id`
3. role permission when the action is administrative

Administrative actions:

- rename shared account
- invite members
- remove members
- manage account settings

`owner` and `admin` can administer.
Only `owner` can transfer ownership or delete the account.

## Telegram Behavior

### Default behavior

- if no shared context is active, use personal account

### Context switch

Support command form:

- `/Casa`
- `/Viaje`
- `/Personal`

Recommended MVP:

- activate account by command
- persist active account in `messaging_channel_contexts`
- all next captured messages use that context until changed

Later, allow explicit override in a single message:

- `casa 25000 supermercado`

## API Proposal

### Accounts

- `GET /accounts`
- `POST /accounts`
- `GET /accounts/:accountId`
- `PATCH /accounts/:accountId`

### Members and invitations

- `GET /accounts/:accountId/members`
- `POST /accounts/:accountId/invitations`
- `POST /accounts/invitations/:token/accept`
- `DELETE /accounts/:accountId/members/:memberUserId`

### Account context

- `GET /me/account-context`
- `PUT /me/account-context`

### Existing financial modules

Expenses, incomes, budgets, categories, banks, and payment methods must operate against:

- selected account context from web session
- explicit `financialAccountId` in request
- or current messaging context in Telegram

## Migration Plan

### Step 1: Schema migration

One migration file or ordered migration set must:

- create new shared-account tables
- add nullable `financial_account_id` to existing financial tables
- add new expense ownership fields
- create required indexes and foreign keys

### Step 2: One-time backfill script

One explicit backfill script must:

- create one personal financial account per existing user
- assign owner membership to that user
- populate `financial_account_id` in all existing financial tables
- populate `created_by_user_id` and `paid_by_user_id` on existing expenses with the historical user id when possible

This script must be:

- safe to run once in production
- explicit, not automatic on app startup
- logged

### Step 3: Constraint tightening

After backfill:

- set `financial_account_id` as `NOT NULL` where applicable

## Splitwise Phases to Preserve

### Phase 1

- personal + shared accounts
- invitations
- shared capture and reporting
- Telegram account switching

### Phase 2

- shared expense with payer attribution

### Phase 3

- allocation table
- equal split
- custom split
- balances by member

### Phase 4

- settlements
- reimbursement history
- debt summaries

## Implementation Order

1. schema design and migration scripts
2. repository and authorization adaptation
3. account selector in frontend
4. account CRUD and invitation flow
5. Telegram context switching
6. shared account reporting
7. Splitwise-style allocation and settlements

## Current Status

Implemented in backend and frontend as of August 11, 2026:

- schema foundation and backfill support
- repository support for memberships, invitations, and messaging contexts
- shared account creation and rename
- member listing and member removal
- invitation creation and acceptance
- Telegram account-context switching with `/AccountName`
- frontend account selector and active-account context switching
- active account visibility banner across dashboard, expenses, incomes, budgets, and categories
- frontend shared-account management in Settings
- invitation link generation and authenticated invitation acceptance flow
- account-scoped dashboard/reporting through the active financial account context
- split allocations with payer attribution, equal split, and custom split persistence
- balances by member
- suggested settlements derived from current balances
- recorded settlements and settlement history
- Telegram shared-account split and settlement handling

Still pending:

- richer shared-account summaries and alerts
- more advanced split presets such as percentage-based templates
- broader debt-resolution UX beyond the current Settings surface
