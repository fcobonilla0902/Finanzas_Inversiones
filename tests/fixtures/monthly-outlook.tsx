import { createRoot } from "react-dom/client";
import { useState } from "react";
import { BrowserRouter } from "react-router-dom";
import { MonthlyOutlook } from "../../src/components/monthly-outlook";
import type { Account, Transaction } from "../../src/lib/finance";
import "@fontsource-variable/manrope";
import "../../src/design.css";

const accounts: Account[] = [
  {
    id: "bank",
    name: "Banco",
    type: "bank",
    initial_balance: "20000",
    archived: false,
  },
  {
    id: "investment",
    name: "Inversión",
    type: "investment",
    initial_balance: "10000",
    archived: false,
  },
  {
    id: "card",
    name: "Tarjeta principal",
    type: "credit",
    initial_balance: "0",
    archived: false,
    statement_day: 15,
    payment_day: 5,
  },
];
const initialTransactions: Transaction[] = [
  {
    id: "purchase",
    account_id: "card",
    kind: "expense",
    amount: "6000",
    date: "2026-10-10",
    installment_months: 6,
    description: "Compra a meses",
    destination_id: null,
    category_id: null,
  },
  {
    id: "cash",
    account_id: "bank",
    kind: "expense",
    amount: "2000",
    date: "2026-11-01",
    description: "Gasto de débito",
    destination_id: null,
    category_id: null,
  },
];
document.documentElement.dataset.theme = matchMedia(
  "(prefers-color-scheme: dark)",
).matches
  ? "dark"
  : "light";
function Harness() {
  const [transactions, setTransactions] = useState(initialTransactions);
  return (
    <BrowserRouter>
      <main style={{ maxWidth: 600, margin: "24px auto", padding: 16 }}>
        <MonthlyOutlook
          accounts={accounts}
          transactions={transactions}
          ready
          asOf="2026-11-08"
        />
        <button
          onClick={() =>
            setTransactions((rows) => [
              ...rows,
              {
                id: "paid",
                kind: "transfer",
                amount: "1000",
                date: "2026-11-05",
                description: "Pago de prueba",
                account_id: "bank",
                destination_id: "card",
                category_id: null,
                credit_payment_month: "2026-11-01",
                credit_payment_allocations: [
                  { transaction_id: "purchase", amount_cents: 100000 },
                ],
              },
            ])
          }
        >
          Registrar pago de prueba
        </button>
      </main>
    </BrowserRouter>
  );
}
createRoot(document.getElementById("root")!).render(<Harness />);
