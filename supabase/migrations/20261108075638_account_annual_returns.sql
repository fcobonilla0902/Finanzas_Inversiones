begin;
alter table public.accounts
  add column annual_return_rate numeric(7,4),
  add constraint accounts_annual_return_rate_range
    check (annual_return_rate is null or (annual_return_rate >= 0 and annual_return_rate <= 100)),
  add constraint accounts_investment_return_only
    check (type = 'investment' or annual_return_rate is null);
comment on column public.accounts.annual_return_rate is
  'Optional estimated simple annual return percentage. Used for projections, never automatic booked income.';
commit;
