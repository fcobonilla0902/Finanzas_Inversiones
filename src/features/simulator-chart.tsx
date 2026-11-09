import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { ChartTooltip } from "../components/ui/chart-tooltip";
import { useReducedMotion } from "../lib/use-reduced-motion";
import { money } from "../lib/finance";

export function SimulatorChart({
  points,
}: {
  points: { year: number; value: number; contributed: number }[];
}) {
  const reduced = useReducedMotion();
  const [capital, setCapital] = useState(true),
    [gain, setGain] = useState(true);
  const data = points.map((p) => ({ ...p, gain: p.value - p.contributed }));
  return (
    <>
      <figure
        className="chart"
        aria-label="Proyección de capital aportado y ganancias estimadas"
      >
        <figcaption className="sr-only">
          Valor al final del plazo:{" "}
          {money(Math.round(points.at(-1)!.value * 100))}. Proyección sin
          garantía de resultados.
        </figcaption>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            accessibilityLayer
            margin={{ top: 10, right: 8, bottom: 5, left: 0 }}
          >
            <defs>
              <linearGradient id="projection-gain" x1="0" y1="0" x2="0" y2="1">
                <stop stopColor="var(--accent)" stopOpacity={0.45} />
                <stop offset="1" stopColor="var(--accent)" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid
              vertical={false}
              stroke="var(--border)"
              strokeDasharray="3 5"
            />
            <XAxis
              dataKey="year"
              tickFormatter={(v) => `${v} a`}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--muted)", fontSize: 10 }}
              minTickGap={25}
              dy={9}
            />
            <YAxis
              width={50}
              tickFormatter={(v) =>
                new Intl.NumberFormat("es-MX", { notation: "compact" }).format(
                  Number(v),
                )
              }
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--muted)", fontSize: 10 }}
            />
            <Tooltip
              content={<ChartTooltip multiplier={100} labelFormat="year" />}
              cursor={{ stroke: "var(--muted)", strokeDasharray: "4 4" }}
            />
            <Area
              type="monotone"
              dataKey="contributed"
              name="Capital aportado"
              stackId="total"
              stroke="var(--chart-2)"
              fill="var(--chart-2)"
              fillOpacity={0.12}
              strokeWidth={2}
              hide={!capital}
              isAnimationActive={!reduced}
              animationDuration={240}
            />
            <Area
              type="monotone"
              dataKey="gain"
              name="Ganancia estimada"
              stackId="total"
              stroke="var(--accent)"
              fill="url(#projection-gain)"
              strokeWidth={2.5}
              hide={!gain}
              isAnimationActive={!reduced}
              animationDuration={240}
            />
          </AreaChart>
        </ResponsiveContainer>
      </figure>
      <div className="chart-legend interactive-legend">
        <button aria-pressed={capital} onClick={() => setCapital(!capital)}>
          <i className="legend-dot" style={{ background: "var(--chart-2)" }} />
          Capital aportado
        </button>
        <button aria-pressed={gain} onClick={() => setGain(!gain)}>
          <i className="legend-dot" />
          Ganancia estimada
        </button>
      </div>
    </>
  );
}
