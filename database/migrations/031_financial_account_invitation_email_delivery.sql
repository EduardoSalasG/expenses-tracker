alter table financial_account_invitations
  add column if not exists email_sent_at timestamptz,
  add column if not exists email_delivery_error text;
