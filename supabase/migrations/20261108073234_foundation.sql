-- Ejecutar una sola vez en un proyecto Supabase nuevo.
begin;
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null default '',
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.accounts (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 name text not null check(length(trim(name)) between 1 and 80),
 type text not null check(type in ('cash','bank','savings','debit','credit','investment','other')),
 initial_balance numeric(15,2) not null default 0,
 currency text not null default 'MXN' check(currency='MXN'), archived boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(id,user_id)
);
create table public.categories (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 name text not null check(length(trim(name)) between 1 and 80),
 kind text not null check(kind in ('income','expense')), archived boolean not null default false,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(id,user_id,kind), unique(user_id,name,kind)
);
-- Una transferencia es un solo evento atómico con dos cuentas.
-- Un saldo acreedor se representa negativo; pagar una tarjeta transfiere saldo hacia ella.
create table public.transactions (
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 kind text not null check(kind in ('income','expense','transfer')),
 amount numeric(15,2) not null check(amount>0), date date not null,
 description text not null check(length(trim(description)) between 1 and 160),
 account_id uuid not null, destination_id uuid, category_id uuid,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 foreign key(account_id,user_id) references public.accounts(id,user_id) on delete restrict,
 foreign key(destination_id,user_id) references public.accounts(id,user_id) on delete restrict,
 foreign key(category_id,user_id,kind) references public.categories(id,user_id,kind) on delete restrict,
 check((kind='transfer' and destination_id is not null and destination_id<>account_id and category_id is null)
 or (kind in ('income','expense') and destination_id is null and category_id is not null))
);
create index transactions_user_date on public.transactions(user_id,date desc);
create index transactions_account on public.transactions(account_id,user_id);
create index transactions_destination on public.transactions(destination_id,user_id);
create index transactions_category on public.transactions(category_id,user_id,kind);
create index accounts_user on public.accounts(user_id);
create index categories_user on public.categories(user_id);

create function public.touch_updated_at() returns trigger language plpgsql set search_path='' as $$
begin new.updated_at=now(); return new; end; $$;
create trigger profiles_updated before update on public.profiles for each row execute function public.touch_updated_at();
create trigger accounts_updated before update on public.accounts for each row execute function public.touch_updated_at();
create trigger categories_updated before update on public.categories for each row execute function public.touch_updated_at();
create trigger transactions_updated before update on public.transactions for each row execute function public.touch_updated_at();

create function public.validate_transaction() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if exists(select 1 from public.accounts a where a.id in (new.account_id,new.destination_id) and a.archived) then
 raise exception 'No se pueden registrar movimientos en cuentas archivadas.'; end if;
 if exists(select 1 from public.categories c where c.id=new.category_id and c.archived) then
 raise exception 'La categoría está archivada.'; end if;
 return new;
end; $$;
create trigger transaction_validated before insert or update on public.transactions for each row execute function public.validate_transaction();

alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
create policy profiles_owner on public.profiles for all to authenticated using((select auth.uid())=id) with check((select auth.uid())=id);
create policy accounts_owner on public.accounts for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create policy categories_owner on public.categories for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
create policy transactions_owner on public.transactions for all to authenticated using((select auth.uid())=user_id) with check((select auth.uid())=user_id);
revoke all on public.profiles,public.accounts,public.categories,public.transactions from anon;
grant select,insert,update,delete on public.profiles,public.accounts,public.categories,public.transactions to authenticated;

create function public.initialize_user() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.profiles(id) values(new.id);
 insert into public.categories(user_id,name,kind)
 select new.id,n,'expense' from unnest(array['Alimentación','Transporte','Entretenimiento','Vivienda','Servicios','Salud','Educación','Compras','Suscripciones','Viajes','Otros']) n;
 insert into public.categories(user_id,name,kind)
 select new.id,n,'income' from unnest(array['Sueldo','Freelance','Negocios','Bonos','Comisiones','Intereses','Dividendos','Otros ingresos']) n;
 return new;
end; $$;
revoke all on function public.initialize_user() from public,anon,authenticated;
create trigger user_initialized after insert on auth.users for each row execute function public.initialize_user();
commit;
