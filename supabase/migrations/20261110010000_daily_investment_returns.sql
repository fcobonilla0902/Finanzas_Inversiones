-- Accrue completed Mexico City days only, starting on the day this is enabled.
comment on column public.accounts.annual_return_rate is
  'Estimated annual rate for daily reinvested income at midnight America/Mexico_City, using a 365-day year.';
create table public.investment_accrual_state (
  account_id uuid primary key references public.accounts(id) on delete cascade,
  last_accrued_on date not null,
  fractional_amount numeric not null default 0
);
alter table public.investment_accrual_state enable row level security;
revoke all on public.investment_accrual_state from public, anon, authenticated;
insert into public.investment_accrual_state(account_id,last_accrued_on)
select id,(now() at time zone 'America/Mexico_City')::date - 1
from public.accounts where type='investment';

create function public.accrue_investment_returns(
  p_as_of timestamptz default now(), p_account uuid default null
) returns integer language plpgsql security definer set search_path='' as $$
declare
  a record; state record; day date;
  last_day date := (p_as_of at time zone 'America/Mexico_City')::date - 1;
  principal numeric; raw_amount numeric; earned numeric; category uuid;
  written integer := 0;
begin
  for a in
    select acct.* from public.accounts acct
    join public.investment_accrual_state s on s.account_id=acct.id
    where acct.type='investment' and not acct.archived and acct.annual_return_rate>0
      and s.last_accrued_on<last_day and (p_account is null or acct.id=p_account)
    order by acct.id for update of acct
  loop
    select * into state from public.investment_accrual_state where account_id=a.id for update;
    day := state.last_accrued_on + 1;
    while day <= last_day loop
      select greatest(0, a.initial_balance + coalesce(sum(
        case when t.account_id=a.id then
          case when t.kind='income' then t.amount else -t.amount end
        else t.amount end),0)) into principal
      from public.transactions t
      where t.user_id=a.user_id and t.date<=day
        and (t.account_id=a.id or t.destination_id=a.id);
      raw_amount := principal * a.annual_return_rate / 100 / 365 + state.fractional_amount;
      earned := greatest(0,round(raw_amount,2));
      state.fractional_amount := raw_amount-earned;
      if earned>0 then
        insert into public.categories(user_id,name,kind)
        values(a.user_id,'Rendimientos de inversión','income')
        on conflict(user_id,name,kind) do update set archived=false
        returning id into category;
        insert into public.transactions(user_id,kind,amount,date,description,account_id,category_id)
        values(a.user_id,'income',earned,day+1,
          'Rendimiento diario estimado · ' || day::text,a.id,category);
        written := written+1;
      end if;
      update public.investment_accrual_state
      set last_accrued_on=day, fractional_amount=state.fractional_amount where account_id=a.id;
      day := day+1;
    end loop;
  end loop;
  return written;
end; $$;
revoke all on function public.accrue_investment_returns(timestamptz,uuid) from public,anon,authenticated;

create function public.track_investment_accrual() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if tg_op='UPDATE' then
    if (new.type,new.archived,new.annual_return_rate,new.initial_balance)
      is not distinct from (old.type,old.archived,old.annual_return_rate,old.initial_balance)
    then return new; end if;
    -- Settle completed days using the old rate and balance before changing them.
    perform public.accrue_investment_returns(now(),old.id);
  end if;
  if new.type='investment' then
    insert into public.investment_accrual_state(account_id,last_accrued_on)
    values(new.id,(now() at time zone 'America/Mexico_City')::date-1)
    on conflict(account_id) do update set last_accrued_on=excluded.last_accrued_on;
  end if;
  return new;
end; $$;
revoke all on function public.track_investment_accrual() from public,anon,authenticated;
create trigger investment_accrual_created after insert on public.accounts
for each row execute function public.track_investment_accrual();
create trigger investment_accrual_changed before update of type,archived,annual_return_rate,initial_balance on public.accounts
for each row execute function public.track_investment_accrual();

create function public.sync_investment_returns() returns integer
language plpgsql security definer set search_path='' as $$
declare a record; written integer:=0; owner_id uuid:=auth.uid();
begin
  if owner_id is null then raise exception 'Inicia sesión para actualizar tus inversiones.'; end if;
  for a in select id from public.accounts where user_id=owner_id and type='investment' order by id loop
    written:=written+public.accrue_investment_returns(now(),a.id);
  end loop;
  return written;
end; $$;
revoke all on function public.sync_investment_returns() from public,anon;
grant execute on function public.sync_investment_returns() to authenticated;

create extension if not exists pg_cron;
-- Midnight CDMX is a whole UTC hour. Hourly retries recover an interrupted run.
select cron.schedule('daily-investment-returns','0 * * * *',
  'select public.accrue_investment_returns();');
notify pgrst,'reload schema';
