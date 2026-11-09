import { useMoney } from "../components/currency-context";
import { useState, type FormEvent } from "react";
import {
  cents,
  monthlySavingsCapacity,
  savingsGoalForecast,
  accountSavings,
  type Account,
  type SavingsGoal,
  type SavingsPlan,
  type Transaction,
} from "../lib/finance";
import type { Context } from "../lib/types";
import { Button } from "../components/ui/button";
import { FieldError } from "../components/ui/field-error";
import { GoalProgress } from "../components/savings-summary";

const horizons = [
  ["short", "Corto plazo"],
  ["medium", "Mediano plazo"],
  ["long", "Largo plazo"],
] as const;
function validateMoney(value: string, allowZero = true) {
  const amount = cents(value.trim());
  if (amount < 0 || (!allowZero && amount === 0) || amount > 999999999999999)
    throw Error(
      allowZero
        ? "Introduce un importe igual o mayor que cero, con máximo dos decimales."
        : "Introduce un objetivo mayor que cero, con máximo dos decimales.",
    );
  return value.trim();
}
function MoneyField({
  name,
  label,
  value = "0.00",
  error,
  required = true,
}: {
  name: string;
  label: string;
  value?: string;
  error?: string;
  required?: boolean;
}) {
  const id = `savings-${name}`;
  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        name={name}
        inputMode="decimal"
        autoComplete="off"
        defaultValue={value}
        placeholder="Ej. 20000.00"
        required={required}
        maxLength={16}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      <FieldError name={id} message={error} />
    </div>
  );
}

function PlanForm({
  plan,
  write,
  enabled,
}: {
  plan?: SavingsPlan;
  write: Context["write"];
  enabled: boolean;
}) {
  const [source, setSource] = useState(plan?.source || "recorded");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const data = new FormData(event.currentTarget);
    try {
      const income =
        source === "budget"
          ? validateMoney(String(data.get("monthly_income")))
          : null;
      const expense =
        source === "budget"
          ? validateMoney(String(data.get("monthly_expenses")))
          : null;
      setBusy(true);
      await write(
        "savings_plans",
        { source, monthly_income: income, monthly_expenses: expense },
        plan?.id,
      );
    } catch (exception) {
      setError((exception as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit}>
      <fieldset className="plan-source">
        <legend>Base para la estimación</legend>
        <label>
          <input
            type="radio"
            name="source"
            value="recorded"
            checked={source === "recorded"}
            onChange={() => setSource("recorded")}
          />
          Registros de este mes
        </label>
        <label>
          <input
            type="radio"
            name="source"
            value="budget"
            checked={source === "budget"}
            onChange={() => setSource("budget")}
          />
          Mi presupuesto mensual
        </label>
      </fieldset>
      {source === "budget" ? (
        <>
          <div className="form-grid">
            <MoneyField
              name="monthly_income"
              label="Ingreso mensual previsto en MXN"
              value={plan?.monthly_income || "0.00"}
            />
            <MoneyField
              name="monthly_expenses"
              label="Gastos mensuales previstos en MXN"
              value={plan?.monthly_expenses || "0.00"}
            />
          </div>
          <p className="field-hint">
            Incluye los pagos de deuda y compromisos que quieras reservar dentro
            de tus gastos. Guarda el presupuesto para actualizar los plazos.
          </p>
        </>
      ) : (
        <p className="field-hint">
          Ingresos menos gastos registrados desde el inicio del mes hasta hoy,
          sin extrapolar. Un mes incompleto puede dar una estimación poco
          representativa; usa un presupuesto para planear con cifras habituales.
        </p>
      )}
      {error ? (
        <p className="error" role="alert">
          {error}
        </p>
      ) : null}
      <Button disabled={!enabled || busy}>
        {busy ? "Guardando…" : "Guardar base de ahorro"}
      </Button>
    </form>
  );
}

export function Goals({
  accounts,
  goals,
  plan,
  transactions,
  write,
  enabled,
}: {
  accounts: Account[];
  goals: SavingsGoal[];
  plan?: SavingsPlan;
  transactions: Transaction[];
  write: Context["write"];
  enabled: boolean;
}) {
  const money = useMoney();
  const [editing, setEditing] = useState<SavingsGoal | null>(null);
  const [filter, setFilter] = useState("all"),
    [archived, setArchived] = useState(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const capacity = monthlySavingsCapacity(transactions, plan);
  const savedReference = accountSavings(accounts, transactions);
  const forecasts = savingsGoalForecast(
    goals,
    capacity.available,
    savedReference,
  );
  const visible = forecasts.filter(
    ({ goal }) =>
      goal.archived === archived &&
      (filter === "all" || goal.horizon === filter),
  );
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = event.currentTarget,
      data = new FormData(form),
      invalid: Record<string, string> = {};
    const name = String(data.get("name")).trim();
    if (!name) invalid.name = "Escribe un nombre para tu meta.";
    let target = "";
    try {
      target = validateMoney(String(data.get("target_amount")), false);
    } catch (exception) {
      invalid.target_amount = (exception as Error).message;
    }
    setErrors(invalid);
    if (Object.keys(invalid).length) {
      form
        .querySelector<HTMLElement>(`[name="${Object.keys(invalid)[0]}"]`)
        ?.focus();
      return;
    }
    setBusy(true);
    try {
      await write(
        "savings_goals",
        {
          name,
          horizon: data.get("horizon"),
          target_amount: target,
          saved_amount: editing?.saved_amount || "0.00",
        },
        editing?.id,
      );
      form.reset();
      setEditing(null);
    } catch (exception) {
      setError((exception as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function edit(goal: SavingsGoal) {
    setEditing(goal);
    setErrors({});
    setError("");
    requestAnimationFrame(() => document.getElementById("goal-name")?.focus());
  }
  return (
    <>
      {!enabled ? (
        <p className="setup-banner">
          Inicia sesión para guardar tus metas y tu presupuesto.
        </p>
      ) : null}
      <div className="settings-grid goals-layout">
        <section className="card">
          <h2>Tu capacidad de ahorro</h2>
          <p className="summary-amount">{money(capacity.available)}</p>
          <p className="muted">
            {capacity.source === "recorded"
              ? "Balance registrado de este mes"
              : "Balance de tu presupuesto mensual"}
          </p>
          <div className="category-row">
            <span>Ingresos</span>
            <b>{money(capacity.income)}</b>
          </div>
          <div className="category-row">
            <span>Gastos</span>
            <b>{money(capacity.expense)}</b>
          </div>
          <PlanForm
            key={
              plan
                ? `${plan.id}-${plan.source}-${plan.monthly_income}-${plan.monthly_expenses}`
                : "new"
            }
            plan={plan}
            write={write}
            enabled={enabled}
          />
          <p className="field-hint summary-note">
            Cada meta usa toda tu capacidad mensual como referencia
            independiente. Los plazos suponen que priorizas esa meta, no que
            aportas esa cantidad a todas al mismo tiempo. No se mueve dinero
            entre tus cuentas.
          </p>
        </section>
        <section className="card" id="goal-form">
          <h2>{editing ? "Editar meta" : "Crea una meta de ahorro"}</h2>
          <p className="muted">Un objetivo claro y pequeños pasos cada mes.</p>
          <form key={editing?.id || "new"} onSubmit={submit} noValidate>
            <div className="form-field">
              <label htmlFor="goal-name">Nombre de la meta</label>
              <input
                id="goal-name"
                name="name"
                maxLength={80}
                required
                defaultValue={editing?.name || ""}
                placeholder="Ej. Fondo de emergencia"
                aria-invalid={!!errors.name}
                aria-describedby={errors.name ? "goal-name-error" : undefined}
              />
              <FieldError name="goal-name" message={errors.name} />
            </div>
            <label>
              Horizonte
              <select name="horizon" defaultValue={editing?.horizon || "short"}>
                {horizons.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <div className="form-grid">
              <MoneyField
                name="target_amount"
                label="Objetivo en MXN"
                value={editing?.target_amount || ""}
                error={errors.target_amount}
              />
              <div className="form-field">
                <label htmlFor="savings-saved_amount">
                  Ahorrado hasta ahora en MXN
                </label>
                <input
                  id="savings-saved_amount"
                  name="saved_amount"
                  value={(savedReference / 100).toFixed(2)}
                  readOnly
                  aria-describedby="automatic-savings-help"
                />
              </div>
            </div>
            <p className="field-hint" id="automatic-savings-help">
              Total automático de inversiones, cuentas de débito, ahorro y
              efectivo. Los gastos y pagos registrados lo actualizan. Cada meta
              usa este mismo total como referencia; no son apartados de dinero
              separados.
            </p>
            {error ? (
              <p className="error" role="alert">
                {error}
              </p>
            ) : null}
            <div className="goal-actions">
              <Button disabled={!enabled || busy}>
                {busy ? "Guardando…" : editing ? "Guardar meta" : "Crear meta"}
              </Button>
              {editing ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setEditing(null);
                    setErrors({});
                    setError("");
                  }}
                >
                  Cancelar edición
                </Button>
              ) : null}
            </div>
          </form>
        </section>
      </div>
      <div className="section-toolbar">
        <h2>Organiza tus metas</h2>
        <div className="segmented" aria-label="Horizonte de las metas">
          {[
            ["all", "Todas"],
            ["short", "Corto"],
            ["medium", "Mediano"],
            ["long", "Largo"],
          ].map(([value, label]) => (
            <button
              key={value}
              aria-pressed={filter === value}
              className={filter === value ? "selected" : ""}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <label className="archive-toggle">
        <input
          type="checkbox"
          checked={archived}
          onChange={(event) => setArchived(event.target.checked)}
        />
        Mostrar archivadas
      </label>
      {!visible.length ? (
        <div className="card empty">
          <h3>
            {archived
              ? "No hay metas archivadas en este horizonte"
              : "Aquí empieza tu próximo objetivo"}
          </h3>
          <p>
            {archived
              ? "Las metas que archives aparecerán aquí."
              : "Crea una meta o cambia el filtro para ver tus objetivos."}
          </p>
        </div>
      ) : (
        horizons.map(([horizon, label]) => {
          const group = visible.filter(({ goal }) => goal.horizon === horizon);
          return group.length ? (
            <section className="goal-horizon" key={horizon}>
              <h2>{label}</h2>
              <div className="goal-grid">
                {group.map((forecast) => (
                  <article className="card" key={forecast.goal.id}>
                    <GoalProgress forecast={forecast} />
                    <div className="goal-actions">
                      <Button
                        variant="ghost"
                        onClick={() => edit(forecast.goal)}
                      >
                        Editar meta
                      </Button>
                      <Button
                        variant="ghost"
                        disabled={!enabled}
                        onClick={async () => {
                          try {
                            await write(
                              "savings_goals",
                              { archived: !forecast.goal.archived },
                              forecast.goal.id,
                            );
                          } catch (exception) {
                            setError((exception as Error).message);
                            document
                              .getElementById("goal-form")
                              ?.scrollIntoView();
                          }
                        }}
                      >
                        {forecast.goal.archived
                          ? "Reactivar meta"
                          : "Archivar meta"}
                      </Button>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ) : null;
        })
      )}
      <p className="field-hint summary-note">
        Los plazos son aproximados, con aportaciones mensuales al final de cada
        mes, dedicadas a esa meta. Cambian con tus ingresos, gastos y saldos
        registrados. Las otras metas no reducen esta referencia. Sin capacidad
        positiva no se inventa una fecha de cumplimiento.
      </p>
    </>
  );
}
