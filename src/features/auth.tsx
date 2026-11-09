import { useState } from "react";
import { ChartNoAxesCombined, ShieldCheck, ArrowUpRight } from "lucide-react";
import { supabase } from "../lib/supabase";
import { Button } from "../components/ui/button";
import { PasswordInput } from "../components/ui/password-input";
export function Auth() {
  const [mode, setMode] = useState<"login" | "signup" | "reset">("login"),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <main className="auth">
      <div className="auth-intro">
        <span className="brand">
          <span className="brand-mark">
            <ChartNoAxesCombined />
          </span>
          finanzas
        </span>
        <p className="eyebrow">MENOS INCERTIDUMBRE. MÁS DIRECCIÓN.</p>
        <h1>
          Haz espacio para
          <br />
          tu futuro.
        </h1>
        <p>
          Conoce tu dinero. Entiende tus hábitos.
          <br />
          Construye lo que sigue, a tu ritmo.
        </p>
        <div className="privacy">
          <ShieldCheck />
          <span>Un espacio privado, solo para ti.</span>
        </div>
      </div>
      <section className="card auth-card">
        <h2>
          {mode === "signup"
            ? "Crea tu espacio"
            : mode === "reset"
              ? "Recupera tu acceso"
              : "Qué bueno tenerte aquí"}
        </h2>
        <p className="muted">
          {mode === "login"
            ? "Inicia sesión para continuar."
            : "Te enviaremos las instrucciones por correo."}
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            setMessage("");
            const d = new FormData(e.currentTarget);
            const email = String(d.get("email")),
              password = String(d.get("password"));
            try {
              const result =
                mode === "login"
                  ? await supabase!.auth.signInWithPassword({ email, password })
                  : mode === "signup"
                    ? await supabase!.auth.signUp({ email, password })
                    : await supabase!.auth.resetPasswordForEmail(email);
              if (result.error) throw result.error;
              if (mode === "signup")
                setMessage("Revisa tu correo para confirmar tu cuenta.");
              if (mode === "reset")
                setMessage(
                  "Si existe una cuenta, recibirás un correo. Abre el enlace en este dispositivo para establecer una nueva contraseña.",
                );
            } catch (e) {
              setError((e as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Correo electrónico
            <input
              autoComplete="email"
              type="email"
              name="email"
              required
              placeholder="nombre@ejemplo.com"
              spellCheck={false}
              autoCapitalize="none"
            />
          </label>
          {mode !== "reset" && (
            <div className="auth-field">
              <label htmlFor="auth-password">Contraseña</label>
              <PasswordInput
                key={mode}
                id="auth-password"
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                name="password"
                placeholder={
                  mode === "signup"
                    ? "Mínimo 8 caracteres"
                    : "Introduce tu contraseña"
                }
                minLength={8}
                required
              />
            </div>
          )}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          {message && (
            <p role="status" className="positive">
              {message}
            </p>
          )}
          <Button disabled={busy}>
            {busy
              ? "Un momento…"
              : mode === "login"
                ? "Entrar a mis finanzas"
                : mode === "signup"
                  ? "Crear cuenta"
                  : "Enviar correo"}
            <ArrowUpRight size={17} />
          </Button>
        </form>
        <button
          className="auth-link"
          onClick={() => {
            setMode(mode === "signup" ? "login" : "signup");
            setMessage("");
            setError("");
          }}
        >
          {mode === "signup" ? "Ya tengo cuenta" : "Crear una cuenta"}
        </button>
        <button
          className="auth-link"
          onClick={() => setMode(mode === "reset" ? "login" : "reset")}
        >
          {mode === "reset"
            ? "Volver al inicio de sesión"
            : "¿Olvidaste tu contraseña?"}
        </button>
      </section>
    </main>
  );
}

export function PasswordRecovery({ done }: { done: () => void }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <main className="auth">
      <section className="card auth-card">
        <h1>Nueva contraseña</h1>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            const data = new FormData(e.currentTarget);
            const password = String(data.get("password"));
            if (password !== data.get("confirmation")) {
              setError("Las contraseñas no coinciden.");
              setBusy(false);
              return;
            }
            const { error } = await supabase!.auth.updateUser({ password });
            setBusy(false);
            if (error) setError(error.message);
            else done();
          }}
        >
          <div className="auth-field">
            <label htmlFor="new-password">Contraseña nueva</label>
            <PasswordInput
              id="new-password"
              name="password"
              placeholder="Mínimo 8 caracteres"
              minLength={8}
              autoComplete="new-password"
              required
            />
          </div>
          <div className="auth-field">
            <label htmlFor="confirm-password">Repite tu contraseña</label>
            <PasswordInput
              id="confirm-password"
              name="confirmation"
              placeholder="Repite la nueva contraseña"
              visibilityLabel="confirmación de contraseña"
              minLength={8}
              autoComplete="new-password"
              required
            />
          </div>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <Button disabled={busy}>
            {busy ? "Guardando…" : "Cambiar contraseña"}
          </Button>
        </form>
      </section>
    </main>
  );
}
