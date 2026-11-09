import { NavLink } from "react-router-dom";
import { money, type Account, type Transaction } from "../lib/finance";
import { monthlyOutlook } from "../lib/monthly-outlook";

export function MonthlyOutlook({
  accounts,
  transactions,
  ready,
  asOf,
}: {
  accounts: Account[];
  transactions: Transaction[];
  ready: boolean;
  asOf?: string;
}) {
  const summary = monthlyOutlook(accounts, transactions, asOf);
  const amount = (value: number) => (ready ? money(value) : "—");
  const month = new Intl.DateTimeFormat("es-MX", {
    month: "long",
    year: "numeric",
  }).format(new Date(`${summary.month}-01T12:00:00`));
  return (
    <section
      className="card balance-card monthly-outlook"
      aria-labelledby="monthly-outlook-title"
    >
      <h2 id="monthly-outlook-title">Tu cierre de mes</h2>
      <p className="muted">{month} · Con tus registros hasta hoy</p>
      <div className="balance-row">
        <span>En inversiones</span>
        <b>{amount(summary.investments)}</b>
      </div>
      <div className="balance-row">
        <span>Efectivo, débito y ahorro antes de gastos del mes</span>
        <b>{amount(summary.cashBeforeExpenses)}</b>
      </div>
      <div className="balance-row">
        <span>Ingresos del mes · ya incluidos</span>
        <b>{amount(summary.income)}</b>
      </div>
      <div className="balance-row">
        <span>Gastos de efectivo y débito del mes</span>
        <b>{amount(summary.cashExpenses)}</b>
      </div>
      <p className="field-hint">
        El importe de efectivo y débito de arriba se muestra antes de estos
        gastos.
      </p>
      <h3>Inversiones + efectivo y débito − gastos</h3>
      <strong className="monthly-subtotal">{amount(summary.totalFunds)}</strong>
      <h3>Crédito por pagar hasta fin de mes</h3>
      <div className="balance-row">
        <span>A meses por pagar</span>
        <b>{amount(summary.installmentDue)}</b>
      </div>
      <div className="balance-row">
        <span>De contado por pagar</span>
        <b>{amount(summary.outrightDue)}</b>
      </div>
      {summary.otherDue > 0 && (
        <div className="balance-row">
          <span>Otros cargos por pagar</span>
          <b>{amount(summary.otherDue)}</b>
        </div>
      )}
      <strong className="monthly-credit-total">{amount(summary.due)}</strong>
      <details>
        <summary>Ver saldo pendiente y fechas por tarjeta</summary>
        {summary.cards.length ? (
          summary.cards.map((card) => (
            <div key={card.id}>
              <h4>{card.name}</h4>
              <div className="balance-row">
                <span>Total comprado con crédito</span>
                <b>{amount(card.purchased)}</b>
              </div>
              <div className="balance-row">
                <span>Abonos marcados como pagados</span>
                <b>{amount(card.markedPaid)}</b>
              </div>
              {card.appliedPayments > 0 && (
                <div className="balance-row">
                  <span>Otros abonos aplicados a compras</span>
                  <b>{amount(card.appliedPayments)}</b>
                </div>
              )}
              <div className="balance-row">
                <span>Saldo pendiente estimado de compras</span>
                <b>{amount(card.debt)}</b>
              </div>
              {card.statementDay && card.paymentDay && (
                <p className="field-hint">
                  Día de corte: {card.statementDay} · Último día para pagar:{" "}
                  {card.paymentDay}
                </p>
              )}
              <div className="balance-row">
                <span>A meses · saldo pendiente</span>
                <b>{amount(card.installmentDebt)}</b>
              </div>
              <div className="balance-row">
                <span>De contado · saldo pendiente</span>
                <b>{amount(card.outrightDebt)}</b>
              </div>
              {card.otherDebt > 0 && (
                <div className="balance-row">
                  <span>Otros cargos y saldo inicial</span>
                  <b>{amount(card.otherDebt)}</b>
                </div>
              )}
              <div className="balance-row">
                <span>Por pagar hasta fin de mes</span>
                <b>{amount(card.dueThisMonth)}</b>
              </div>
              {card.undated > 0 && (
                <p className="field-hint">
                  {amount(card.undated)} sin vencimiento conocido. Revisa las
                  fechas de corte y pago en Cuentas; el saldo inicial no tiene
                  fecha de vencimiento.
                </p>
              )}
            </div>
          ))
        ) : (
          <p className="field-hint">No tienes tarjetas registradas.</p>
        )}
      </details>
      <div className="balance-row">
        <span>Total de ingresos y saldos</span>
        <b>{amount(summary.fundsBeforeExpenses)}</b>
      </div>
      <div className="balance-row">
        <span>Total de gastos</span>
        <b>{amount(summary.expenses)}</b>
      </div>
      <h3>Te quedaría al cierre del mes</h3>
      <strong className="monthly-final">
        {ready && summary.remaining !== null ? money(summary.remaining) : "—"}
      </strong>
      {summary.incomplete && (
        <p className="muted">
          Faltan vencimientos para estimar tu cierre completo.
        </p>
      )}
      <p className="muted">
        Total de ingresos y saldos menos gastos de efectivo y débito y pagos
        pendientes de crédito, incluidos atrasos. Los ingresos del mes ya están
        incluidos; cada gasto se resta una sola vez. No anticipa nuevos ingresos
        ni gastos.
      </p>
      <p className="field-hint">
        Reconocemos los meses marcados como pagados. Las transferencias que
        cubren esos abonos no se descuentan otra vez; el excedente se aplica a
        los vencimientos más antiguos. Registra las transferencias para mantener
        actualizado el dinero en tus cuentas.
      </p>
      <NavLink className="text-link" to="/cuentas">
        Revisar cuentas y tarjetas
      </NavLink>
    </section>
  );
}
