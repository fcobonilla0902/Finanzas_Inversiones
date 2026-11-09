import { createRoot } from "react-dom/client";
import {
  CurrencyProvider,
  CurrencyControls,
} from "../../src/components/currency-provider";
import { useMoney } from "../../src/components/currency-context";
import { HistoryChart } from "../../src/components/financial";
import { Accounts } from "../../src/features/accounts";
import "@fontsource-variable/manrope";
import "../../src/design.css";
const accounts = [
  {
    id: "cash",
    name: "Efectivo de prueba",
    type: "cash",
    initial_balance: "2000.00",
    archived: false,
  },
];
function Preview() {
  const money = useMoney();
  return (
    <>
      <header className="topbar">
        <span>finanzas.</span>
        <div>
          <CurrencyControls />
        </div>
      </header>
      <main>
        <h1>Patrimonio: {money(200000)}</h1>
        <Accounts
          accounts={accounts}
          transactions={[]}
          categories={[]}
          write={async () => {}}
          enabled={false}
        />
        <HistoryChart
          accounts={accounts}
          transactions={[]}
          from="2026-11-01"
          to="2026-11-08"
        />
      </main>
    </>
  );
}
createRoot(document.getElementById("root")!).render(
  <CurrencyProvider>
    <Preview />
  </CurrencyProvider>,
);
