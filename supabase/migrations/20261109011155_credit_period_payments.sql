begin;

alter table public.transactions
  add column credit_payment_month date,
  add column credit_payment_allocations jsonb,
  add constraint credit_payment_receipt check (
    (credit_payment_month is null and credit_payment_allocations is null) or
    (kind = 'transfer' and credit_payment_month = date_trunc('month', credit_payment_month)::date
      and credit_payment_allocations is not null and jsonb_typeof(credit_payment_allocations) = 'array')
  );
create unique index credit_payment_once_per_period on public.transactions(user_id, destination_id, credit_payment_month)
  where credit_payment_month is not null;

create function public.credit_calendar_day(p_month date, p_day integer)
returns date language sql immutable set search_path = '' as $$
  select make_date(extract(year from p_month)::integer, extract(month from p_month)::integer,
    least(p_day, extract(day from date_trunc('month', p_month) + interval '1 month - 1 day')::integer));
$$;

create function public.credit_purchase_schedule(p_card uuid, p_as_of date)
returns table(purchase_id uuid, installment_index integer, due_date date, remaining_cents bigint)
language sql stable security invoker set search_path = '' as $$
  with card as (
    select * from public.accounts where id = p_card and user_id = (select auth.uid()) and type = 'credit'
  ), recorded as (
    select t.* from public.transactions t where t.user_id = (select auth.uid()) and t.date <= p_as_of
  ), allocations as (
    select (a->>'transaction_id')::uuid as id, sum((a->>'amount_cents')::bigint)::bigint as paid
    from recorded t cross join lateral jsonb_array_elements(coalesce(t.credit_payment_allocations, '[]'::jsonb)) a
    where t.kind = 'transfer' and t.destination_id = p_card and t.credit_payment_month is not null
    group by (a->>'transaction_id')::uuid
  ), purchases as (
    select t.*, (t.amount * 100)::bigint as principal,
      case when t.kind = 'expense' then coalesce(t.installment_months, 1) else 1 end as months,
      coalesce(a.paid, 0) as allocated,
      (date_trunc('month', t.date)::date + make_interval(months =>
        case when t.date > public.credit_calendar_day(t.date, c.statement_day) then 1 else 0 end +
        case when c.payment_day <= c.statement_day then 1 else 0 end))::date as first_month,
      c.payment_day
    from recorded t join card c on c.id = t.account_id left join allocations a on a.id = t.id
    where t.kind in ('expense', 'transfer')
  ), plans as (
    select p.*, principal / months as regular, principal % months as extra,
      principal / months * installments_paid + least(installments_paid, principal % months) as manual_paid
    from purchases p
  ), credits as (
    select greatest(0,
      greatest(0, (c.initial_balance * 100)::bigint) +
      coalesce((select sum((t.amount * 100)::bigint) from recorded t where t.account_id = c.id and t.kind = 'income'), 0) +
      greatest(0,
        coalesce((select sum((t.amount * 100)::bigint) from recorded t where t.destination_id = c.id and t.credit_payment_month is null), 0) -
        coalesce((select sum(manual_paid) from plans), 0)) -
      greatest(0, -(c.initial_balance * 100)::bigint))::bigint as amount
    from card c
  ), installments as (
    select p.id, p.date, n.i,
      public.credit_calendar_day((first_month + make_interval(months => n.i))::date, payment_day) as due,
      greatest(0, regular + case when n.i < extra then 1 else 0 end -
        greatest(0, manual_paid + allocated - (regular * n.i + least(n.i, extra))))::bigint as remaining
    from plans p cross join lateral generate_series(0, months - 1) n(i)
  ), ordered as (
    select s.*, coalesce(sum(remaining) over(order by due, date, id, i rows between unbounded preceding and 1 preceding), 0) as previous
    from installments s
  )
  select s.id, s.i, s.due,
    greatest(0, s.remaining - greatest(0, c.amount - s.previous))::bigint
  from ordered s cross join credits c;
$$;

create function public.record_credit_period_payment(
  p_card uuid, p_source uuid, p_month date, p_paid_on date, p_expected_amount numeric
) returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  card public.accounts;
  source public.accounts;
  existing_id uuid;
  payment_id uuid;
  deadline date;
  closing date;
  total_cents bigint;
  allocations jsonb;
  source_balance numeric;
begin
  if owner_id is null then raise exception 'Inicia sesión para registrar el pago.'; end if;
  if p_month is null or p_month <> date_trunc('month', p_month)::date then raise exception 'Selecciona un mes válido.'; end if;
  perform 1 from public.accounts where user_id = owner_id and id in (p_card, p_source) order by id for update;
  select * into card from public.accounts where id = p_card and user_id = owner_id and type = 'credit' and not archived;
  select * into source from public.accounts where id = p_source and user_id = owner_id and type <> 'credit' and not archived;
  if card.id is null or source.id is null then raise exception 'Selecciona una tarjeta y una cuenta de pago activas de tu espacio.'; end if;
  if card.statement_day is null or card.payment_day is null then raise exception 'Configura el corte y último día de pago de la tarjeta.'; end if;
  select id into existing_id from public.transactions where user_id = owner_id and destination_id = p_card and credit_payment_month = p_month;
  if existing_id is not null then return existing_id; end if;
  deadline := public.credit_calendar_day(p_month, card.payment_day);
  closing := public.credit_calendar_day((p_month - make_interval(months => case when card.payment_day <= card.statement_day then 1 else 0 end))::date, card.statement_day);
  if p_paid_on is null or p_paid_on < closing or p_paid_on > deadline or p_paid_on > (now() at time zone 'America/Mexico_City')::date then
    raise exception 'La fecha debe estar entre el corte y el último día de pago, sin ser futura.';
  end if;
  if exists (select 1 from public.credit_purchase_schedule(p_card, p_paid_on) s where s.remaining_cents > 0 and s.due_date is null) then
    raise exception 'Faltan fechas para calcular el pago.';
  end if;
  if card.initial_balance < 0 and
    -card.initial_balance > coalesce((select sum(t.amount) from public.transactions t where t.user_id = owner_id and t.date <= p_paid_on and (t.destination_id = p_card or (t.account_id = p_card and t.kind = 'income'))), 0) then
    raise exception 'El saldo inicial pendiente no tiene vencimiento. Reconcilia ese saldo antes de pagar el periodo.';
  end if;
  select coalesce(sum(s.remaining_cents), 0)::bigint,
    coalesce(jsonb_agg(jsonb_build_object('transaction_id', s.id, 'amount_cents', s.remaining_cents)), '[]'::jsonb)
  into total_cents, allocations
  from (select purchase_id as id, sum(remaining_cents)::bigint as remaining_cents
    from public.credit_purchase_schedule(p_card, p_paid_on)
    where remaining_cents > 0 and due_date < p_month + interval '1 month'
    group by purchase_id) s;
  if total_cents <= 0 then raise exception 'Este periodo ya está cubierto.'; end if;
  if p_expected_amount is null or p_expected_amount * 100 <> total_cents then
    raise exception 'El importe cambió. Actualiza tus datos y revisa el pago antes de guardarlo.';
  end if;
  select source.initial_balance + coalesce(sum(
    case when t.account_id = p_source then case when t.kind = 'income' then t.amount else -t.amount end else 0 end +
    case when t.destination_id = p_source then t.amount else 0 end), 0)
  into source_balance from public.transactions t where t.user_id = owner_id and t.date <= p_paid_on and (t.account_id = p_source or t.destination_id = p_source);
  if source_balance * 100 < total_cents then raise exception 'La cuenta seleccionada no tiene saldo suficiente en esa fecha.'; end if;
  perform set_config('app.credit_payment_rpc', '1', true);
  insert into public.transactions(user_id, kind, amount, date, description, account_id, destination_id, credit_payment_month, credit_payment_allocations)
  values (owner_id, 'transfer', total_cents::numeric / 100, p_paid_on,
    'Pago a tiempo · ' || to_char(p_month, 'YYYY-MM') || ' · ' || card.name, p_source, p_card, p_month, allocations)
  returning id into payment_id;
  return payment_id;
end;
$$;

create function public.protect_credit_payment_receipts() returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    if new.credit_payment_month is not null and coalesce(current_setting('app.credit_payment_rpc', true), '') <> '1' then
      raise exception 'Registra este pago desde Pagué a tiempo mi tarjeta de crédito.';
    end if;
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
create trigger credit_payment_receipts before insert or update or delete on public.transactions
for each row execute function public.protect_credit_payment_receipts();
revoke all on function public.credit_calendar_day(date,integer), public.credit_purchase_schedule(uuid,date), public.record_credit_period_payment(uuid,uuid,date,date,numeric) from public, anon;
grant execute on function public.credit_calendar_day(date,integer), public.credit_purchase_schedule(uuid,date), public.record_credit_period_payment(uuid,uuid,date,date,numeric) to authenticated;
revoke all on function public.protect_credit_payment_receipts() from public, anon, authenticated;

commit;
