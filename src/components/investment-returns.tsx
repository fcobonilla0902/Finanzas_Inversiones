import { useMoney } from "./currency-context";
import { NavLink } from "react-router-dom";
import { TrendingUp } from "lucide-react";
import {
  investmentReturns,
  type Account,
  type Transaction,
} from "../lib/finance";

export function InvestmentReturns({
  accounts,
  transactions,
}: {
  accounts: Account[];
  transactions: Transaction[];
}) {
  const money = useMoney();
  if (
    !accounts.some(
      (account) => account.type === "investment" && !account.archived,
    )
  )
    return null;
  const result = investmentReturns(accounts, transactions);
  return (
    <section
      className="card investment-returns"
      aria-labelledby="investment-returns-title"
    >
      <div className="card-heading">
        <div>
          <h2 id="investment-returns-title">Rendimiento de tus inversiones</h2>
          <p className="muted">
            Una estimación de lo que puede generar tu dinero.
          </p>
        </div>
        <TrendingUp size={22} aria-hidden="true" />
      </div>
      {result.investments.length ? (
        <>
          <p className="investment-principal">
            Capital considerado <strong>{money(result.principal)}</strong>
          </p>
          <dl className="investment-returns-grid">
            {[
              ["Por día", result.daily],
              ["Por semana", result.weekly],
              ["Por mes · 30 días", result.monthly],
              ["Por año · 365 días", result.annual],
            ].map(([label, amount]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{money(Number(amount))}</dd>
              </div>
            ))}
          </dl>
          <p className="field-hint">
            Interés simple sobre el saldo registrado hasta hoy, manteniendo
            capital y tasas constantes. Sin reinversión, comisiones ni
            impuestos. No son ganancias recibidas ni se suman automáticamente a
            tus saldos.
          </p>
          <div className="investment-rates">
            {result.investments.map((investment) => (
              <span key={investment.id}>
                {investment.name}
                <b>
                  {new Intl.NumberFormat("es-MX", {
                    maximumFractionDigits: 4,
                  }).format(investment.rate)}
                  % anual
                </b>
              </span>
            ))}
          </div>
        </>
      ) : (
        <p className="muted investment-return-empty">
          Añade el rendimiento anual a tus cuentas de inversión para ver cuánto
          podrían generar por día, semana, mes y año.
        </p>
      )}
      <NavLink className="text-link" to="/cuentas">
        Configurar tasas en cuentas
      </NavLink>
    </section>
  );
}
