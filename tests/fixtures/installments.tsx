import { useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { MovementDialog, Movements } from "../../src/features/movements";
import { Installments } from "../../src/features/installments";
import {
  balance,
  creditCardDebt,
  money,
  type Transaction,
} from "../../src/lib/finance";
import { monthlyOutlook } from "../../src/lib/monthly-outlook";
import { Button } from "../../src/components/ui/button";
import "@fontsource-variable/manrope";
import "../../src/design.css";
const accounts = [
  {
    id: "card",
    name: "Tarjeta de prueba",
    type: "credit",
    initial_balance: "0.00",
    archived: false,
    statement_day: 15,
    payment_day: 5,
  },
  {
    id: "bank",
    name: "Banco de prueba",
    type: "bank",
    initial_balance: "1000.00",
    archived: false,
  },
];
const categories = [
  {
    id: "shopping",
    name: "Compras",
    kind: "expense" as const,
    archived: false,
  },
  { id: "salary", name: "Sueldo", kind: "income" as const, archived: false },
  { id: "travel", name: "Viajes", kind: "expense" as const, archived: false },
];
function Harness() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [fail, setFail] = useState(false);
  const [showMovements, setShowMovements] = useState(false);
  return (
    <BrowserRouter>
      <main>
        <h1>Compras con tarjeta · QA</h1>
        <p>Datos sintéticos, sin conexión a Supabase.</p>
        <p>
          Deuda:{" "}
          <output aria-label="Deuda de prueba">
            {money(creditCardDebt(accounts, transactions).total)}
          </output>
        </p>
        <p>
          Saldo de pago:{" "}
          <output aria-label="Saldo de cuenta de pago">
            {money(balance(accounts[1], transactions))}
          </output>
        </p>
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
        >
          Registrar compra
        </Button>
        <label className="archive-toggle">
          <input
            type="checkbox"
            checked={fail}
            onChange={(e) => setFail(e.target.checked)}
          />{" "}
          Simular fallo al guardar
        </label>
        <Button onClick={() => setShowMovements(!showMovements)}>
          {showMovements
            ? "Ver compras de prueba"
            : "Ver movimientos de prueba"}
        </Button>
        {showMovements ? (
          <Movements
            accounts={accounts}
            categories={categories}
            transactions={transactions}
            write={async () => {}}
            edit={() => {}}
            remove={(t) =>
              setTransactions((rows) => rows.filter((row) => row.id !== t.id))
            }
          />
        ) : (
          <Installments
            accounts={accounts}
            categories={categories}
            transactions={transactions}
            enabled
            payCard={async (payment) => {
              if (fail) throw Error("Sin conexión. Intenta guardar de nuevo.");
              if (
                transactions.some(
                  (t) =>
                    t.destination_id === payment.cardId &&
                    t.credit_payment_month?.slice(0, 7) === payment.month,
                )
              )
                return;
              const card = monthlyOutlook(
                accounts,
                transactions,
                new Date().toLocaleDateString("en-CA"),
                payment.month,
              ).cards.find((c) => c.id === payment.cardId)!;
              setTransactions((rows) => [
                ...rows,
                {
                  id: crypto.randomUUID(),
                  kind: "transfer",
                  account_id: payment.sourceId,
                  destination_id: payment.cardId,
                  amount: payment.expectedAmount,
                  date: payment.paidOn,
                  description: "Pago a tiempo de prueba",
                  category_id: null,
                  credit_payment_month: `${payment.month}-01`,
                  credit_payment_allocations: card.purchases
                    .filter((p) => p.total > 0)
                    .map((p) => ({
                      transaction_id: p.id,
                      amount_cents: p.total,
                    })),
                },
              ]);
            }}
            write={async (_, data, id) => {
              if (fail) throw Error("Sin conexión. Intenta guardar de nuevo.");
              setTransactions((rows) =>
                rows.map((t) => (t.id === id ? { ...t, ...data } : t)),
              );
            }}
            edit={(t) => {
              setEditing(t);
              setOpen(true);
            }}
          />
        )}
        {open ? (
          <MovementDialog
            accounts={accounts}
            categories={categories}
            editing={editing}
            close={() => setOpen(false)}
            save={async (data) => {
              setTransactions((rows) =>
                editing
                  ? rows.map((t) =>
                      t.id === editing.id ? { ...t, ...data } : t,
                    )
                  : [
                      ...rows,
                      {
                        ...data,
                        id: crypto.randomUUID(),
                      } as unknown as Transaction,
                    ],
              );
              setOpen(false);
            }}
          />
        ) : null}
      </main>
    </BrowserRouter>
  );
}
document.documentElement.dataset.theme = matchMedia(
  "(prefers-color-scheme: dark)",
).matches
  ? "dark"
  : "light";
createRoot(document.getElementById("root")!).render(<Harness />);
