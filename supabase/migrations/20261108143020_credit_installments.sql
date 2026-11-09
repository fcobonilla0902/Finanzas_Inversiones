begin;
alter table public.transactions
  add column installment_months integer,
  add column installments_paid integer not null default 0,
  add constraint transactions_installment_range check (
    (installment_months is null and installments_paid = 0) or
    (installment_months is not null and kind = 'expense' and installment_months between 2 and 120 and installments_paid between 0 and installment_months)
  );
create function public.validate_installment_account() returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if new.installment_months is not null and not exists (
    select 1 from public.accounts a where a.id=new.account_id and a.user_id=new.user_id and a.type='credit'
  ) then raise exception 'Las compras a meses requieren una tarjeta de crédito.'; end if;
  return new;
end; $$;
create trigger installment_account_validated before insert or update on public.transactions
for each row execute function public.validate_installment_account();
create function public.protect_installment_account_type() returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if new.type <> 'credit' and exists(select 1 from public.transactions t where t.account_id=new.id and t.user_id=new.user_id and t.installment_months is not null) then
    raise exception 'Esta cuenta tiene compras a meses. Conserva el tipo tarjeta de crédito.';
  end if;
  return new;
end; $$;
create trigger installment_account_type before update of type on public.accounts
for each row execute function public.protect_installment_account_type();
commit;
