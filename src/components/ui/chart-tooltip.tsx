import { money } from "../../lib/finance";
interface Entry {
  name?: string | number;
  value?: number | string;
  color?: string;
}
export function ChartTooltip({
  active,
  payload,
  label,
  multiplier = 1,
  labelFormat,
}: {
  active?: boolean;
  payload?: Entry[];
  label?: string | number;
  multiplier?: number;
  labelFormat?: "date" | "year";
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      {label !== undefined && (
        <b>
          {labelFormat === "date" && /^\d{4}-\d{2}-\d{2}$/.test(String(label))
            ? new Intl.DateTimeFormat("es-MX", {
                day: "numeric",
                month: "long",
                year: "numeric",
              }).format(new Date(`${label}T12:00:00`))
            : labelFormat === "year"
              ? `Año ${label}`
              : label}
        </b>
      )}
      {payload.map((entry, index) => (
        <p key={`${entry.name}-${index}`}>
          <span>
            <i className="legend-dot" style={{ background: entry.color }} />
            {entry.name}
          </span>
          <strong>{money(Math.round(Number(entry.value) * multiplier))}</strong>
        </p>
      ))}
    </div>
  );
}
