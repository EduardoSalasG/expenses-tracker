# AI finance-message interpretation design

## Status

Approved for implementation planning on 2026-10-09.

## Objective

Make conversational expense capture reliably resolve categories, allow a
single expense message to target an accessible financial account, and improve
category selection over time without silently assigning uncertain categories.

## Scope

The change applies to WhatsApp and Telegram inbound finance messages. It
preserves the existing deterministic interpreter as a resilient fallback and
the existing installment schedule behavior.

### Message semantics

- A message may name a financial account for that operation, for example
  `25.000 supermercado, debito, 3 cuotas, cuenta Hogar`.
- A per-message account overrides the current messaging context only for that
  operation. It does not change the persistent Telegram account context.
- The named account must be accessible to the sender. An unknown or
  inaccessible account must produce a corrective reply and no write.
- A category or subcategory stated explicitly in the message takes precedence
  over learned preferences and model inference.
- Existing installment forms (`3 cuotas` and `3x`) remain supported. If the
  first installment date is absent, use the expense date.

## Interpretation contract and resolution pipeline

The interpreted-message contract will support an account name for expense and
income creation, in addition to its existing category, payment method and
installment fields. The model prompt continues to receive only the account,
category, bank and payment-method options relevant to the sender's context.

Before persistence, the application resolves fields in this order:

1. Validate and resolve the account named in the message, or use the current
   channel account context.
2. Use a category or subcategory explicitly stated by the sender.
3. Apply a learned preference for the resolved financial account.
4. Use the validated model result and deterministic inference.
5. If the category remains ambiguous or low-confidence, retain a draft,
   offer clarification, and do not save the movement.

Account resolution and all category lookup must occur after deciding the
effective account so that account-scoped category catalogs are never mixed.

## Account-scoped learning

Learned category preferences are shared by members of the same financial
account and isolated from every other account. No preference is scoped merely
to a person, tenant, or messaging channel.

Each preference records its account, normalized purchase signal, category and
optional subcategory, source, confidence and audit timestamps. Sources are:

- `explicit_correction`: created or updated immediately when a user corrects
  the category or subcategory.
- `historical_consensus`: created only after three confirmed saved movements
  with a consistent normalized signal and category selection in that account.

Explicit corrections outrank consensus preferences. A conflicting or weak
preference must not cause an automatic assignment; the user receives the
existing category clarification flow instead.

The initial historical evaluation and subsequent consensus calculation operate
inside the product data boundary. Raw historical messages or transactions are
not added to requests to the AI provider; the provider receives only the
minimum current interpretation context and an already-consolidated preference
when needed.

## Conversation behavior

Successful replies identify the effective account, category/subcategory and,
when applicable, the installment count, per-installment amount and first
charge date. This gives the sender a clear result to correct.

For unresolved categories, the system asks a question and keeps the draft;
it never defaults to `Other`. For unavailable accounts, it lists the sender's
accessible account names and leaves both the current context and persisted
financial data unchanged.

## Data and migration

Add a durable account-scoped preference store plus repository port and
PostgreSQL/in-memory implementations. The schema must support uniqueness for
the account plus normalized signal, category references, optional subcategory,
source, evidence count and audit timestamps. A migration/backfill or a
bounded on-demand aggregation must seed consensus only where three matching
historical movements satisfy the rule; it must be idempotent.

## Verification

Tests must cover:

- inline account capture for WhatsApp and Telegram, including no persistent
  context change;
- rejected inaccessible or unknown accounts without a financial write;
- category precedence, ambiguity and retained clarification drafts;
- immediate learning from an explicit correction;
- preference creation after exactly three consistent confirmed movements;
- account isolation and sharing by members of a shared account;
- installments with and without an explicit first-charge date;
- fallback behavior when the AI provider is unavailable or emits invalid data.

Update the message-interpretation diagram and relevant user-facing messaging
documentation for the new message syntax and confirmation behavior.
