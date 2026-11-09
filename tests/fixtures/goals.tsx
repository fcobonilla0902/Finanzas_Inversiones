// Fixture sintético, sin Supabase ni persistencia.
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Goals } from "../../src/features/goals";
import { Button } from "../../src/components/ui/button";
import {
  CreditDebtSummary,
  GoalsPreview,
} from "../../src/components/savings-summary";
import type {
  SavingsGoal,
  SavingsPlan,
  Transaction,
} from "../../src/lib/finance";
import "@fontsource-variable/manrope";
import "../../src/design.css";
const date = new Date().toLocaleDateString("en-CA");
const accounts = [
  {
    id: "bank",
    name: "Banco de prueba",
    type: "bank",
    initial_balance: "0.00",
    archived: false,
  },
  {
    id: "credit",
    name: "Tarjeta de prueba",
    type: "credit",
    initial_balance: "-5000.00",
    archived: false,
  },
  {
    id: "positive",
    name: "Tarjeta con saldo a favor",
    type: "credit",
    initial_balance: "2000.00",
    archived: false,
  },
  {
    id: "archived",
    name: "Tarjeta archivada",
    type: "credit",
    initial_balance: "-500.00",
    archived: true,
  },
];
const initialTransactions: Transaction[] = [
  {
    id: "income",
    account_id: "bank",
    destination_id: null,
    category_id: null,
    kind: "income",
    amount: "30000.00",
    description: "Ingreso de prueba",
    date,
  },
  {
    id: "expense",
    account_id: "bank",
    destination_id: null,
    category_id: null,
    kind: "expense",
    amount: "20000.00",
    description: "Gasto de prueba",
    date,
  },
  {
    id: "payment",
    account_id: "bank",
    destination_id: "credit",
    category_id: null,
    kind: "transfer",
    amount: "1000.00",
    description: "Pago de prueba",
    date,
  },
];
function Harness() {
  const [transactions, setTransactions] = useState(initialTransactions);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [plan, setPlan] = useState<SavingsPlan>();
  return (
    <main>
      <h1>Metas y deuda · QA</h1>
      <p className="muted">Datos sintéticos. Sin conexión ni persistencia.</p>
      <Button
        onClick={() =>
          setTransactions((rows) => [
            ...rows,
            {
              ...initialTransactions[0],
              id: crypto.randomUUID(),
              amount: "11000.00",
            },
          ])
        }
      >
        Registrar ingreso de prueba
      </Button>
      <Button
        onClick={() =>
          setTransactions((rows) => [
            ...rows,
            {
              ...initialTransactions[1],
              id: crypto.randomUUID(),
              amount: "2000.00",
            },
          ])
        }
      >
        Registrar gasto de prueba
      </Button>
      <Button
        onClick={() =>
          setTransactions((rows) => [
            ...rows,
            {
              ...initialTransactions[2],
              id: crypto.randomUUID(),
              amount: "1000.00",
            },
          ])
        }
      >
        Registrar pago de tarjeta de prueba
      </Button>
      <div className="planning-grid">
        <CreditDebtSummary
          accounts={accounts}
          transactions={transactions}
          ready
        />
        <GoalsPreview
          accounts={accounts}
          goals={goals}
          plan={plan}
          transactions={transactions}
        />
      </div>
      <Goals
        accounts={accounts}
        goals={goals}
        plan={plan}
        transactions={transactions}
        enabled
        write={async (table, data, id) => {
          if (table === "savings_plans")
            setPlan({ id: "qa-plan", ...data } as SavingsPlan);
          if (table === "savings_goals")
            setGoals((previous) =>
              id
                ? previous.map((goal) =>
                    goal.id === id
                      ? ({ ...goal, ...data } as SavingsGoal)
                      : goal,
                  )
                : [
                    ...previous,
                    {
                      id: `qa-goal-${previous.length + 1}`,
                      archived: false,
                      ...data,
                    } as SavingsGoal,
                  ],
            );
        }}
      />
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
