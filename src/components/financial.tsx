import { useMoney } from "./currency-context";
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  ChartNoAxesCombined,
  Trash2,
  Pencil,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  cents,
  netWorth,
  spendingByCategory,
  type Account,
  type Category,
  type Transaction,
} from "../lib/finance";
import { ChartTooltip } from "./ui/chart-tooltip";
import { useReducedMotion } from "../lib/use-reduced-motion";
const today = () => new Date().toLocaleDateString("en-CA");
const colors = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
];
export function Metric({
  title,
  value,
  detail,
  icon,
  tone = "",
}: {
  title: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
  tone?: string;
}) {
  return (
    <article className={`card metric ${tone}`}>
      <div className="metric-label">
        {title}
        <span className="metric-icon">{icon}</span>
      </div>
      <strong>{value}</strong>
      <span className="metric-foot">{detail}</span>
    </article>
  );
}

export function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <ChartNoAxesCombined size={27} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}

export function HistoryChart({
  accounts,
  transactions,
  from,
  to,
}: {
  accounts: Account[];
  transactions: Transaction[];
  from: string;
  to: string;
}) {
  const money = useMoney();
  const reducedMotion = useReducedMotion();
  if (!transactions.length)
    return (
      <Empty
        title="Tu historia empieza aquí"
        text="Registra tu primer movimiento para ver cómo evoluciona tu patrimonio."
      />
    );
  const dates = [
    ...new Set([
      from || today(),
      ...transactions
        .map((t) => t.date)
        .filter((d) => (!from || d >= from) && (!to || d <= to)),
      to || today(),
    ]),
  ].sort();
  const data = dates.map((date) => ({
    date,
    value:
      netWorth(
        accounts,
        transactions.filter((t) => t.date <= date),
      ) / 100,
  }));
  return (
    <figure
      className="chart"
      aria-label="Evolución del patrimonio en pesos mexicanos"
    >
      <figcaption className="sr-only">
        Patrimonio al inicio: {money(Math.round(data[0].value * 100))}.
        Patrimonio al final: {money(Math.round(data.at(-1)!.value * 100))}. Usa
        las flechas del teclado para explorar los puntos.
      </figcaption>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          accessibilityLayer
          margin={{ top: 12, right: 12, bottom: 0, left: 0 }}
        >
          <defs>
            <linearGradient id="wealth" x1="0" y1="0" x2="0" y2="1">
              <stop stopColor="var(--accent)" stopOpacity={0.23} />
              <stop offset="1" stopColor="var(--accent)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            vertical={false}
            stroke="var(--border)"
            strokeDasharray="3 5"
          />
          <XAxis
            dataKey="date"
            tickFormatter={(v) =>
              new Intl.DateTimeFormat("es-MX", {
                day: "numeric",
                month: "short",
              }).format(new Date(`${v}T12:00:00`))
            }
            tick={{ fill: "var(--muted)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            minTickGap={30}
            dy={10}
          />
          <YAxis
            tick={{ fill: "var(--muted)", fontSize: 10 }}
            width={80}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => money(Number(v) * 100, true)}
          />
          <Tooltip
            content={<ChartTooltip multiplier={100} labelFormat="date" />}
            cursor={{ stroke: "var(--accent)", strokeDasharray: "4 4" }}
          />
          <Area
            type="monotone"
            dataKey="value"
            name="Patrimonio"
            stroke="var(--accent)"
            strokeWidth={3}
            fill="url(#wealth)"
            isAnimationActive={!reducedMotion}
            animationDuration={240}
            activeDot={{ r: 5, stroke: "var(--surface)", strokeWidth: 3 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </figure>
  );
}

export function Spending({
  transactions,
  categories,
  totalLabel = "Gastos del periodo",
}: {
  transactions: Transaction[];
  categories: Category[];
  totalLabel?: string;
}) {
  const money = useMoney();
  const reducedMotion = useReducedMotion();
  const data = spendingByCategory(transactions, categories);
  if (!data.length)
    return (
      <Empty
        title="Un lugar para cada gasto"
        text="Descubre tus hábitos al registrar gastos por categoría."
      />
    );
  const total = data.reduce((sum, category) => sum + category.value, 0);
  return (
    <>
      <div className="spending-total">
        {totalLabel}
        <strong>{money(total)}</strong>
      </div>
      <div
        style={{ height: 180 }}
        role="img"
        aria-label="Distribución de gastos; desglose detallado debajo de la gráfica"
      >
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              innerRadius={54}
              outerRadius={78}
              paddingAngle={4}
              dataKey="value"
              stroke="var(--surface)"
              strokeWidth={3}
              isAnimationActive={!reducedMotion}
              animationDuration={240}
            >
              {data.map((d, i) => (
                <Cell
                  key={d.id ?? "uncategorized"}
                  fill={colors[i % colors.length]}
                />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      {data.map((d, i) => (
        <div className="category-row" key={d.id ?? "uncategorized"}>
          <span className="spending-category">
            <i
              className="legend-dot"
              style={{ background: colors[i % colors.length] }}
            />
            {d.name}
            <small>
              {new Intl.NumberFormat("es-MX", {
                style: "percent",
                maximumFractionDigits: 1,
              }).format(d.value / total)}
            </small>
          </span>
          <b>{money(d.value)}</b>
        </div>
      ))}
    </>
  );
}

export function MovementList({
  transactions,
  accounts,
  categories,
  edit,
  remove,
  showCreditDetails = false,
  installmentProgress,
}: {
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  edit?: (t: Transaction) => void;
  remove?: (t: Transaction) => void;
  showCreditDetails?: boolean;
  installmentProgress?: Map<string, number>;
}) {
  const money = useMoney();
  if (!transactions.length)
    return (
      <Empty
        title="Todo comienza con un movimiento"
        text="Crea una cuenta y registra tu primer ingreso o gasto."
      />
    );
  return (
    <div className="movement-list">
      {transactions.map((t) => {
        const creditExpense =
          showCreditDetails &&
          t.kind === "expense" &&
          accounts.find((a) => a.id === t.account_id)?.type === "credit";
        const months = t.installment_months || 1,
          paid = installmentProgress?.get(t.id) ?? t.installments_paid ?? 0;
        return (
          <div className="movement" key={t.id}>
            <span className={`movement-icon ${t.kind}`}>
              {t.kind === "income" ? (
                <ArrowDownLeft size={19} />
              ) : t.kind === "expense" ? (
                <ArrowUpRight size={19} />
              ) : (
                <ArrowLeftRight size={19} />
              )}
            </span>
            <div className="movement-description">
              <div className="movement-title">
                <b>{t.description}</b>
                {creditExpense && (
                  <span
                    className={`payment-badge ${months > 1 ? "installments" : "outright"}`}
                  >
                    {months > 1 ? `A ${months} meses` : "De contado"}
                  </span>
                )}
              </div>
              <small>
                {categories.find((c) => c.id === t.category_id)?.name ||
                  (t.kind === "transfer"
                    ? "Transferencia"
                    : "Sin categoría")}{" "}
                · {accounts.find((a) => a.id === t.account_id)?.name}
                <span> · {t.date}</span>
              </small>
              {creditExpense && months > 1 && (
                <p className="movement-credit-progress">
                  Pagados: {paid} de {months} ·{" "}
                  {paid >= months
                    ? "Liquidada"
                    : `Siguiente: mes ${paid + 1} de ${months}`}
                </p>
              )}
            </div>
            <strong className={t.kind === "income" ? "positive" : ""}>
              {t.kind === "income" ? "+" : t.kind === "expense" ? "−" : ""}
              {money(cents(t.amount))}
            </strong>
            {(edit || remove) && (
              <div className="movement-actions">
                {edit && !t.credit_payment_month && (
                  <button
                    aria-label={`Editar ${t.description}`}
                    onClick={() => edit(t)}
                  >
                    <Pencil size={16} />
                  </button>
                )}
                {remove && (
                  <button
                    aria-label={`Eliminar ${t.description}`}
                    onClick={() => remove(t)}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
