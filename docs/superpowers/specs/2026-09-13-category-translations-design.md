# Persisted Category Translations

## Goal

Show every category and subcategory in the signed-in user's Spanish or English UI language while preserving the original stored name and never blocking category creation on a translation-provider failure.

## Data Contract

`categories` keeps `name` as the original canonical input and adds nullable `name_es` and `name_en` columns. The same record shape applies to root categories, subcategories, system defaults, and custom records. API responses expose all three values. The frontend selects the current locale field and falls back to `name` when a translation is absent.

## Population

A SQL migration adds the columns and fills system default names deterministically in Spanish and English. It does not call external services.

An idempotent backend backfill command selects categories missing either localized value, sends each name to the existing OpenRouter provider with a constrained JSON schema, validates the two strings, and persists successful results. It is safe to run repeatedly; completed rows are skipped. Existing custom names such as `Dance` and `Investments` are therefore translated as custom data, not promoted into the default catalog.

## New Categories

The create-category and create-subcategory flows save the original category first. They then request and persist both localized names. A provider failure is logged but does not fail the create request; clients display `name` until the idempotent backfill succeeds. Translation requests are bounded to category-sized strings and use a strict `{ "es": string, "en": string }` response contract.

## Dashboard Recent Expenses

The dashboard's recent-expenses request uses the selected monthly or annual date range and a five-row limit. This prevents installments from future periods appearing in the selected month while retaining the existing upcoming-installments report as the dedicated future view.

## Deployment

The database migration runs through the normal migration runner. The deployment workflow runs the category-translation backfill after migrations and bootstrap. Backfill failures are reported with counts and leave missing values eligible for a later retry; they must not leave the API unavailable.

## Acceptance Criteria

- A September dashboard shows at most five expense projections whose due dates are in September.
- Existing and newly created custom categories render in Spanish and English after translation is available.
- System categories render from persisted localized fields.
- Category creation succeeds when OpenRouter is unavailable, displaying the original name until backfilled.
- Re-running the backfill does not overwrite complete translations or create duplicate records.
