import { useState, type FormEvent } from "react";
import { Sun, Moon, Monitor, ShieldCheck } from "lucide-react";
import type { Category } from "../lib/finance";
import type { Context } from "../lib/types";
import { supabase } from "../lib/supabase";
import { Button } from "../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog";
export function Configuration({
  theme,
  setTheme,
  categories,
  write,
  enabled,
}: {
  theme: string;
  setTheme: (t: string) => void;
  categories: Category[];
  write: Context["write"];
  enabled: boolean;
}) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [renaming, setRenaming] = useState<Category | null>(null);
  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget,
      d = new FormData(form);
    setBusy(true);
    setError("");
    try {
      await write("categories", {
        name: String(d.get("name")).trim(),
        kind: d.get("kind"),
      });
      form.reset();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="settings-grid">
      <section className="card">
        <h2>A tu manera</h2>
        <p className="muted">Elige cómo quieres ver tus finanzas.</p>
        <div className="theme-options">
          {[
            ["light", "Claro", Sun],
            ["dark", "Oscuro", Moon],
            ["system", "Sistema", Monitor],
          ].map(([v, l, Icon]) => (
            <button
              key={v as string}
              className={theme === v ? "chosen" : ""}
              aria-pressed={theme === v}
              onClick={() => setTheme(v as string)}
            >
              <Icon size={23} />
              {l as string}
            </button>
          ))}
        </div>
        <h2>Conexión y privacidad</h2>
        <p className="muted">
          {supabase
            ? "Cliente de Supabase configurado."
            : "Supabase todavía no está configurado."}
        </p>
        {!supabase && (
          <ol className="instructions">
            <li>Crea un proyecto en Supabase.</li>
            <li>
              Ejecuta la migración de <code>supabase/migrations</code> en el
              editor SQL.
            </li>
            <li>
              Copia <code>.env.example</code> a <code>.env</code> y añade la URL
              y la clave pública del proyecto.
            </li>
            <li>Reinicia Vite, crea tu usuario y confirma tu correo.</li>
          </ol>
        )}
        <div className="privacy-note">
          <ShieldCheck size={20} />
          <p>
            Los registros permanecen en Supabase. El navegador solo recuerda tu
            preferencia visual. Cerrar o recargar la aplicación requiere volver
            a iniciar sesión.
          </p>
        </div>
      </section>
      <section className="card">
        <h2>Tus categorías</h2>
        <p className="muted">Una organización que se adapta a ti.</p>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <form onSubmit={add}>
          <label>
            Nombre
            <input
              name="name"
              required
              maxLength={80}
              placeholder="Nueva categoría"
            />
          </label>
          <label>
            Tipo
            <select name="kind">
              <option value="expense">Gasto</option>
              <option value="income">Ingreso</option>
            </select>
          </label>
          <Button disabled={!enabled || busy}>Agregar categoría</Button>
        </form>
        <div className="category-list">
          {categories.map((c) => (
            <div className="category-row" key={c.id}>
              <span>
                {c.name}
                <small> · {c.kind === "income" ? "Ingreso" : "Gasto"}</small>
              </span>
              <button
                onClick={() => {
                  setError("");
                  setRenaming(c);
                }}
              >
                Renombrar
              </button>
              <button
                onClick={async () => {
                  try {
                    await write("categories", { archived: !c.archived }, c.id);
                  } catch (e) {
                    setError((e as Error).message);
                  }
                }}
              >
                {c.archived ? "Activar" : "Archivar"}
              </button>
            </div>
          ))}
        </div>
      </section>
      {renaming && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open && !busy) setRenaming(null);
          }}
        >
          <DialogContent>
            <DialogTitle>Renombrar categoría</DialogTitle>
            <DialogDescription className="muted">
              El nuevo nombre también aparecerá en tus movimientos anteriores.
            </DialogDescription>
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                const name = String(
                  new FormData(event.currentTarget).get("name"),
                ).trim();
                if (!name) {
                  setError("Introduce un nombre para la categoría.");
                  return;
                }
                setBusy(true);
                setError("");
                try {
                  await write("categories", { name }, renaming.id);
                  setRenaming(null);
                } catch (e) {
                  setError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label>
                Nombre de la categoría
                <input
                  name="name"
                  required
                  maxLength={80}
                  defaultValue={renaming.name}
                />
              </label>
              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}
              <div className="dialog-actions">
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => setRenaming(null)}
                >
                  Cancelar
                </Button>
                <Button disabled={busy}>
                  {busy ? "Guardando…" : "Guardar nombre"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
