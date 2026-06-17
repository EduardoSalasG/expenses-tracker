select upsert_user_by_phone('+56912345678', 'Demo', 'User', 'Demo', 'demo@example.com', 'Chile', 'CLP');

select upsert_user_by_phone('+56900000000', 'Admin', 'User', 'Admin', 'admin@example.com', 'Chile', 'CLP');

update users
set role = 'admin',
    report_preferences = array['daily', 'weekly', 'monthly', 'yearly']::text[],
    updated_at = now()
where phone_number = '+56900000000';

select seed_default_categories(tenant_id)
from users
where phone_number in ('+56912345678', '+56900000000');
