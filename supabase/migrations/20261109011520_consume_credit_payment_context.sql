begin;
create or replace function public.protect_credit_payment_receipts() returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if new.credit_payment_month is not null and coalesce(current_setting('app.credit_payment_rpc', true), '') <> '1' then
      raise exception 'Registra este pago desde Pagué a tiempo mi tarjeta de crédito.';
    end if;
    perform set_config('app.credit_payment_rpc', '', true);
    return new;
  end if;
  if old.credit_payment_month is not null and tg_op = 'UPDATE' then
    raise exception 'Para corregir este pago, elimínalo y regístralo de nuevo.';
  end if;
  if tg_op = 'DELETE' or (new.amount, new.date, new.account_id, new.installment_months, new.installments_paid, new.kind) is distinct from (old.amount, old.date, old.account_id, old.installment_months, old.installments_paid, old.kind) then
    if exists (select 1 from public.transactions p cross join lateral jsonb_array_elements(coalesce(p.credit_payment_allocations, '[]'::jsonb)) a where p.user_id = old.user_id and a->>'transaction_id' = old.id::text) then
      raise exception 'Elimina primero el pago vinculado antes de cambiar el importe, fecha, cuenta o plazo de esta compra.';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; end if;
  if new.credit_payment_month is not null then raise exception 'Los pagos se registran desde el botón de pago de tarjeta.'; end if;
  return new;
end;
$$;
commit;

