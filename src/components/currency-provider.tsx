import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  currencies,
  fetchExchangeRates,
  type Currency,
  type ExchangeRates,
} from "../lib/currency";
import { CurrencyContext } from "./currency-context";
import { Globe2 } from "lucide-react";
const ControlsContext = createContext<ReactNode>(null);
export function CurrencyControls() {
  return useContext(ControlsContext);
}

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState<Currency>("MXN");
  const [quote, setQuote] = useState<ExchangeRates>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  const hasQuote = useRef(false);

  async function refresh() {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError("");
    const timeout = window.setTimeout(() => controller.abort(), 12000);
    try {
      const next = await fetchExchangeRates(controller.signal);
      if (request.current !== controller) return;
      setQuote(next);
      hasQuote.current = true;
      try {
        const saved = localStorage.getItem("finanzas-currency");
        if (saved && Object.hasOwn(currencies, saved))
          setCurrency(saved as Currency);
      } catch {
        /* La conversión sigue funcionando sin almacenamiento local. */
      }
    } catch {
      if (request.current === controller)
        setError(
          "No se pudo actualizar. " +
            (hasQuote.current
              ? "Se conserva la última cotización consultada."
              : "Los importes siguen en MXN. Se reintentará automáticamente."),
        );
    } finally {
      window.clearTimeout(timeout);
      if (request.current === controller) setBusy(false);
    }
  }
  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => void refresh(), 5 * 60 * 1000);
    return () => {
      window.clearInterval(interval);
      request.current?.abort();
      request.current = null;
    };
  }, []);

  return (
    <CurrencyContext.Provider
      value={{ currency, rate: quote?.rates[currency] ?? 1 }}
    >
      <ControlsContext.Provider
        value={
          <details
            className="currency-menu"
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.currentTarget.open = false;
                event.currentTarget.querySelector("summary")?.focus();
              }
            }}
          >
            <summary aria-label="Cambiar moneda">
              <Globe2 size={16} aria-hidden="true" /> {currency}
            </summary>
            <div className="currency-bar">
              <label>
                Ver importes en
                <select
                  aria-label="Moneda de visualización"
                  value={currency}
                  onChange={(event) => {
                    const next = event.target.value as Currency;
                    setCurrency(next);
                    try {
                      localStorage.setItem("finanzas-currency", next);
                    } catch {
                      /* Preferencia solo para esta sesión. */
                    }
                  }}
                >
                  {Object.entries(currencies).map(([code, name]) => (
                    <option
                      key={code}
                      value={code}
                      disabled={code !== "MXN" && !quote}
                    >
                      {code} · {name}
                    </option>
                  ))}
                </select>
              </label>
              <p role="status">
                {quote ? (
                  <>
                    Referencia diaria del {quote.date} · Consultada{" "}
                    {new Date(quote.checkedAt).toLocaleTimeString("es-MX", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    . Consulta automática cada 5 minutos.{" "}
                  </>
                ) : busy ? (
                  "Consultando tipos de cambio. "
                ) : (
                  ""
                )}
                Los registros, formularios y archivos Excel siguen en MXN.
                {quote && (
                  <>
                    {" "}
                    Fuente:{" "}
                    <a
                      href="https://frankfurter.dev/"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Frankfurter
                    </a>
                    .
                  </>
                )}
              </p>
              {error && <p role="alert">{error}</p>}
            </div>
          </details>
        }
      >
        {children}
      </ControlsContext.Provider>
    </CurrencyContext.Provider>
  );
}
