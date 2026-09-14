# Persisted Category Translations

## Goal

Show every category and subcategory in the signed-in user's Spanish or English UI language while preserving the original stored name and never blocking category creation on a translation-provider failure.

## Data Contract

`categories` keeps `name` as the original canonical input and adds nullable `name_es` and `name_en` columns. The same record shape applies to root categories, subcategories, system defaults, and custom records. API responses expose all three values. The frontend selects the current locale field and falls back to `name` when a translation is absent.

## Population

A SQL migration adds the columns and fills system default names deterministically in Spanish and English. It does not call external services.

An idempotent backend backfill command selects categories missing either localized value, sends each name, parent name, and root-or-child role to the existing OpenRouter provider with a constrained JSON schema, validates the two strings, and persists successful results. It is safe to run repeatedly; completed rows are skipped. Existing custom names such as `Dance` and `Investments` are therefore translated as custom data, not promoted into the default catalog.

## New Categories

The create-category and create-subcategory flows save the original category first. They then request and persist both localized names. A provider failure is logged but does not fail the create request; clients display `name` until the idempotent backfill succeeds. Translation requests are bounded to category-sized strings and use a strict `{ "es": string, "en": string }` response contract. Brands, acronyms, and deliberate proper names are preserved when translation is not appropriate.

## Translation Integrity and Privacy

Only the category name, optional parent name, and root-or-child role leave the application for translation. User identity, tenant, financial account, movement, and budget data are never sent to the provider.

Translations carry an origin of `system`, `automatic`, or `manual`. Automated backfills never overwrite a complete manual translation. Later manual editing may use the same fields without changing `name`.

The messaging interpreter treats `name`, `name_es`, and `name_en` as matching aliases but resolves the result to the immutable category id. This allows messages in either language without making translated text the category identity.

## Dashboard Recent Expenses

The dashboard's recent-expenses request uses the selected monthly or annual date range and a five-row limit. This prevents installments from future periods appearing in the selected month while retaining the existing upcoming-installments report as the dedicated future view.

## Deployment

The database migration runs through the normal migration runner. The deployment workflow runs the category-translation backfill after migrations and bootstrap in bounded batches with limited concurrency. It reports translated, skipped, and failed counts. Failures leave missing values eligible for a later retry; they must not leave the API unavailable.

## Acceptance Criteria

- A September dashboard shows at most five expense projections whose due dates are in September.
- Existing and newly created custom categories render in Spanish and English after translation is available.
- System categories render from persisted localized fields.
- Category creation succeeds when OpenRouter is unavailable, displaying the original name until backfilled.
- Re-running the backfill does not overwrite complete translations or create duplicate records.
- Telegram resolves a translated alias to the original category id.
- Translation requests do not include tenant, user, account, movement, or budget data.
