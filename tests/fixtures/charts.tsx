// Fixtures sintéticos, exclusivos de QA. No entran en el bundle de producción.
import { createRoot } from "react-dom/client";
import {
  HistoryChart,
  Spending,
  MovementList,
  Metric,
} from "../../src/components/financial";
import type { Transaction } from "../../src/lib/finance";
import "@fontsource-variable/manrope";
import "../../src/design.css";
const accounts = [
  {
    id: "test-cash",
    name: "Cuenta de prueba",
    type: "cash",
    initial_balance: "10000.00",
    archived: false,
  },
];
const categories = [
  {
    id: "test-food",
    name: "Alimentación de prueba",
    kind: "expense" as const,
    archived: false,
  },
  {
    id: "test-health",
    name: "Salud de prueba",
    kind: "expense" as const,
    archived: false,
  },
];
const transactions: Transaction[] = [
  {
    id: "1",
    kind: "income",
    amount: "12000.00",
    date: "2026-10-01",
    description: "Ingreso sintético de QA",
    account_id: "test-cash",
    destination_id: null,
    category_id: null,
  },
  {
    id: "2",
    kind: "expense",
    amount: "1250.00",
    date: "2026-10-05",
    description: "Gasto sintético de QA",
    account_id: "test-cash",
    destination_id: null,
    category_id: "test-food",
  },
  {
    id: "3",
    kind: "expense",
    amount: "450.00",
    date: "2026-10-10",
    description: "Otro gasto sintético de QA",
    account_id: "test-cash",
    destination_id: null,
    category_id: "test-health",
  },
  {
    id: "4",
    kind: "income",
    amount: "2000.00",
    date: "2026-10-15",
    description: "Segundo ingreso de QA",
    account_id: "test-cash",
    destination_id: null,
    category_id: null,
  },
];
document.documentElement.dataset.theme = matchMedia(
  "(prefers-color-scheme: dark)",
).matches
  ? "dark"
  : "light";
createRoot(document.getElementById("root")!).render(
  <main>
    <h1>Gráficas · QA</h1>
    <p className="muted">
      Fixtures sintéticos. Sin datos ni conexiones reales.
    </p>
    <div className="metrics" style={{ marginTop: 24 }}>
      {["Disponible de prueba", "Ingresos de prueba", "Gastos de prueba"].map(
        (title) => (
          <Metric
            key={title}
            title={title}
            value="$123,456.78"
            detail="Fixture de importe largo"
            icon={<span />}
          />
        ),
      )}
    </div>
    <div className="chart-grid" style={{ marginTop: 24 }}>
      <section className="card chart-card">
        <h2>Patrimonio de prueba</h2>
        <HistoryChart
          accounts={accounts}
          transactions={transactions}
          from="2026-10-01"
          to="2026-10-31"
        />
      </section>
      <section className="card">
        <h2>Gastos de prueba</h2>
        <Spending transactions={transactions} categories={categories} />
      </section>
    </div>
    <section className="card">
      <h2>Movimientos de prueba</h2>
      <MovementList
        transactions={transactions}
        accounts={accounts}
        categories={categories}
        edit={() => {}}
        remove={() => {}}
      />
    </section>
  </main>,
);
