import { useMoney } from "../components/currency-context";
import { useState } from "react";
import { ChartNoAxesCombined } from "lucide-react";
import { SimulatorChart } from "./simulator-chart";
import { compound } from "../lib/finance";
export function Simulator() {
  const money = useMoney();
  const [initial, setInitial] = useState(10000),
    [monthly, setMonthly] = useState(1000),
    [rate, setRate] = useState(8),
    [years, setYears] = useState(10),
    [frequency, setFrequency] = useState(12);
  const points = compound(initial, monthly, rate / 100, years, frequency),
    last = points.at(-1)!;
  return (
    <>
      <div className="setup-banner">
        <ChartNoAxesCombined />
        <div>
          <strong>Proyecta tu próximo capítulo</strong>
          <p>
            Explora lo que podrías construir. Los importes del simulador son
            supuestos, no saldos de tus cuentas.
          </p>
        </div>
      </div>
      <div className="settings-grid simulator-layout">
        <section className="card simulator-controls">
          <h2>Simulador de interés compuesto</h2>
          <p className="muted">
            Aportaciones al final de cada mes. Tasa nominal anual constante.
          </p>
          <div className="investment-fields">
            {[
              ["Capital inicial en MXN", initial, setInitial, 0, 100000000],
              ["Aportación mensual en MXN", monthly, setMonthly, 0, 1000000],
              ["Tasa nominal anual (%)", rate, setRate, 0, 100],
              ["Plazo en años", years, setYears, 1, 50],
            ].map(([label, value, set, min, max]) => (
              <label key={String(label)}>
                {String(label)}
                <input
                  type="number"
                  inputMode={label === "Plazo en años" ? "numeric" : "decimal"}
                  name={String(label)}
                  autoComplete="off"
                  value={value as number}
                  min={min as number}
                  max={max as number}
                  step={label === "Tasa nominal anual (%)" ? "0.1" : "1"}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    (set as (v: number) => void)(
                      Math.max(
                        Number(min),
                        Math.min(
                          Number(max),
                          Number.isFinite(n)
                            ? label === "Plazo en años"
                              ? Math.floor(n)
                              : n
                            : 0,
                        ),
                      ),
                    );
                  }}
                />
              </label>
            ))}
          </div>
          <div className="slider-grid">
            <label>
              Explora una tasa anual <span>{rate}%</span>
              <input
                aria-label="Ajustar tasa anual"
                type="range"
                min={0}
                max={100}
                step={0.5}
                value={rate}
                onChange={(e) => setRate(Number(e.target.value))}
              />
            </label>
            <label>
              Tu horizonte <span>{years} años</span>
              <input
                aria-label="Ajustar plazo"
                type="range"
                min={1}
                max={50}
                value={years}
                onChange={(e) => setYears(Number(e.target.value))}
              />
            </label>
          </div>
          <label>
            Capitalización
            <select
              name="frequency"
              value={frequency}
              onChange={(e) => setFrequency(Number(e.target.value))}
            >
              <option value={1}>Anual</option>
              <option value={4}>Trimestral</option>
              <option value={12}>Mensual</option>
              <option value={365}>Diaria</option>
            </select>
          </label>
          <p className="muted">
            Estimación educativa, sin comisiones, impuestos ni inflación. Las
            proyecciones no garantizan resultados.
          </p>
        </section>
        <section className="card simulator-result">
          <p className="eyebrow">Valor futuro estimado</p>
          <h2 className="big-number">{money(Math.round(last.value * 100))}</h2>
          <p className="projection-caption">
            Tu proyección a {years} {years === 1 ? "año" : "años"}
          </p>
          <div className="projection-breakdown">
            <div className="category-row">
              <span>Capital aportado</span>
              <b>{money(Math.round(last.contributed * 100))}</b>
            </div>
            <div className="category-row">
              <span>Ganancia estimada</span>
              <b className="positive">
                {money(Math.round((last.value - last.contributed) * 100))}
              </b>
            </div>
          </div>
          <SimulatorChart points={points} />
        </section>
      </div>
    </>
  );
}
