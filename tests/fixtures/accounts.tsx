import { createRoot } from "react-dom/client";
import { Accounts } from "../../src/features/accounts";
import "@fontsource-variable/manrope";
import "../../src/design.css";
const accounts = Array.from({ length: 8 }, (_, index) => ({
  id: String(index),
  name: `Cuenta de prueba ${index + 1}`,
  type: "bank",
  initial_balance: "1000.00",
  archived: false,
}));
createRoot(document.getElementById("root")!).render(
  <main>
    <h1>Cuentas de prueba</h1>
    <Accounts
      accounts={accounts}
      categories={[]}
      transactions={[]}
      write={async () => {}}
      enabled
    />
  </main>,
);
