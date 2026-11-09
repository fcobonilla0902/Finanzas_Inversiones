import { useState, type FormEvent } from "react";
import { NavLink } from "react-router-dom";
import {
  cents,
  installmentSummary,
  money,
  type Transaction,
  type CreditPeriodPayment,
} from "../lib/finance";
import { monthlyOutlook } from "../lib/monthly-outlook";
import type { Context } from "../lib/types";
import { Button } from "../components/ui/button";
import { downloadExcel } from "../lib/excel";
import { CreditPaymentDialog } from "../components/credit-payment-dialog";

function PaidForm({
  transaction,
  write,
  enabled,
}: {
  transaction: Transaction;
  write: Context["write"];
  enabled: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const raw = String(new FormData(form).get("paid") ?? "").trim();
    const value = Number(raw);
    setError("");
    setSaved(false);
    if (
      !/^\d+$/.test(raw) ||
      !Number.isInteger(value) ||
      value < 0 ||
      value > transaction.installment_months!
    ) {
      setError(
        "Introduce un número de meses entre cero y el plazo de la compra.",
      );
      form.querySelector<HTMLInputElement>("input")?.focus();
      return;
    }
    setBusy(true);
    try {
      await write("transactions", { installments_paid: value }, transaction.id);
      setSaved(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const id = `paid-${transaction.id}`;
  return (
    <form className="installment-paid" onSubmit={submit} noValidate>
      <label className="sr-only" htmlFor={id}>
        Meses pagados de {transaction.description}
      </label>
      <input
        id={id}
        name="paid"
        type="number"
        inputMode="numeric"
        min="0"
        max={transaction.installment_months!}
        step="1"
        defaultValue={transaction.installments_paid || 0}
        required
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={() => {
          setError("");
          setSaved(false);
        }}
      />
      <Button
        disabled={!enabled || busy}
        aria-label={`Guardar meses pagados de ${transaction.description}`}
      >
        {busy ? "Guardando…" : "Guardar"}
      </Button>
      {error ? (
        <p id={`${id}-error`} className="error" role="alert">
          {error}
        </p>
      ) : null}
      {saved ? (
        <span className="field-hint" role="status">
          Avance guardado
        </span>
      ) : null}
    </form>
  );
}

export function Installments({
  accounts,
  categories = [],
  transactions,
  write,
  enabled,
  edit,
  payCard,
}: {
  accounts: Context["accounts"];
  categories?: Context["categories"];
  transactions: Transaction[];
  write: Context["write"];
  enabled: boolean;
  edit: (transaction: Transaction) => void;
  payCard?: (payment: CreditPeriodPayment) => Promise<void>;
}) {
  const [filter, setFilter] = useState("pending");
  const [purchaseType, setPurchaseType] = useState("all");
  const [account, setAccount] = useState("");
  const [category, setCategory] = useState("");
  const [month, setMonth] = useState(
    new Date().toLocaleDateString("en-CA").slice(0, 7),
  );
  const [exportError, setExportError] = useState("");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const asOf = new Date().toLocaleDateString("en-CA");
  const outlook = monthlyOutlook(accounts, transactions, asOf, month);
  const balances = new Map(outlook.purchases.map((p) => [p.id, p]));
  const all = transactions.filter(
    (t) =>
      t.kind === "expense" &&
      t.date <= asOf &&
      accounts.some((a) => a.id === t.account_id && a.type === "credit"),
  );
  const list = all.filter(
    (t) =>
      (!account || t.account_id === account) &&
      (!category || t.category_id === category) &&
      (purchaseType === "all" ||
        (purchaseType === "months"
          ? (t.installment_months || 1) > 1
          : (t.installment_months || 1) === 1)) &&
      (filter === "all" ||
        (filter === "paid"
          ? balances.get(t.id)?.remaining === 0
          : (balances.get(t.id)?.remaining || 0) > 0)),
  );
  const billing = list.map((t) => ({
    transaction: t,
    card: accounts.find((a) => a.id === t.account_id),
    bill: balances.get(t.id)?.undated ? null : balances.get(t.id),
  }));
  const current = billing.reduce(
    (sum, row) => sum + (row.bill?.thisMonth || 0),
    0,
  );
  const overdue = billing.reduce(
    (sum, row) => sum + (row.bill?.overdue || 0),
    0,
  );
  const missing = billing.filter(
    (row) =>
      !row.bill && (balances.get(row.transaction.id)?.remaining || 0) > 0,
  ).length;
  function exportRows() {
    setExportError("");
    try {
      downloadExcel(
        [
          {
            name: "Compras",
            columnWidths: [
              42, 28, 24, 16, 20, 12, 18, 20, 26, 22, 18, 24, 28, 18,
            ],
            currencyColumns: [4, 8, 9, 11, 12],
            autoFilter: true,
            landscape: true,
            rows: [
              [
                "Compra",
                "Tarjeta",
                "Categoría",
                "Fecha",
                "Total MXN",
                "Plazo",
                "Meses pagados",
                "Meses pendientes",
                "Próxima mensualidad MXN",
                "Por cubrir MXN",
                "Mes consultado",
                "Pago del mes MXN",
                "Anteriores pendientes MXN",
                "Fecha de pago",
              ],
              ...list.map((t) => {
                const p = installmentSummary({
                    ...t,
                    installments_paid:
                      balances.get(t.id)?.paidMonths ?? t.installments_paid,
                  }),
                  a = accounts.find((a) => a.id === t.account_id),
                  b = balances.get(t.id);
                return [
                  t.description,
                  a?.name || "Tarjeta",
                  categories.find((c) => c.id === t.category_id)?.name ||
                    "Sin categoría",
                  t.date,
                  cents(t.amount) / 100,
                  p.months,
                  p.paid,
                  p.remainingMonths,
                  p.nextPayment / 100,
                  (b?.remaining || 0) / 100,
                  month,
                  b && !b.undated ? b.thisMonth / 100 : "Sin fechas",
                  b && !b.undated ? b.overdue / 100 : "Sin fechas",
                  b?.dueDate || "",
                ];
              }),
            ],
          },
          {
            name: "Resumen",
            columnWidths: [44, 54],
            currencyRows: [5, 6, 7],
            totalRows: [7],
            rows: [
              ["Concepto", "Valor"],
              ["Mes", month],
              [
                "Tarjeta",
                accounts.find((a) => a.id === account)?.name || "Todas",
              ],
              [
                "Categoría",
                categories.find((c) => c.id === category)?.name || "Todas",
              ],
              [
                "Estado de la tabla",
                filter === "pending"
                  ? "Pendientes"
                  : filter === "paid"
                    ? "Liquidadas"
                    : "Todas las compras",
              ],
              ["Pagos del mes MXN", current / 100],
              ["Anteriores pendientes MXN", overdue / 100],
              ["Total parcial estimado MXN", (current + overdue) / 100],
              ["Compras sin fechas", missing],
            ],
          },
        ],
        `compras-con-tarjeta-${month}.xlsx`,
      );
    } catch {
      setExportError(
        "No se pudo generar el archivo. Intenta exportar de nuevo.",
      );
    }
  }
  return (
    <>
      <NavLink className="text-link" to="/movimientos">
        Ver todos los movimientos
      </NavLink>
      <section className="card installment-panel">
        <div className="card-heading">
          <div>
            <h2>Tus compras con tarjeta de crédito</h2>
            <p className="muted">
              Compras de contado y a meses, con sus pagos pendientes.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={exportRows}
            disabled={!list.length}
          >
            Exportar a Excel
          </Button>
        </div>
        <Button
          type="button"
          className="credit-payment-entry"
          disabled={
            !enabled ||
            !payCard ||
            !accounts.some((a) => a.type === "credit" && !a.archived)
          }
          onClick={() => setPaymentOpen(true)}
        >
          Pagué a tiempo mi tarjeta de crédito
        </Button>
        <p className="field-hint">
          Actualizar meses pagados no cambia el saldo de la tarjeta. Registra
          los pagos como transferencias para actualizar tus cuentas. Los
          importes distribuyen el total registrado, sin añadir intereses ni
          comisiones.
        </p>
        {!enabled ? (
          <p className="setup-banner">
            Inicia sesión para guardar el avance de tus compras.
          </p>
        ) : null}
        <div className="filters">
          <label>
            Tipo de compra
            <select
              value={purchaseType}
              onChange={(e) => setPurchaseType(e.target.value)}
            >
              <option value="all">Todas</option>
              <option value="cash">De contado</option>
              <option value="months">A meses</option>
            </select>
          </label>
          <label>
            Estado
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="pending">Pendientes</option>
              <option value="paid">Liquidadas</option>
              <option value="all">Todas las compras</option>
            </select>
          </label>
          <label>
            Tarjeta
            <select
              value={account}
              onChange={(e) => setAccount(e.target.value)}
            >
              <option value="">Todas las tarjetas</option>
              {accounts
                .filter((a) => a.type === "credit")
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                    {a.archived ? " · Archivada" : ""}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Categoría
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="">Todas las categorías</option>
              {categories
                .filter((c) => c.kind === "expense")
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.archived ? " · Archivada" : ""}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Mes de pago
            <input
              type="month"
              value={month}
              min="1900-01"
              max="9999-12"
              onChange={(e) => {
                if (/^\d{4}-\d{2}$/.test(e.target.value))
                  setMonth(e.target.value);
              }}
            />
          </label>
        </div>
        {exportError ? (
          <p className="error" role="alert">
            {exportError}
          </p>
        ) : null}
        <section
          className="billing-summary"
          aria-labelledby="billing-summary-title"
        >
          <h3 id="billing-summary-title">
            {missing ? "Total parcial estimado" : "Por cubrir estimado"} ·{" "}
            {new Intl.DateTimeFormat("es-MX", {
              month: "long",
              year: "numeric",
            }).format(new Date(`${month}-15T12:00:00`))}
          </h3>
          <p className="summary-amount">{money(current + overdue)}</p>
          <div className="category-row">
            <span>Pagos del mes pendientes</span>
            <b>{money(current)}</b>
          </div>
          <div className="category-row">
            <span>Pagos anteriores pendientes</span>
            <b>{money(overdue)}</b>
          </div>
          {missing ? (
            <p className="field-hint">
              {missing}{" "}
              {missing === 1
                ? "compra sin fechas de tarjeta configuradas; no está incluida"
                : "compras sin fechas de tarjeta configuradas; no están incluidas"}
              .{" "}
              <NavLink className="text-link" to="/cuentas">
                Configurar corte y pago
              </NavLink>
            </p>
          ) : null}
          <p className="field-hint">
            El total sigue los filtros de tipo, estado, tarjeta y categoría.
            Incluye contado y mensualidades según el corte y último día de pago
            de cada tarjeta. Reconoce los meses marcados pagados y estima los
            abonos adicionales por vencimiento, sin duplicarlos. No incluye
            intereses, comisiones ni saldos iniciales.
          </p>
          {billing
            .filter((row) => row.bill && row.bill.total > 0)
            .map((row) => (
              <p className="field-hint" key={row.transaction.id}>
                {row.transaction.description}: {money(row.bill!.thisMonth)} del
                mes{row.bill!.dueDate ? ` · Pago ${row.bill!.dueDate}` : ""}
                {row.bill!.overdue
                  ? ` · ${money(row.bill!.overdue)} anteriores pendientes`
                  : ""}
              </p>
            ))}
        </section>
        {list.length ? (
          <p className="field-hint">
            Desplaza la tabla horizontalmente para ver las mensualidades y
            actualizar los meses pagados.
          </p>
        ) : null}
        {list.length ? (
          <div
            className="installment-scroll"
            role="region"
            aria-label="Tabla de compras con tarjeta de crédito"
            tabIndex={0}
          >
            <table className="installment-table">
              <caption className="sr-only">
                Compras con tarjeta de crédito, de contado y a meses
              </caption>
              <thead>
                <tr>
                  {[
                    "Compra / tarjeta",
                    "Categoría",
                    "Total",
                    "Plazo",
                    "Pagados",
                    "Pendientes",
                    "Próxima mensualidad",
                    "Por cubrir",
                    "Seguimiento",
                  ].map((title) => (
                    <th key={title} scope="col">
                      {title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.map((t) => {
                  const plan = installmentSummary({
                    ...t,
                    installments_paid:
                      balances.get(t.id)?.paidMonths ?? t.installments_paid,
                  });
                  const card = accounts.find((a) => a.id === t.account_id);
                  const atMonths = plan.months > 1;
                  const pending = balances.get(t.id)?.remaining || 0;
                  return (
                    <tr key={t.id}>
                      <th scope="row">
                        <strong>{t.description}</strong>
                        <small>
                          {card?.name || "Tarjeta"}
                          {card?.archived ? " · Archivada" : ""}
                        </small>
                        <small>
                          {new Intl.DateTimeFormat("es-MX", {
                            dateStyle: "medium",
                          }).format(new Date(t.date + "T12:00:00"))}
                        </small>
                        <Button variant="ghost" onClick={() => edit(t)}>
                          Editar compra
                        </Button>
                      </th>
                      <td>
                        {categories.find((c) => c.id === t.category_id)?.name ||
                          "Sin categoría"}
                      </td>
                      <td>{money(cents(t.amount))}</td>
                      <td>
                        {atMonths ? `${plan.months} meses` : "De contado"}
                      </td>
                      <td>
                        {atMonths ? `${plan.paid} de ${plan.months}` : "—"}
                      </td>
                      <td>
                        {pending
                          ? atMonths
                            ? plan.remainingMonths
                            : "Pendiente"
                          : "Pagada"}
                      </td>
                      <td>
                        {atMonths
                          ? money(Math.min(plan.nextPayment, pending))
                          : "—"}
                      </td>
                      <td>{money(pending)}</td>
                      <td>
                        {atMonths &&
                        plan.paid === (t.installments_paid || 0) ? (
                          <PaidForm
                            key={`${t.id}-${t.installment_months}-${t.installments_paid}`}
                            transaction={t}
                            write={write}
                            enabled={enabled && !card?.archived}
                          />
                        ) : atMonths ? (
                          <small>
                            Avance actualizado con tus pagos registrados.
                          </small>
                        ) : (
                          <small>
                            Los pagos registrados reducen el pendiente.
                          </small>
                        )}
                        {card?.archived ? (
                          <small>Reactiva la tarjeta para actualizar.</small>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">
            <h3>
              {all.length
                ? "No hay compras con estos filtros"
                : "Organiza tus compras con tarjeta"}
            </h3>
            <p>
              {all.length
                ? "Cambia el estado o la tarjeta para consultar otras compras."
                : "Registra un gasto con una tarjeta de crédito, de contado o a meses, para verlo aquí."}
            </p>
          </div>
        )}
        <p className="field-hint summary-note">
          Por cubrir reconoce el avance manual y los pagos registrados, sin
          duplicarlos. El reparto de abonos entre compras es estimado. Los
          centavos se reparten entre las primeras mensualidades. No se marcan
          pagos automáticamente por el paso del tiempo.
        </p>
      </section>
      {paymentOpen && payCard && (
        <CreditPaymentDialog
          accounts={accounts}
          transactions={transactions}
          initialCard={account}
          month={month}
          close={() => setPaymentOpen(false)}
          save={payCard}
        />
      )}
    </>
  );
}
