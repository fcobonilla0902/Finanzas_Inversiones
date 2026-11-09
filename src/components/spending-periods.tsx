import { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  creditPaymentDates,
  type Account,
  type Category,
  type Transaction,
} from "../lib/finance";
import { monthlyOutlook } from "../lib/monthly-outlook";
import { Spending, Empty } from "./financial";

export function SpendingPeriods({
  accounts,
  categories,
  transactions,
}: {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
}) {
  const [cardId, setCardId] = useState("");
  const cards = accounts.filter((a) => a.type === "credit");
  const card =
    cards.find((a) => a.id === cardId) ||
    cards.find((a) => !a.archived) ||
    cards[0];
  const today = new Date().toLocaleDateString("en-CA");
  const dates = card ? creditPaymentDates(card, today.slice(0, 7)) : null;
  const monthly = transactions.filter(
    (t) => t.date.startsWith(today.slice(0, 7)) && t.date <= today,
  );
  const bill = monthlyOutlook(accounts, transactions, today).cards.find(
    (c) => c.id === card?.id,
  );
  const byId = new Map(transactions.map((t) => [t.id, t]));
  const paymentRows = (bill?.purchases || [])
    .filter((p) => p.total > 0)
    .map((p) => ({ ...byId.get(p.id)!, amount: (p.total / 100).toFixed(2) }));
  if (bill?.otherDue)
    paymentRows.push({
      id: "other-due",
      kind: "expense",
      amount: (bill.otherDue / 100).toFixed(2),
      date: today,
      description: "Otros cargos",
      account_id: card.id,
      destination_id: null,
      category_id: null,
    });
  return (
    <div className="spending-period-grid">
      <section
        className="card spending-card"
        aria-labelledby="spending-cycle-title"
      >
        <div className="card-heading">
          <div>
            <h2 id="spending-cycle-title">¿A dónde va tu dinero?</h2>
            <p className="muted">
              Pago pendiente de tarjeta de este mes · Por categoría
            </p>
          </div>
        </div>
        {cards.length > 0 && (
          <label>
            Tarjeta para el pago del mes
            <select
              value={card?.id || ""}
              onChange={(e) => setCardId(e.target.value)}
            >
              {cards.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                  {a.archived ? " · Archivada" : ""}
                </option>
              ))}
            </select>
          </label>
        )}
        {dates ? (
          <>
            <p className="field-hint">
              Corte: {dates.cutoff} · Pago hasta {dates.deadline}. Incluye las
              mensualidades y compras de contado pendientes, además de atrasos.
            </p>
            {paymentRows.length ? (
              <Spending
                transactions={paymentRows}
                categories={categories}
                totalLabel="Pago pendiente del mes"
              />
            ) : (
              <Empty
                title="Sin pagos pendientes este mes"
                text="No hay compras con pagos pendientes para este periodo."
              />
            )}
            {!!bill?.undated && (
              <p className="field-hint">
                Hay saldos sin vencimiento conocido; esta gráfica muestra solo
                los pagos calculables.
              </p>
            )}
          </>
        ) : (
          <>
            <Empty
              title="Configura el corte de tu tarjeta"
              text="Añade una tarjeta y sus fechas de corte y pago en Cuentas."
            />
            <NavLink className="text-link" to="/cuentas">
              Configurar tarjeta
            </NavLink>
          </>
        )}
      </section>
      <section
        className="card spending-card"
        aria-labelledby="spending-month-title"
      >
        <div className="card-heading">
          <div>
            <h2 id="spending-month-title">Tus gastos del mes actual</h2>
            <p className="muted">Gastos por categoría · Todas tus cuentas</p>
          </div>
        </div>
        <p className="field-hint">
          {today.slice(0, 7)}-01 al {today}
        </p>
        <p className="field-hint">
          Incluye el importe completo de las compras registradas este mes.
        </p>
        <Spending transactions={monthly} categories={categories} />
      </section>
    </div>
  );
}
