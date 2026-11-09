// npm install --prefix artifacts/sql-check --no-save --package-lock=false @electric-sql/pglite
// node tests/sql/check-investment-returns.mjs
import { readFile } from "node:fs/promises";
import { PGlite } from "../../artifacts/sql-check/node_modules/@electric-sql/pglite/dist/index.js";
const db = new PGlite();
try {
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;`);
  for (const name of [
    "20261108073234_foundation.sql",
    "20261108075638_account_annual_returns.sql",
  ]) {
    await db.exec(
      await readFile(
        new URL(`../../supabase/migrations/${name}`, import.meta.url),
        "utf8",
      ),
    );
  }
  await db.exec(
    "insert into auth.users(id) values(gen_random_uuid()),(gen_random_uuid());",
  );
  const migration = await readFile(
    new URL(
      "../../supabase/migrations/20261110010000_daily_investment_returns.sql",
      import.meta.url,
    ),
    "utf8",
  );
  // pg_cron is hosted infrastructure; run and test the identical accounting functions here.
  await db.exec(migration.split("create extension if not exists pg_cron;")[0]);
  await db.exec(
    await readFile(
      new URL("./daily-investment-returns.sql", import.meta.url),
      "utf8",
    ),
  );
  const owners = (await db.query("select id from public.profiles order by id"))
    .rows;
  await db.exec("begin;");
  const own = (
    await db.query(
      "insert into public.accounts(user_id,name,type,initial_balance,annual_return_rate) values($1,'QA own','investment',10000,10) returning id",
      [owners[0].id],
    )
  ).rows[0].id;
  const other = (
    await db.query(
      "insert into public.accounts(user_id,name,type,initial_balance,annual_return_rate) values($1,'QA other','investment',10000,10) returning id",
      [owners[1].id],
    )
  ).rows[0].id;
  await db.exec(
    "update public.investment_accrual_state set last_accrued_on=(now() at time zone 'America/Mexico_City')::date-2;",
  );
  await db.exec("set local role authenticated;");
  await db.query("select set_config('request.jwt.claim.sub',$1,true)", [
    owners[0].id,
  ]);
  const synced = (
    await db.query("select public.sync_investment_returns() as count")
  ).rows[0].count;
  if (synced !== 1) throw Error("Owner sync did not accrue exactly once.");
  await db.exec("reset role;");
  const otherCount = (
    await db.query(
      "select count(*)::integer as count from public.transactions where account_id=$1",
      [other],
    )
  ).rows[0].count;
  if (otherCount !== 0)
    throw Error("Owner sync accrued another user's account.");
  const ownCount = (
    await db.query(
      "select count(*)::integer as count from public.transactions where account_id=$1",
      [own],
    )
  ).rows[0].count;
  if (ownCount !== 1) throw Error("Owner income is missing.");
  await db.exec("rollback;");
  const { rows } = await db.query(
    "select count(*)::integer as count from public.accounts;",
  );
  if (rows[0].count !== 0)
    throw Error("Synthetic fixtures were not rolled back.");
  console.log(
    "SQL passed: midnight, duplicates, deposits, reinvestment, future dates, withdrawals, catch-up, rounding, rate changes, archive and permissions. Fixtures rolled back.",
  );
} catch (error) {
  console.error(error.message, error.detail ?? "", error.where ?? "");
  process.exitCode = 1;
} finally {
  await db.close();
}
