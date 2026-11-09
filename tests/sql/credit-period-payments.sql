-- Synthetic fixtures only; every change is rolled back.
begin;
do $$
declare u uuid; c uuid := gen_random_uuid(); b uuid := gen_random_uuid(); cat uuid := gen_random_uuid();
begin
  select id into u from public.profiles limit 1;
  if u is null then raise exception 'A test owner is required.'; end if;
  insert into public.accounts(id,user_id,name,type,initial_balance,statement_day,payment_day)
  values(c,u,'QA credit period','credit',0,18,28),(b,u,'QA payment source','bank',1000,null,null);
  insert into public.categories(id,user_id,name,kind) values(cat,u,'QA payment ' || cat::text,'expense');
  insert into public.transactions(user_id,kind,amount,date,description,account_id,category_id,installment_months,installments_paid)
  values(u,'expense',300,'2026-08-20','QA installment',c,cat,3,0),
    (u,'expense',300,'2026-06-20','QA historical installments',c,cat,3,2),
    (u,'expense',50,'2026-09-10','QA outright',c,cat,null,0);
  perform set_config('app.payment_test',jsonb_build_object('owner',u,'card',c,'source',b)::text,true);
end; $$;
set local role authenticated;
select set_config('request.jwt.claim.sub',current_setting('app.payment_test')::jsonb->>'owner',true);
do $$
declare
  fixture jsonb := current_setting('app.payment_test')::jsonb;
  c uuid := (fixture->>'card')::uuid; b uuid := (fixture->>'source')::uuid;
  u uuid := (fixture->>'owner')::uuid; first_id uuid; second_id uuid; duplicate_id uuid;
  amount bigint; rejected boolean;
begin
  select sum(remaining_cents) into amount from public.credit_purchase_schedule(c,'2026-09-28') where due_date <= '2026-09-30';
  if amount <> 25000 then raise exception 'Schedule expected 25000, received %',amount; end if;
  rejected := false;
  begin perform public.record_credit_period_payment(c,b,'2026-09-01','2026-09-29',250); exception when others then rejected := true; end;
  if not rejected then raise exception 'Late payment accepted.'; end if;
  rejected := false;
  begin perform public.record_credit_period_payment(c,b,'2026-09-01','2026-09-28',251); exception when others then rejected := true; end;
  if not rejected then raise exception 'Stale amount accepted.'; end if;
  first_id := public.record_credit_period_payment(c,b,'2026-09-01','2026-09-28',250);
  duplicate_id := public.record_credit_period_payment(c,b,'2026-09-01','2026-09-28',250);
  if first_id <> duplicate_id or (select count(*) from public.transactions where destination_id=c) <> 1 then raise exception 'Duplicate payment created.'; end if;
  select coalesce(sum(remaining_cents),0) into amount from public.credit_purchase_schedule(c,'2026-09-28') where due_date <= '2026-09-30';
  if amount <> 0 then raise exception 'Paid period still pending: %',amount; end if;
  if (select sum((a->>'amount_cents')::bigint) from public.transactions p cross join lateral jsonb_array_elements(p.credit_payment_allocations) a where p.id=first_id) <> 25000 then raise exception 'Allocation sum differs.'; end if;
  rejected := false;
  begin update public.transactions set amount=1 where account_id=c and description='QA installment'; exception when others then rejected := true; end;
  if not rejected then raise exception 'Linked purchase edited without reversing payment.'; end if;
  rejected := false;
  begin
    insert into public.transactions(user_id,kind,amount,date,description,account_id,destination_id,credit_payment_month,credit_payment_allocations)
    values(u,'transfer',1,'2026-10-28','QA forged receipt',b,c,'2026-10-01','[]');
  exception when others then rejected := true; end;
  if not rejected then raise exception 'Forged receipt accepted.'; end if;
  rejected := false;
  begin
    insert into public.transactions(user_id,kind,amount,date,description,account_id,destination_id,credit_payment_allocations)
    values(u,'transfer',1,'2026-10-28','QA unpaired receipt',b,c,'[]');
  exception when others then rejected := true; end;
  if not rejected then raise exception 'Unpaired receipt accepted.'; end if;
  second_id := public.record_credit_period_payment(c,b,'2026-10-01','2026-10-28',100);
  select coalesce(sum(remaining_cents),0) into amount from public.credit_purchase_schedule(c,'2026-10-28') where due_date <= '2026-10-31';
  if amount <> 0 then raise exception 'Second period not covered.'; end if;
  if 1000 - (select sum(t.amount) from public.transactions t where t.account_id=b) <> 650 then raise exception 'Source balance wrong.'; end if;
  if (select installments_paid from public.transactions where account_id=c and description='QA historical installments') <> 2 then raise exception 'Historical baseline changed.'; end if;
  delete from public.transactions where id=second_id;
  delete from public.transactions where id=first_id;
  select sum(remaining_cents) into amount from public.credit_purchase_schedule(c,'2026-09-28') where due_date <= '2026-09-30';
  if amount <> 25000 then raise exception 'Undo did not restore debt.'; end if;
  perform set_config('request.jwt.claim.sub',gen_random_uuid()::text,true);
  if exists(select 1 from public.accounts where id=c) then raise exception 'RLS exposed another owner account.'; end if;
  rejected := false;
  begin perform public.record_credit_period_payment(c,b,'2026-09-01','2026-09-28',250); exception when others then rejected := true; end;
  if not rejected then raise exception 'Another owner paid this card.'; end if;
end; $$;
rollback;
select 'All payment, allocation, idempotency, reversal and RLS assertions passed; fixtures rolled back.' as result;
