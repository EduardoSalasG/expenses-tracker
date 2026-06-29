# Database

PostgreSQL schema, seed data, functions, and query analysis notes.

Important behavior:

- `pnpm db:migrate` applies incremental schema/data migrations to an existing environment.
- `pnpm db:bootstrap` is the canonical setup command for a brand-new database. It runs migrations and then inserts the system-owned default category catalog.
- `pnpm db:seed` is optional and only loads demo/local sample data.
- `pnpm db:export:tenant` exports one user tenant only, so local personal data can be moved to production without dumping the entire database.
- A brand-new production database is **not** auto-filled with demo users or business data just because the backend starts.

## Docker Image

The database image is built from `database/Dockerfile`. On first container startup, PostgreSQL executes:

- every file under `database/migrations/`
- every file under `database/bootstrap/`

It does **not** run demo seed data automatically.

`database/bootstrap/001_system_defaults.sql` ensures a fixed `system` tenant exists and owns the canonical default category tree. User tenants receive copies of that tree through `seed_default_categories(tenant_id)`.

The optional demo seed creates:

- Demo consumer user: `+56912345678`, `demo@example.com`
- Admin user: `+56900000000`, `admin@example.com`
- Tenant copies of the default category tree for both demo users, including Food/Groceries, Food/Restaurants, Transport/Uber, Services/Phone, Other/Gifts, and related consumer categories

The seed does **not** create expenses, incomes, budgets, or tenant business data.

Expenses support `cash`, `card`, and `transfer` payment methods. Card payments can include `credit` or `debit` card type; transfer payments can store the originating bank.

Migration `018_payment_catalogs_and_income_editing.sql` creates the global default payment catalogs used by the app:

- Banks:
  - Banco de Chile
  - Banco Internacional
  - Scotiabank Chile
  - Banco de Crédito e Inversiones
  - Banco BICE
  - Banco Santander-Chile
  - Banco Itaú Chile
  - Banco Falabella
  - Banco Ripley
  - Banco Consorcio
  - Tanner Banco Digital
  - Tenpo Bank Chile
  - Banco del Estado de Chile
- Payment methods:
  - Transferencia
  - Tarjeta de débito
  - Tarjeta de crédito
  - Efectivo

Those defaults come from migrations, not from the demo seed. Users can also create tenant-specific banks and payment methods later from the app.

System default categories currently include these roots:

- Food
- Transport
- Housing
- Health
- Education
- Services
- Entertainment
- Other

System default subcategories currently include:

- Food: Groceries, Restaurants
- Transport: Public Transport, Uber
- Housing: Rent
- Health: Appointments, Medicines, Procedures, Sports
- Education: Work
- Services: Phone
- Entertainment: Theater
- Other: Gifts

Provider clarification state is stored in `messaging_pending_drafts` with one active draft per tenant/user/channel.

Users store `first_name`, `last_name`, and `preferred_name`. `preferred_name` is the display/communication name used by the app when addressing the user.

## Local Compose

```bash
docker compose up --build
```

## Local Script Runner

When PostgreSQL is already running, use the backend runner:

```bash
pnpm db:bootstrap
pnpm db:migrate
pnpm db:seed
pnpm db:export:data
pnpm db:export:tenant
```

Use cases:

- `pnpm db:bootstrap`: new environment from zero
- `pnpm db:migrate`: existing environment upgrade
- `pnpm db:seed`: optional local/demo sample users
- `pnpm db:export:tenant`: export only one tenant/user dataset

For an existing local database created before the messaging table rename, run the targeted migration:

```bash
pnpm db:migrate:messaging-rename
```

The database is exposed at:

```text
postgres://expenses:expenses@localhost:5433/expenses_tracker
```

## Data Migration

To move the current business data to another environment:

1. Run migrations on the target database first.
2. Export the source data:

```bash
pnpm db:export:data
```

By default this writes a data-only SQL dump under `database/backups/`.
You can pass either a repo-relative path or an absolute path with `--output`.

To choose a specific file:

```bash
pnpm db:export:data -- --output database/backups/my-snapshot.sql
pnpm db:export:data -- --output C:\\backups\\expenses-tracker-prod.sql
```

To move only your own tenant instead of the whole database:

```bash
pnpm db:export:tenant -- --phone +56982439041
pnpm db:export:tenant -- --email you@example.com
pnpm db:export:tenant -- --tenant-id 11111111-1111-1111-1111-111111111111
pnpm db:export:tenant -- --phone +56982439041 --output database/backups/my-tenant.sql
```

That export includes tenant, users, categories, custom banks/payment methods, expenses, installments, incomes, budgets, messaging audit rows, pending drafts, and report dispatch history. It intentionally excludes transient auth/link tables such as OTP, email magic-link tokens, Telegram link tokens, and registration leads.

3. Import the dump into the target database:

```bash
pnpm db:import:data -- --input database/backups/my-snapshot.sql
pnpm db:import:data -- --input C:\\backups\\expenses-tracker-prod.sql
```

Notes:

- The export excludes `schema_migrations`; the target environment must manage migrations on its own.
- Tenant-scoped export assumes the target database is already initialized with `pnpm db:bootstrap`.
- The import assumes the target database already has the schema created and does not contain conflicting application rows.
- Import runs in a single transaction, so a failing row rolls back the whole data load instead of leaving a partial import behind.
- Full-database export still depends on `pg_dump`. If it is not in `PATH`, set `PG_DUMP_BIN` before running `db:export:data`.
- SQL import now runs through the backend Node/PostgreSQL connection, so no local `psql` binary is required.

## Query Analysis

Update `query-analysis.md` whenever report, dashboard, or tenant-scoped query behavior changes.
