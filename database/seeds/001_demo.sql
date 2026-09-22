select upsert_user_by_phone('+56912345678'::text, 'Demo'::text, 'User'::text, 'Demo'::text, 'demo@example.com'::text, 'Chile'::text, 'CLP'::char(3), 'es'::text);

select upsert_user_by_phone('+56900000000'::text, 'Admin'::text, 'User'::text, 'Admin'::text, 'admin@example.com'::text, 'Chile'::text, 'CLP'::char(3), 'es'::text);

update users
set role = 'admin',
    report_preferences = array['daily', 'weekly', 'monthly', 'yearly']::text[],
    updated_at = now()
where phone_number = '+56900000000';

select seed_default_categories(tenant_id)
from users
where phone_number in ('+56912345678', '+56900000000');

with demo as (
  select id, tenant_id from users where phone_number = '+56912345678'
), account as (
  select ensure_personal_financial_account(id) as id from demo
), food as (
  select id from categories where name = 'Food' and parent_id is null limit 1
), groceries as (
  select id from categories where name = 'Groceries' and parent_id = (select id from food) limit 1
)
insert into expenses (id, tenant_id, user_id, financial_account_id, created_by_user_id, paid_by_user_id, expense_date, purchase_date, first_installment_date, installment_count, amount, currency, concept, category_id, subcategory_id, payment_method_kind, bank, card_type)
select '11111111-1111-4111-8111-111111111111', demo.tenant_id, demo.id, account.id, demo.id, demo.id, '2026-09-12T12:00:00Z', '2026-09-12T12:00:00Z', '2026-09-12T12:00:00Z', 1, 32500, 'CLP', 'Supermercado demo', food.id, groceries.id, 'card', 'Banco de Chile', 'debit'
from demo, account, food, groceries
on conflict (id) do nothing;

insert into expense_installments (expense_id, installment_number, installment_count, due_date, amount)
values ('11111111-1111-4111-8111-111111111111', 1, 1, '2026-09-12T12:00:00Z', 32500)
on conflict (expense_id, installment_number) do nothing;

with demo as (select id, tenant_id from users where phone_number = '+56912345678'), account as (select ensure_personal_financial_account(id) as id from demo)
insert into incomes (id, tenant_id, user_id, financial_account_id, income_date, amount, currency, concept)
select '22222222-2222-4222-8222-222222222222', demo.tenant_id, demo.id, account.id, '2026-09-01T12:00:00Z', 1200000, 'CLP', 'Sueldo demo' from demo, account
on conflict (id) do nothing;
