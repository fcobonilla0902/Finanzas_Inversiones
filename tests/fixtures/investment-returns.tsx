// Datos sintéticos en memoria, sin llamadas a Supabase ni persistencia.
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Accounts } from "../../src/features/accounts";
import { InvestmentReturns } from "../../src/components/investment-returns";
import type { Account } from "../../src/lib/finance";
import "@fontsource-variable/manrope";
import "../../src/design.css";

function Harness() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [lastSaved, setLastSaved] = useState("");
  return (
    <main>
      <h1>Rendimientos · QA</h1>
      <p className="muted">Datos sintéticos. Sin conexión ni persistencia.</p>
      <InvestmentReturns accounts={accounts} transactions={[]} />
      <Accounts
        accounts={accounts}
        transactions={[]}
        categories={[]}
        enabled
        write={async (_table, data, id) => {
          setLastSaved(JSON.stringify(data));
          setAccounts((previous) =>
            id
              ? previous.map((account) =>
                  account.id === id
                    ? ({ ...account, ...data } as Account)
                    : account,
                )
              : [
                  ...previous,
                  {
                    id: `qa-${previous.length + 1}`,
                    archived: false,
                    ...data,
                  } as Account,
                ],
          );
        }}
      />
      <output className="sr-only" aria-label="Última cuenta guardada">
        {lastSaved}
      </output>
    </main>
  );
}
document.documentElement.dataset.theme = matchMedia(
  "(prefers-color-scheme: dark)",
).matches
  ? "dark"
  : "light";
createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <Harness />
  </BrowserRouter>,
);
