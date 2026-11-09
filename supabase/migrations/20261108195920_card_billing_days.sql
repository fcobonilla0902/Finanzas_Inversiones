begin;
alter table public.accounts
 add column statement_day integer,
 add column payment_day integer,
 add constraint accounts_billing_days check (
  (statement_day is null and payment_day is null) or
  (type='credit' and statement_day is not null and payment_day is not null and statement_day between 1 and 31 and payment_day between 1 and 31)
 );
commit;
