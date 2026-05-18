# Database

PostgreSQL schema, seed data, functions, and query analysis notes.

## Docker Image

The database image is built from `database/Dockerfile`. On first container startup, PostgreSQL executes:

- `10-001-initial-schema.sql`
- `11-002-messaging-message-id-idempotency.sql`
- `12-003-report-preferences-index.sql`
- `13-004-transfer-payment-method.sql`
- `14-005-messaging-pending-drafts.sql`
- `15-006-split-user-names.sql`
- `16-007-expand-default-categories.sql`
- `17-008-rename-whatsapp-messaging-tables.sql`
- `18-009-reporting-aggregates-by-tenant.sql`
- `19-010-report-dispatches.sql`
- `20-001-demo-seed.sql`

The seed creates:

- Demo consumer user: `+56912345678`, `demo@example.com`
- Admin user: `+56900000000`, `admin@example.com`
- Default category tree for both tenants, including Food/Groceries, Food/Restaurants, Transport/Uber, Education/Dance, Services/Phone, and related consumer categories
- Compatibility login role: `postgres` / `postgres`, useful for older local `.env` files

Expenses support `cash`, `card`, and `transfer` payment methods. Card payments can include `credit` or `debit` card type; transfer payments can store the originating bank.

Provider clarification state is stored in `messaging_pending_drafts` with one active draft per tenant/user/channel.

Users store `first_name`, `last_name`, and `preferred_name`. `preferred_name` is the display/communication name used by the app when addressing the user.

## Local Compose

```bash
docker compose up --build
```

## Local Script Runner

When PostgreSQL is already running, use the backend runner:

```bash
pnpm db:migrate
pnpm db:seed
```

For an existing local database created before the messaging table rename, run the targeted migration:

```bash
pnpm db:migrate:messaging
```

The database is exposed at:

```text
postgres://expenses:expenses@localhost:5433/expenses_tracker
```

## Query Analysis

Update `query-analysis.md` whenever report, dashboard, or tenant-scoped query behavior changes.
