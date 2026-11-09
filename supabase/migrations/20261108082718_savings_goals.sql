begin;
create table public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check(length(trim(name)) between 1 and 80),
  horizon text not null check(horizon in ('short','medium','long')),
  target_amount numeric(15,2) not null check(target_amount > 0),
  saved_amount numeric(15,2) not null default 0 check(saved_amount >= 0),
  archived boolean not null default false,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.savings_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  source text not null default 'recorded' check(source in ('recorded','budget')),
  monthly_income numeric(15,2) check(monthly_income >= 0),
  monthly_expenses numeric(15,2) check(monthly_expenses >= 0),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check(source <> 'budget' or (monthly_income is not null and monthly_expenses is not null))
);
create index savings_goals_user on public.savings_goals(user_id);
create trigger savings_goals_updated before update on public.savings_goals for each row execute function public.touch_updated_at();
create trigger savings_plans_updated before update on public.savings_plans for each row execute function public.touch_updated_at();
alter table public.savings_goals enable row level security;
alter table public.savings_plans enable row level security;
create policy savings_goals_owner on public.savings_goals for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create policy savings_plans_owner on public.savings_plans for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
revoke all on public.savings_goals,public.savings_plans from public,anon,authenticated;
grant select,insert,update,delete on public.savings_goals,public.savings_plans to authenticated;
commit;
