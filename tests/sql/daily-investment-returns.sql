-- Synthetic accounts only. All changes, including generated interest, roll back.
begin;
do $$
declare u uuid; a uuid:=gen_random_uuid(); b uuid:=gen_random_uuid();
  d date:=(now() at time zone 'America/Mexico_City')::date;
  count_written integer; total numeric; cat uuid;
begin
  select id into u from public.profiles limit 1;
  insert into public.accounts(id,user_id,name,type,initial_balance,annual_return_rate)
  values(a,u,'QA daily returns','investment',10000,10),
    (b,u,'QA return source','bank',100000,null);
  if public.accrue_investment_returns((d::timestamp at time zone 'America/Mexico_City')-interval '1 second',a)<>0
    then raise exception 'Interest accrued before midnight'; end if;
  count_written:=public.accrue_investment_returns((d+1)::timestamp at time zone 'America/Mexico_City',a);
  select sum(amount) into total from public.transactions where account_id=a;
  if count_written<>1 or total<>2.74 then raise exception 'First daily return: %',total; end if;
  if public.accrue_investment_returns((d+1)::timestamp at time zone 'America/Mexico_City',a)<>0
    then raise exception 'Duplicate interest'; end if;
  select id into cat from public.categories where user_id=u and name='Rendimientos de inversión' and kind='income';
  insert into public.transactions(user_id,account_id,destination_id,kind,amount,date,description)
  values(u,b,a,'transfer',5000,d+1,'QA deposit');
  insert into public.transactions(user_id,account_id,category_id,kind,amount,date,description)
  values(u,a,cat,'income',100000,d+10,'QA future income');
  perform public.accrue_investment_returns((d+2)::timestamp at time zone 'America/Mexico_City',a);
  select amount into total from public.transactions where account_id=a and date=d+2;
  if total<>4.11 then raise exception 'Deposit, reinvestment or future exclusion: %',total; end if;
  insert into public.transactions(user_id,account_id,destination_id,kind,amount,date,description)
  values(u,a,b,'transfer',17000,d+2,'QA withdrawal');
  if public.accrue_investment_returns((d+3)::timestamp at time zone 'America/Mexico_City',a)<>0
    then raise exception 'Negative balances must not earn'; end if;

  -- Recover missing days and retain fractional cents instead of losing them daily.
  insert into public.accounts(id,user_id,name,type,initial_balance,annual_return_rate)
  values(gen_random_uuid(),u,'QA fractional returns','investment',1,10)
  returning id into a;
  perform public.accrue_investment_returns((d+31)::timestamp at time zone 'America/Mexico_City',a);
  select sum(amount) into total from public.transactions where account_id=a;
  if total<>0.01 then raise exception 'Fractional cents lost: %',total; end if;
  if public.accrue_investment_returns((d+31)::timestamp at time zone 'America/Mexico_City',a)<>0
    then raise exception 'Catch-up duplicated'; end if;

  -- Past days are settled with the old rate before a rate change or archive.
  insert into public.accounts(id,user_id,name,type,initial_balance,annual_return_rate)
  values(gen_random_uuid(),u,'QA rate change','investment',10000,10)
  returning id into a;
  update public.investment_accrual_state set last_accrued_on=d-2 where account_id=a;
  update public.accounts set annual_return_rate=20 where id=a;
  select sum(amount) into total from public.transactions where account_id=a;
  if total<>2.74 then raise exception 'Old day used new rate: %',total; end if;
  perform public.accrue_investment_returns((d+1)::timestamp at time zone 'America/Mexico_City',a);
  select amount into total from public.transactions where account_id=a and date=d+1;
  if total<>5.48 then raise exception 'New day did not use new rate: %',total; end if;
  update public.accounts set archived=true where id=a;
  if public.accrue_investment_returns((d+2)::timestamp at time zone 'America/Mexico_City',a)<>0
    then raise exception 'Archived investment accrued'; end if;

  if has_function_privilege('authenticated','public.accrue_investment_returns(timestamptz,uuid)','execute')
    or has_function_privilege('anon','public.sync_investment_returns()','execute')
    or has_table_privilege('authenticated','public.investment_accrual_state','update')
    then raise exception 'Accrual permissions are too broad'; end if;
end; $$;
rollback;
