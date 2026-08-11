alter table monthly_budgets
  drop constraint if exists monthly_budgets_tenant_budget_month_category_id_subcategory_key_key;

alter table monthly_budgets
  add constraint monthly_budgets_tenant_financial_account_budget_month_category_subcategory_key_key
  unique (tenant_id, financial_account_id, budget_month, category_id, subcategory_key);
