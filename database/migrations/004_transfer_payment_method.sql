alter table expenses
  drop constraint if exists expenses_card_details_check,
  drop constraint if exists expenses_payment_method_kind_check,
  drop constraint if exists expenses_payment_method_details_check;

alter table expenses
  add constraint expenses_payment_method_kind_check
  check (payment_method_kind in ('cash', 'card', 'transfer')),
  add constraint expenses_payment_method_details_check
  check (payment_method_kind = 'card' or card_type is null);
