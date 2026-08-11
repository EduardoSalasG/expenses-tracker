alter table financial_account_invitations
  add column if not exists role text not null default 'member';

alter table financial_account_invitations
  drop constraint if exists financial_account_invitations_role_check;

alter table financial_account_invitations
  add constraint financial_account_invitations_role_check
  check (role in ('owner', 'admin', 'member'));
