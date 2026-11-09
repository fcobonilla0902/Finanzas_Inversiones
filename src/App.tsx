import { useMoney } from "./components/currency-context";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { NavLink, Route, Routes, useLocation } from "react-router-dom";
import {
  ArrowUpRight,
  ArrowDownLeft,
  Plus,
  LayoutDashboard,
  Wallet,
  ChartNoAxesCombined,
  Settings,
  ListFilter,
  LogOut,
  ShieldCheck,
  ChevronRight,
  CircleHelp,
  Sun,
  ArrowRight,
  Moon,
  Target,
} from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import { readAll } from "./lib/repository";
import { monthlyOutlook } from "./lib/monthly-outlook";
import {
  balance,
  netWorth,
  totals,
  type Account,
  type Category,
  type Transaction,
  type SavingsGoal,
  type SavingsPlan,
  type CreditPeriodPayment,
} from "./lib/finance";
import { Button } from "./components/ui/button";
import { ConfirmDialog } from "./components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "./components/ui/dialog";
import {
  Metric,
  Empty,
  HistoryChart,
  MovementList,
} from "./components/financial";
import { Movements, MovementDialog } from "./features/movements";
import { Accounts } from "./features/accounts";
import { InvestmentReturns } from "./components/investment-returns";
import { CreditDebtSummary, GoalsPreview } from "./components/savings-summary";
import { MonthlyOutlook } from "./components/monthly-outlook";
import { SpendingPeriods } from "./components/spending-periods";
import { Goals } from "./features/goals";
import { Installments } from "./features/installments";
import { Configuration } from "./features/settings";
import { Auth, PasswordRecovery } from "./features/auth";
import { useContext } from "react";
import { CurrencyContext } from "./components/currency-context";
import { CurrencyControls } from "./components/currency-provider";

const Simulator = lazy(() =>
  import("./features/investments").then((module) => ({
    default: module.Simulator,
  })),
);

const nav = [
  ["/", "Inicio", LayoutDashboard],
  ["/movimientos", "Movimientos", ListFilter],
  ["/compras-a-meses", "Compras con tarjeta de crédito", ListFilter],
  ["/inversiones", "Inversiones", ChartNoAxesCombined],
  ["/cuentas", "Cuentas", Wallet],
  ["/metas", "Metas", Target],
  ["/configuracion", "Configuración", Settings],
] as const;
const today = () => new Date().toLocaleDateString("en-CA");
const scrollToTop = () =>
  window.scrollTo({ top: 0, left: 0, behavior: "instant" });
const pageDescriptions: Record<string, string> = {
  "/compras-a-meses":
    "Consulta compras con tarjeta de crédito, de contado y a meses, y sus pagos pendientes.",
  "/": "Patrimonio, actividad y ahorro en un solo lugar.",
  "/movimientos": "Consulta, filtra y organiza tus ingresos y gastos.",
  "/inversiones": "Explora el efecto del tiempo y tus aportaciones.",
  "/cuentas": "Controla los saldos de tus cuentas, ahorros y tarjetas.",
  "/configuracion": "Personaliza tu espacio, categorías y preferencias.",
  "/metas": "Define tu próximo objetivo y estima el camino para alcanzarlo.",
};

function App() {
  const { currency } = useContext(CurrencyContext);
  const money = useMoney();
  const generation = useRef(0);
  const [dataReady, setDataReady] = useState(false);
  const [recovery, setRecovery] = useState(false);
  const [session, setSession] = useState<Session | null>(null),
    [authReady, setAuthReady] = useState(!supabase);
  const [accounts, setAccounts] = useState<Account[]>([]),
    [categories, setCategories] = useState<Category[]>([]),
    [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [savingsPlan, setSavingsPlan] = useState<SavingsPlan>();
  const [loading, setLoading] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [modal, setModal] = useState(false),
    [editing, setEditing] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState<Transaction | null>(null);
  const [recordHelp, setRecordHelp] = useState(false);
  const [theme, setTheme] = useState(
    () => localStorage.getItem("finanzas-theme") || "system",
  );
  const [resolvedTheme, setResolvedTheme] = useState(
    () => document.documentElement.dataset.theme || "light",
  );
  const [period, setPeriod] = useState("month"),
    [from, setFrom] = useState(""),
    [to, setTo] = useState("");
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const resolved =
        theme === "system" ? (media.matches ? "dark" : "light") : theme;
      document.documentElement.dataset.theme = resolved;
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute("content", resolved === "dark" ? "#0c1724" : "#f2f5f8");
      setResolvedTheme(resolved);
    };
    apply();
    localStorage.setItem("finanzas-theme", theme);
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [theme]);
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data, error }) => {
      if (error) setError(error.message);
      setSession(data.session);
      setAuthReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      generation.current++;
      setDataReady(false);
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      setSession(s);
      setAccounts([]);
      setCategories([]);
      setTransactions([]);
      setGoals([]);
      setSavingsPlan(undefined);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  async function load() {
    if (!supabase || !session) return;
    const request = ++generation.current;
    setLoading(true);
    setError("");
    try {
      const [accountRows, categoryRows, transactionRows, goalRows, planRows] =
        await Promise.all([
          readAll("accounts", session.user.id),
          readAll("categories", session.user.id),
          readAll("transactions", session.user.id),
          readAll("savings_goals", session.user.id),
          readAll("savings_plans", session.user.id),
        ]);
      if (request !== generation.current) return;
      setAccounts(
        accountRows.map((a) => ({
          ...a,
          initial_balance: String(a.initial_balance),
          annual_return_rate:
            a.annual_return_rate == null ? null : String(a.annual_return_rate),
        })) as unknown as Account[],
      );
      setCategories(categoryRows as unknown as Category[]);
      setGoals(
        goalRows.map((goal) => ({
          ...goal,
          target_amount: String(goal.target_amount),
          saved_amount: String(goal.saved_amount),
        })) as unknown as SavingsGoal[],
      );
      const planRow = planRows[0];
      setSavingsPlan(
        planRow
          ? ({
              ...planRow,
              monthly_income:
                planRow.monthly_income == null
                  ? null
                  : String(planRow.monthly_income),
              monthly_expenses:
                planRow.monthly_expenses == null
                  ? null
                  : String(planRow.monthly_expenses),
            } as unknown as SavingsPlan)
          : undefined,
      );
      setDataReady(true);
      setTransactions(
        transactionRows
          .sort((a, b) => String(b.date).localeCompare(String(a.date)))
          .map((t) => ({
            ...t,
            amount: String(t.amount),
          })) as unknown as Transaction[],
      );
    } catch (e) {
      if (request !== generation.current) return;
      setError(
        e instanceof Error
          ? e.message
          : "No se pudieron cargar los datos. Comprueba la conexión y las migraciones.",
      );
    } finally {
      if (request === generation.current) setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, [session]);
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(id);
  }, [notice]);
  const location = useLocation();
  useEffect(() => {
    setError("");
    scrollToTop();
  }, [location.pathname]);
  async function write(
    table: string,
    data: Record<string, unknown>,
    id?: string,
  ) {
    if (!supabase || !session)
      throw Error("Conecta Supabase e inicia sesión para guardar.");
    const query = id
      ? supabase.from(table).update(data).eq("id", id)
      : supabase.from(table).insert({ ...data, user_id: session.user.id });
    const { error } = await query;
    if (error) throw Error(error.message);
    await load();
    setNotice("Cambios guardados.");
  }
  function remove(t: Transaction) {
    setDeleting(t);
  }
  async function payCreditCard(payment: CreditPeriodPayment) {
    if (!supabase || !session)
      throw Error("Inicia sesión para registrar el pago.");
    const { error } = await supabase.rpc("record_credit_period_payment", {
      p_card: payment.cardId,
      p_source: payment.sourceId,
      p_month: `${payment.month}-01`,
      p_paid_on: payment.paidOn,
      p_expected_amount: payment.expectedAmount,
    });
    if (error) throw Error(error.message);
    await load();
    setNotice("Pago registrado. Saldos y avance de las compras actualizados.");
  }
  async function confirmRemove() {
    if (!deleting || !supabase) return;
    const { error } = await supabase
      .from("transactions")
      .delete()
      .eq("id", deleting.id);
    if (error) throw Error(error.message);
    else {
      await load();
      setNotice("Movimiento eliminado.");
      setDeleting(null);
    }
  }
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  if (period === "year") start.setMonth(0);
  if (period === "week")
    start.setTime(
      new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6).getTime(),
    );
  const filtered = transactions.filter(
    (t) =>
      t.date >=
        (period === "custom"
          ? from || "0000"
          : start.toLocaleDateString("en-CA")) &&
      t.date <= (period === "custom" ? to || today() : today()),
  );
  const stats = totals(filtered),
    worth = netWorth(accounts, transactions),
    available = accounts
      .filter((a) => !["investment", "credit"].includes(a.type))
      .reduce((s, a) => s + balance(a, transactions), 0);
  const context = { accounts, categories, transactions, write };
  const canRecord = !!session && accounts.some((a) => !a.archived);
  const editingProgress = editing
    ? monthlyOutlook(accounts, transactions).purchases.find(
        (p) => p.id === editing.id,
      )
    : undefined;
  function quickRecord(kind: "income" | "expense") {
    setEditing(null);
    setQuickKind(kind);
    if (!canRecord) {
      setRecordHelp(true);
      return;
    }
    setModal(true);
  }
  function editMovement(transaction: Transaction) {
    setEditing(transaction);
    setModal(true);
  }
  const [quickKind, setQuickKind] = useState<"income" | "expense">("expense");
  if (!authReady)
    return (
      <div className="auth">
        <p role="status">Preparando tu espacio seguro…</p>
      </div>
    );
  if (supabase && !session) return <Auth />;
  if (recovery && session)
    return <PasswordRecovery done={() => setRecovery(false)} />;
  return (
    <div className="app">
      <a className="skip-link" href="#main-content">
        Saltar al contenido
      </a>
      <aside className="sidebar">
        <NavLink to="/" className="brand" onClick={scrollToTop}>
          <span className="brand-mark">
            <ChartNoAxesCombined size={23} />
          </span>
          finanzas
        </NavLink>
        <div className="workspace-label">Espacio personal</div>
        <nav aria-label="Navegación principal">
          {nav.map(([path, label, Icon]) => (
            <NavLink
              key={path}
              to={path}
              end
              className={({ isActive }) =>
                isActive ? "nav-item active" : "nav-item"
              }
            >
              <Icon size={19} />
              <span>{label}</span>
              {path === "/" && <span className="active-dot" />}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="privacy">
            <ShieldCheck size={20} />
            <p>
              Tu tranquilidad, primero
              <small>Datos privados y bajo tu control</small>
            </p>
          </div>
          <div className="profile">
            <span className="avatar">
              {session?.user.email?.slice(0, 2).toUpperCase() || "FI"}
            </span>
            <p>
              Mi espacio
              <small>{session?.user.email || "Pendiente de conectar"}</small>
            </p>
            {session && (
              <button
                aria-label="Cerrar sesión"
                onClick={() => void supabase?.auth.signOut()}
              >
                <LogOut size={18} />
              </button>
            )}
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <NavLink to="/" className="mobile-brand" onClick={scrollToTop}>
            finanzas
          </NavLink>
          <span className="desktop-tagline">Tu dinero, con claridad.</span>
          <div>
            <span className={`connection-status ${session ? "connected" : ""}`}>
              <i />
              {session ? "Espacio privado" : "Sin conectar"}
            </span>
            <CurrencyControls />
            <button
              aria-label={
                resolvedTheme === "dark"
                  ? "Activar modo claro"
                  : "Activar modo oscuro"
              }
              onClick={() =>
                setTheme(resolvedTheme === "dark" ? "light" : "dark")
              }
            >
              {resolvedTheme === "dark" ? (
                <Sun size={18} />
              ) : (
                <Moon size={18} />
              )}
            </button>
            <NavLink
              className="mobile-settings"
              to="/configuracion"
              aria-label="Configuración"
            >
              <Settings size={18} aria-hidden="true" />
            </NavLink>
          </div>
        </header>
        <main id="main-content" tabIndex={-1}>
          <div className="page-heading">
            <div>
              <h1>
                {nav.find(([p]) => p === location.pathname)?.[1] ||
                  "Página no encontrada"}
              </h1>
              <p className="muted">
                {pageDescriptions[location.pathname] ||
                  "Vuelve a tu espacio financiero desde la navegación."}
              </p>
            </div>
            {location.pathname === "/metas" ? (
              <a
                href="#goal-form"
                className="button primary"
                aria-label="Nueva meta"
              >
                <Plus size={18} aria-hidden="true" />
                <span>Nueva meta</span>
              </a>
            ) : ["/movimientos", "/compras-a-meses"].includes(
                location.pathname,
              ) ? (
              <Button
                aria-label="Nuevo movimiento"
                onClick={() => quickRecord("expense")}
              >
                <Plus size={18} aria-hidden="true" />
                <span>Nuevo movimiento</span>
              </Button>
            ) : null}
          </div>
          {!supabase && location.pathname === "/" && (
            <div className="setup-banner">
              <span className="setup-icon">
                <ShieldCheck size={22} />
              </span>
              <div>
                <strong>Un espacio para lo que viene.</strong>
                <p>
                  Conecta tu cuenta para empezar. Tu información financiera será
                  privada.
                </p>
              </div>
              <NavLink to="/configuracion">
                Conectar mi espacio <ArrowRight size={16} />
              </NavLink>
            </div>
          )}
          {error && (
            <div className="error" role="alert">
              {error}
              <button onClick={() => void load()}>Reintentar</button>
            </div>
          )}
          {loading && <p role="status">Actualizando tus finanzas…</p>}
          <Routes>
            <Route
              path="/"
              element={
                <>
                  <div className="section-toolbar">
                    <h2>
                      Vista general <span className="live-dot" />
                    </h2>
                    <div className="segmented">
                      {[
                        ["week", "Semana"],
                        ["month", "Mes"],
                        ["year", "Año"],
                        ["custom", "Personalizado"],
                      ].map(([v, l]) => (
                        <button
                          key={v}
                          aria-pressed={period === v}
                          className={period === v ? "selected" : ""}
                          onClick={() => setPeriod(v)}
                        >
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                  {period === "custom" && (
                    <div className="date-range">
                      <label>
                        Desde
                        <input
                          type="date"
                          value={from}
                          onChange={(e) => setFrom(e.target.value)}
                        />
                      </label>
                      <label>
                        Hasta
                        <input
                          type="date"
                          min={from}
                          value={to}
                          onChange={(e) => setTo(e.target.value)}
                        />
                      </label>
                    </div>
                  )}
                  <div className="overview-grid">
                    <article className="card wealth">
                      <div className="metric-label">
                        <span className="wealth-label">
                          <Wallet size={18} /> Tu patrimonio neto
                        </span>
                        <span className="wealth-currency">{currency}</span>
                      </div>
                      <strong className={!dataReady ? "pending-value" : ""}>
                        {dataReady ? money(worth) : "—"}
                      </strong>
                      <span className="metric-foot">
                        {dataReady
                          ? "Todo lo que tienes, menos lo que debes."
                          : "Tu siguiente capítulo empieza con claridad."}
                      </span>
                      <div className="wealth-actions">
                        <button onClick={() => quickRecord("expense")}>
                          <Plus size={17} />
                          Registrar gasto
                        </button>
                        <button onClick={() => quickRecord("income")}>
                          <ArrowDownLeft size={17} />
                          Registrar ingreso
                        </button>
                      </div>
                    </article>
                  </div>
                  <div className="metrics">
                    <Metric
                      title="Dinero disponible"
                      value={dataReady ? money(available) : "—"}
                      detail="Efectivo, bancos y ahorro"
                      icon={<Wallet size={18} />}
                    />
                    <Metric
                      title="Ingresos del periodo"
                      value={dataReady ? money(stats.income) : "—"}
                      detail="Entradas registradas"
                      icon={<ArrowDownLeft size={18} />}
                      tone="green"
                    />
                    <Metric
                      title="Gastos del periodo"
                      value={dataReady ? money(stats.expense) : "—"}
                      detail="Salidas registradas"
                      icon={<ArrowUpRight size={18} />}
                      tone="orange"
                    />
                  </div>
                  <div className="planning-grid">
                    <CreditDebtSummary
                      accounts={accounts}
                      transactions={transactions}
                      ready={dataReady}
                    />
                    <GoalsPreview
                      accounts={accounts}
                      goals={goals}
                      plan={savingsPlan}
                      transactions={transactions}
                    />
                  </div>
                  <InvestmentReturns
                    accounts={accounts}
                    transactions={transactions}
                  />
                  <div className="chart-grid">
                    <section className="card chart-card">
                      <div className="card-heading">
                        <div>
                          <h2>El camino de tu patrimonio</h2>
                          <p className="muted">
                            Así evoluciona lo que estás construyendo
                          </p>
                        </div>
                        <span className="tag">{currency}</span>
                      </div>
                      <HistoryChart
                        accounts={accounts}
                        transactions={transactions}
                        from={
                          period === "custom"
                            ? from
                            : start.toLocaleDateString("en-CA")
                        }
                        to={period === "custom" ? to : today()}
                      />
                      <div className="chart-footer">
                        <span>
                          <i className="legend-dot" /> Patrimonio neto
                        </span>
                        <span>Incluye saldos iniciales y movimientos</span>
                      </div>
                    </section>
                  </div>
                  <SpendingPeriods
                    accounts={accounts}
                    transactions={transactions}
                    categories={categories}
                  />
                  <div className="lower-grid">
                    <section className="card">
                      <div className="card-heading">
                        <div>
                          <h2>Últimos movimientos</h2>
                          <p className="muted">
                            Los pequeños pasos también cuentan
                          </p>
                        </div>
                        <NavLink className="text-link" to="/movimientos">
                          Ver todos <ChevronRight size={16} />
                        </NavLink>
                      </div>
                      <MovementList
                        transactions={filtered.slice(0, 5)}
                        accounts={accounts}
                        categories={categories}
                        edit={editMovement}
                        remove={remove}
                      />
                    </section>
                    <MonthlyOutlook
                      accounts={accounts}
                      transactions={transactions}
                      ready={dataReady}
                    />
                  </div>
                  <p className="data-note">
                    <ShieldCheck size={14} />
                    {session
                      ? "Cifras calculadas a partir de tus registros manuales."
                      : "Sin datos de demostración. Tus cifras aparecerán al conectar tu cuenta."}
                  </p>
                </>
              }
            />
            <Route
              path="/movimientos"
              element={
                <Movements {...context} edit={editMovement} remove={remove} />
              }
            />
            <Route
              path="/compras-a-meses"
              element={
                <Installments
                  {...context}
                  enabled={!!session}
                  edit={editMovement}
                  payCard={payCreditCard}
                />
              }
            />
            <Route
              path="/cuentas"
              element={<Accounts {...context} enabled={!!session} />}
            />
            <Route
              path="/metas"
              element={
                <Goals
                  accounts={accounts}
                  goals={goals}
                  plan={savingsPlan}
                  transactions={transactions}
                  write={write}
                  enabled={!!session}
                />
              }
            />
            <Route
              path="/configuracion"
              element={
                <Configuration
                  theme={theme}
                  setTheme={setTheme}
                  categories={categories}
                  write={write}
                  enabled={!!session}
                />
              }
            />
            <Route
              path="/inversiones"
              element={
                <Suspense
                  fallback={
                    <div className="card" role="status">
                      Preparando tu simulador…
                    </div>
                  }
                >
                  <Simulator />
                </Suspense>
              }
            />
            <Route
              path="*"
              element={
                <Empty
                  title="Esta página no existe"
                  text="Usa la navegación para volver a tu espacio."
                />
              }
            />
          </Routes>
        </main>
        <footer>
          finanzas <span>Un poco más de claridad. Un paso más cerca.</span>
          <CircleHelp size={15} />
        </footer>
      </div>
      <nav className="mobile-nav" aria-label="Navegación móvil">
        {nav
          .filter(
            ([path]) =>
              path !== "/configuracion" && path !== "/compras-a-meses",
          )
          .map(([path, label, Icon]) => (
            <NavLink key={path} to={path} end onClick={scrollToTop}>
              <Icon size={21} />
              <span>{label}</span>
            </NavLink>
          ))}
      </nav>
      {recordHelp && (
        <Dialog open onOpenChange={setRecordHelp}>
          <DialogContent>
            <DialogTitle>
              {!supabase
                ? "Conecta tu espacio para guardar movimientos"
                : "Crea una cuenta para registrar movimientos"}
            </DialogTitle>
            <DialogDescription className="muted">
              {!supabase
                ? "El almacenamiento todavía no está configurado. En Configuración encontrarás los pasos para conectar Supabase. Después, inicia sesión y crea tu primera cuenta."
                : "Cada ingreso o gasto necesita una cuenta. Crea una cuenta o activa una archivada y después registra tu movimiento."}
            </DialogDescription>
            <div className="dialog-actions">
              <Button variant="outline" onClick={() => setRecordHelp(false)}>
                Cerrar
              </Button>
              <NavLink
                className="button primary"
                to={!supabase ? "/configuracion" : "/cuentas"}
                onClick={() => setRecordHelp(false)}
              >
                {!supabase ? "Ir a configuración" : "Ir a cuentas"}
              </NavLink>
            </div>
          </DialogContent>
        </Dialog>
      )}
      {modal && (
        <MovementDialog
          accounts={accounts}
          categories={categories}
          editing={editing}
          initialKind={quickKind}
          automaticPaidMonths={
            editingProgress?.hasAllocatedPayments
              ? editingProgress.paidMonths
              : undefined
          }
          close={() => setModal(false)}
          save={async (data) => {
            await write("transactions", data, editing?.id);
            setModal(false);
          }}
        />
      )}
      {deleting && (
        <ConfirmDialog
          description={
            deleting.credit_payment_month
              ? `${deleting.description}. Al eliminarlo se deshace el pago y se recalculan las compras cubiertas.`
              : deleting.description
          }
          close={() => setDeleting(null)}
          confirm={confirmRemove}
        />
      )}
      {notice && (
        <div className="toast" role="status">
          <ShieldCheck size={18} />
          {notice}
        </div>
      )}
    </div>
  );
}

export default App;
