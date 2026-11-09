import { useMoney } from "./currency-context";
import { NavLink } from "react-router-dom";
import { CreditCard, Target } from "lucide-react";
import {
  creditCardDebt,
  goalTimeLabel,
  monthlySavingsCapacity,
  savingsGoalForecast,
  accountSavings,
  type Account,
  type SavingsGoal,
  type SavingsPlan,
  type Transaction,
} from "../lib/finance";

export function CreditDebtSummary({
  accounts,
  transactions,
  ready,
}: {
  accounts: Account[];
  transactions: Transaction[];
  ready: boolean;
}) {
  const money = useMoney();
  const debt = creditCardDebt(accounts, transactions);
  return (
    <section className="card debt-summary" aria-labelledby="credit-debt-title">
      <div className="card-heading">
        <h2 id="credit-debt-title">Tarjetas de crédito</h2>
        <CreditCard size={21} aria-hidden="true" />
      </div>
      <p className="muted">Deuda registrada hasta hoy</p>
      <p className="summary-amount">{ready ? money(debt.total) : "—"}</p>
      {debt.cards.length ? (
        debt.cards.map((card) => (
          <div className="category-row" key={card.id}>
            <span>
              {card.name}
              {card.archived ? <small> · Archivada</small> : null}
            </span>
            <b>{card.debt ? money(card.debt) : "Sin deuda"}</b>
          </div>
        ))
      ) : (
        <p className="field-hint">
          Añade tus tarjetas en Cuentas para consultar cuánto debes.
        </p>
      )}
      <p className="field-hint summary-note">
        Los pagos reducen la deuda al registrar una transferencia a la tarjeta.
        Los saldos a favor no compensan la deuda de otras tarjetas.
      </p>
      <NavLink className="text-link" to="/cuentas">
        Ver cuentas y tarjetas
      </NavLink>
      <NavLink className="text-link installment-entry" to="/compras-a-meses">
        Ver compras con tarjeta de crédito
      </NavLink>
    </section>
  );
}

export function GoalProgress({
  forecast,
}: {
  forecast: ReturnType<typeof savingsGoalForecast>[number];
}) {
  const money = useMoney();
  return (
    <div className="goal-summary">
      <div className="card-heading">
        <h3>{forecast.goal.name}</h3>
        <span className="tag">{Math.floor(forecast.progress)}%</span>
      </div>
      <p className="goal-amounts">
        <strong>{money(forecast.saved)}</strong>
        <span>de {money(forecast.target)}</span>
      </p>
      <progress
        className="goal-progress"
        aria-label={`Progreso de ${forecast.goal.name}`}
        max={forecast.target}
        value={Math.min(forecast.saved, forecast.target)}
      />
      <p className="goal-estimate">
        {forecast.goal.archived ? (
          <>
            <b>Meta archivada</b>
            <span>Sin aportaciones proyectadas</span>
          </>
        ) : (
          <>
            <b>
              {goalTimeLabel(forecast.months)}
              {forecast.months != null && forecast.months > 0 ? " aprox." : ""}
            </b>
            {forecast.monthly > 0 ? (
              <span>{money(forecast.monthly)} al mes</span>
            ) : forecast.remaining > 0 ? (
              <span>Necesitas ahorro mensual positivo</span>
            ) : null}
          </>
        )}
      </p>
    </div>
  );
}

export function GoalsPreview({
  accounts,
  goals,
  plan,
  transactions,
}: {
  accounts: Account[];
  goals: SavingsGoal[];
  plan?: SavingsPlan;
  transactions: Transaction[];
}) {
  const money = useMoney();
  const capacity = monthlySavingsCapacity(transactions, plan);
  const active = savingsGoalForecast(
    goals,
    capacity.available,
    accountSavings(accounts, transactions),
  ).filter(({ goal }) => !goal.archived);
  return (
    <section
      className="card goals-preview"
      aria-labelledby="goals-preview-title"
    >
      <div className="card-heading">
        <h2 id="goals-preview-title">Tus metas de ahorro</h2>
        <Target size={21} aria-hidden="true" />
      </div>
      {active.length ? (
        <>
          <p className="muted">
            Capacidad mensual: {money(Math.max(0, capacity.available))}
          </p>
          {active.slice(0, 3).map((forecast) => (
            <GoalProgress key={forecast.goal.id} forecast={forecast} />
          ))}
          <p className="field-hint summary-note">
            Cada plazo supone que priorizas esa meta con toda tu capacidad
            mensual.{" "}
            {capacity.source === "recorded"
              ? "Se basa en los registros de este mes, que puede estar incompleto."
              : "Se basa en tu presupuesto mensual guardado."}
          </p>
        </>
      ) : (
        <div className="goals-empty">
          <h3>Dale un destino a tu ahorro</h3>
          <p className="muted">
            Crea metas a corto, mediano y largo plazo y descubre cuánto tiempo
            podrían tomar.
          </p>
        </div>
      )}
      <NavLink className="text-link" to="/metas">
        {active.length ? "Ver y organizar metas" : "Crear tu primera meta"}
      </NavLink>
    </section>
  );
}
