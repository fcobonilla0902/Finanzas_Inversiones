import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { SpendingPeriods } from "../../src/components/spending-periods";
import type { Account, Transaction } from "../../src/lib/finance";
import "@fontsource-variable/manrope";
import "../../src/design.css";
const accounts: Account[] = [
  {
    id: "card",
    name: "Tarjeta principal",
    type: "credit",
    initial_balance: "0",
    archived: false,
    statement_day: 18,
    payment_day: 28,
  },
  {
    id: "second",
    name: "Otra tarjeta",
    type: "credit",
    initial_balance: "0",
    archived: false,
    statement_day: 18,
    payment_day: 28,
  },
  {
    id: "cash",
    name: "Efectivo",
    type: "cash",
    initial_balance: "500",
    archived: false,
  },
];
const categories = [
  { id: "food", name: "Comida", kind: "expense" as const, archived: false },
  { id: "travel", name: "Viajes", kind: "expense" as const, archived: false },
];
const purchase = (
  id: string,
  account_id: string,
  amount: string,
  date: string,
  category_id: string | null,
  installment_months?: number,
  installments_paid = 0,
): Transaction => ({
  id,
  kind: "expense",
  account_id,
  amount,
  date,
  category_id,
  installment_months,
  installments_paid,
  destination_id: null,
  description: id,
});
const transactions = [
  purchase("old", "card", "300", "2026-10-01", "food", 3, 1),
  purchase("new", "card", "600", "2026-11-01", "travel", 3),
  purchase("outright", "card", "60", "2026-11-08", "food"),
  purchase("second-card", "second", "80", "2026-11-08", "food"),
  purchase("cash-expense", "cash", "50", "2026-11-08", null),
  purchase("future", "card", "999", "2026-11-09", "food"),
];
document.documentElement.dataset.theme = matchMedia(
  "(prefers-color-scheme: dark)",
).matches
  ? "dark"
  : "light";
createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <main>
      <h1>Pagos por categoría · QA</h1>
      <SpendingPeriods
        accounts={accounts}
        categories={categories}
        transactions={transactions}
      />
    </main>
  </BrowserRouter>,
);
