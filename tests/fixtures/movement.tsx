// Datos sintéticos exclusivos de pruebas; no se importan en la aplicación ni se envían a Supabase.
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { MovementDialog } from "../../src/features/movements";
import { Button } from "../../src/components/ui/button";
import { ConfirmDialog } from "../../src/components/ui/confirm-dialog";
import "@fontsource-variable/manrope";
import "../../src/design.css";
const accounts = [
  {
    id: "test-cash",
    name: "Cuenta de prueba",
    type: "cash",
    initial_balance: "0.00",
    archived: false,
  },
  {
    id: "test-bank",
    name: "Destino de prueba",
    type: "bank",
    initial_balance: "0.00",
    archived: false,
  },
];
const categories = [
  {
    id: "test-food",
    name: "Categoría de prueba",
    kind: "expense" as const,
    archived: false,
  },
  {
    id: "test-income",
    name: "Ingreso de prueba",
    kind: "income" as const,
    archived: false,
  },
];
function Harness() {
  const [open, setOpen] = useState(false),
    [saved, setSaved] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  return (
    <main>
      <h1>Formulario aislado</h1>
      <p>Datos sintéticos. Sin persistencia ni conexiones.</p>
      <Button onClick={() => setOpen(true)}>Abrir formulario</Button>
      <Button variant="outline" onClick={() => setConfirmOpen(true)}>
        Abrir confirmación
      </Button>
      {confirmOpen && (
        <ConfirmDialog
          description="Movimiento sintético"
          close={() => setConfirmOpen(false)}
          confirm={async () => {
            setSaved("Eliminación sintética confirmada");
            setConfirmOpen(false);
          }}
        />
      )}
      {open && (
        <MovementDialog
          accounts={accounts}
          categories={categories}
          editing={null}
          close={() => setOpen(false)}
          save={async (data) => {
            setSaved(JSON.stringify(data));
            setOpen(false);
          }}
        />
      )}
      <output aria-label="Resultado de prueba">{saved}</output>
    </main>
  );
}
document.documentElement.dataset.theme = matchMedia(
  "(prefers-color-scheme: dark)",
).matches
  ? "dark"
  : "light";
createRoot(document.getElementById("root")!).render(<Harness />);
