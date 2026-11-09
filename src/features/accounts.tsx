import { useState, type FormEvent } from "react";
import { Landmark, Pencil } from "lucide-react";
import {
  balance,
  cents,
  money,
  parseAnnualReturnRate,
  type Account,
} from "../lib/finance";
import type { Context } from "../lib/types";
import { Button } from "../components/ui/button";
export function Accounts({
  accounts,
  transactions,
  write,
  enabled,
}: Context & { enabled: boolean }) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [editing, setEditing] = useState<Account | null>(null);
  const [accountType, setAccountType] = useState("bank");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      data = new FormData(form);
    setError("");
    setBusy(true);
    try {
      const initial = String(data.get("initial_balance"));
      cents(initial);
      const parseDay = (name: string) => {
        const raw = String(data.get(name) || "").trim();
        if (!raw) return null;
        const day = Number(raw);
        if (!Number.isInteger(day) || day < 1 || day > 31)
          throw Error("Los días de corte y pago deben estar entre 1 y 31.");
        return day;
      };
      const statementDay =
        accountType === "credit" ? parseDay("statement_day") : null;
      const paymentDay =
        accountType === "credit" ? parseDay("payment_day") : null;
      if ((statementDay == null) !== (paymentDay == null))
        throw Error(
          "Configura tanto el día de corte como el día de pago, o deja ambos vacíos.",
        );
      await write(
        "accounts",
        {
          name: String(data.get("name")).trim(),
          type: data.get("type"),
          initial_balance: initial,
          statement_day: statementDay,
          payment_day: paymentDay,
          annual_return_rate:
            data.get("type") === "investment"
              ? parseAnnualReturnRate(
                  String(data.get("annual_return_rate") || ""),
                )
              : null,
        },
        editing?.id,
      );
      form.reset();
      setEditing(null);
      setAccountType("bank");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="account-grid">
        {accounts.map((a) => (
          <article className="card account-card" key={a.id}>
            <Landmark size={24} />
            <span className="tag">
              {a.archived
                ? "Archivada"
                : a.type === "credit"
                  ? "Pasivo"
                  : "MXN"}
            </span>
            <h2>{a.name}</h2>
            <strong>{money(balance(a, transactions))}</strong>
            <small>
              {a.type === "credit"
                ? "Saldo negativo = deuda pendiente"
                : "Saldo calculado con tus movimientos"}
            </small>
            {a.type === "investment" && (
              <small className="account-rate">
                {a.annual_return_rate != null
                  ? `${new Intl.NumberFormat("es-MX", { maximumFractionDigits: 4 }).format(Number(a.annual_return_rate))}% anual estimado`
                  : "Sin tasa anual configurada"}
              </small>
            )}
            <div className="account-actions">
              <Button
                variant="ghost"
                onClick={() => {
                  setEditing(a);
                  setAccountType(a.type);
                  setError("");
                }}
              >
                <Pencil size={15} />
                Editar
              </Button>
              <Button
                variant="ghost"
                onClick={async () => {
                  try {
                    await write("accounts", { archived: !a.archived }, a.id);
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                {a.archived ? "Activar" : "Archivar"}
              </Button>
            </div>
            {a.type === "credit" ? (
              <small>
                {a.statement_day && a.payment_day
                  ? `Corte: día ${a.statement_day} · Pago: día ${a.payment_day}`
                  : "Sin días de corte y pago configurados"}
              </small>
            ) : null}
          </article>
        ))}
      </div>
      <section className="card narrow">
        <h2>
          {editing ? "Editar cuenta" : "Crea tu primera cuenta o agrega otra"}
        </h2>
        <p className="muted">
          El saldo inicial es tu punto de partida. En tarjetas de crédito,
          registra la deuda con signo negativo.
        </p>
        <form key={editing?.id || "new"} onSubmit={submit}>
          <label>
            Nombre
            <input
              name="name"
              required
              maxLength={80}
              defaultValue={editing?.name}
              placeholder="Mi cuenta principal"
            />
          </label>
          <div className="form-grid">
            <label>
              Tipo
              <select
                name="type"
                value={accountType}
                onChange={(event) => setAccountType(event.target.value)}
              >
                {[
                  ["cash", "Efectivo"],
                  ["bank", "Cuenta bancaria"],
                  ["savings", "Ahorro"],
                  ["debit", "Tarjeta de débito"],
                  ["credit", "Tarjeta de crédito"],
                  ["investment", "Cuenta de inversión"],
                  ["other", "Otra"],
                ].map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Saldo inicial en MXN
              <input
                name="initial_balance"
                inputMode="decimal"
                defaultValue={editing?.initial_balance || "0.00"}
                required
              />
            </label>
          </div>
          {accountType === "investment" && (
            <label>
              Rendimiento anual estimado (%)
              <input
                name="annual_return_rate"
                aria-label="Rendimiento anual estimado (%)"
                type="number"
                inputMode="decimal"
                min="0"
                max="100"
                step="0.0001"
                placeholder="Ej. 10.5"
                defaultValue={editing?.annual_return_rate ?? ""}
                aria-describedby="annual-return-help"
              />
              <span id="annual-return-help" className="field-hint">
                Opcional. Se usa para estimar rendimientos con interés simple
                sobre el saldo registrado; puedes actualizarla cuando cambie.
              </span>
            </label>
          )}
          {accountType === "credit" ? (
            <fieldset className="installment-fields">
              <legend>Corte y pago mensual</legend>
              <div className="form-grid">
                <label>
                  Día de corte
                  <input
                    name="statement_day"
                    aria-label="Día de corte"
                    type="number"
                    inputMode="numeric"
                    min="1"
                    max="31"
                    step="1"
                    placeholder="Ej. 15"
                    defaultValue={editing?.statement_day ?? ""}
                  />
                </label>
                <label>
                  Día de pago
                  <input
                    name="payment_day"
                    aria-label="Día de pago"
                    type="number"
                    inputMode="numeric"
                    min="1"
                    max="31"
                    step="1"
                    placeholder="Ej. 5"
                    defaultValue={editing?.payment_day ?? ""}
                  />
                </label>
              </div>
              <p className="field-hint">
                Opcionales, pero debes indicar ambos para estimar mensualidades.
                Una compra en el día de corte entra en ese corte. Si el pago es
                anterior o igual al corte, vence el mes siguiente. En meses
                cortos se usa el último día. Ajusta estos días si tu banco los
                cambia.
              </p>
            </fieldset>
          ) : null}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <Button disabled={!enabled || busy}>
            {busy ? "Guardando…" : editing ? "Guardar cuenta" : "Crear cuenta"}
          </Button>
          {editing && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setEditing(null);
                setAccountType("bank");
                setError("");
              }}
            >
              Cancelar edición
            </Button>
          )}
        </form>
      </section>
    </>
  );
}
