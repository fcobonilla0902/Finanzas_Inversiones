begin;
alter table public.transactions drop constraint credit_payment_receipt;
alter table public.transactions add constraint credit_payment_receipt check (
  (credit_payment_month is null and credit_payment_allocations is null) or
  (credit_payment_month is not null and kind = 'transfer'
    and credit_payment_month = date_trunc('month', credit_payment_month)::date
    and credit_payment_allocations is not null and jsonb_typeof(credit_payment_allocations) = 'array')
);
commit;
