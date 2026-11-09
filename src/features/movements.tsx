import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  Search,
  X,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeftRight,
  ShieldCheck,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  cents,
  type Account,
  type Category,
  type Transaction,
} from "../lib/finance";
import type { Context } from "../lib/types";
import { Button } from "../components/ui/button";
import { FieldError } from "../components/ui/field-error";
import { MovementList } from "../components/financial";
import { monthlyOutlook } from "../lib/monthly-outlook";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog";
const today = () => new Date().toLocaleDateString("en-CA");
const schema = z
  .object({
    kind: z.enum(["income", "expense", "transfer"]),
    amount: z.string().refine((v) => {
      try {
        return cents(v) > 0;
      } catch {
        return false;
      }
    }, "Introduce una cantidad positiva, con máximo 2 decimales."),
    date: z.string().min(1, "Selecciona una fecha."),
    account_id: z.string().min(1, "Selecciona una cuenta."),
    destination_id: z.string(),
    category_id: z.string(),
    description: z.string().trim().min(1, "Añade una descripción.").max(160),
    installment_months: z.number().int().min(1).max(120),
    installments_paid: z.number().int().min(0).max(120),
  })
  .superRefine((v, ctx) => {
    if (v.installments_paid > v.installment_months)
      ctx.addIssue({
        code: "custom",
        path: ["installments_paid"],
        message: "Los meses pagados no pueden superar el plazo.",
      });
    if (
      v.kind === "transfer" &&
      (!v.destination_id || v.destination_id === v.account_id)
    )
      ctx.addIssue({
        code: "custom",
        path: ["destination_id"],
        message: "Selecciona otra cuenta de destino.",
      });
    if (v.kind !== "transfer" && !v.category_id)
      ctx.addIssue({
        code: "custom",
        path: ["category_id"],
        message: "Selecciona una categoría.",
      });
  });
type MovementForm = z.infer<typeof schema>;

export function Movements({
  accounts,
  categories,
  transactions,
  edit,
  remove,
}: Context & {
  edit: (t: Transaction) => void;
  remove: (t: Transaction) => void;
}) {
  const [search, setSearch] = useState(""),
    [account, setAccount] = useState(""),
    [category, setCategory] = useState(""),
    [from, setFrom] = useState(""),
    [to, setTo] = useState("");
  const list = transactions.filter(
    (t) =>
      (!search || t.description.toLowerCase().includes(search.toLowerCase())) &&
      (!account || t.account_id === account || t.destination_id === account) &&
      (!category || t.category_id === category) &&
      (!from || t.date >= from) &&
      (!to || t.date <= to),
  );
  const hasFilters = !!(search || account || category || from || to);
  const installmentProgress = new Map(
    monthlyOutlook(accounts, transactions).purchases.map((p) => [
      p.id,
      p.paidMonths,
    ]),
  );
  return (
    <section className="card">
      <NavLink className="text-link installment-entry" to="/compras-a-meses">
        Ver compras con tarjeta de crédito
      </NavLink>
      <div className="card-heading movement-summary">
        <div>
          <h2>Tu actividad</h2>
          <p className="muted" role="status">
            {list.length} {list.length === 1 ? "movimiento" : "movimientos"}
            {hasFilters ? " en esta búsqueda" : " registrados"}
          </p>
        </div>
        {hasFilters && (
          <Button
            variant="ghost"
            onClick={() => {
              setSearch("");
              setAccount("");
              setCategory("");
              setFrom("");
              setTo("");
            }}
          >
            Limpiar filtros
          </Button>
        )}
      </div>
      <div className="filters">
        <label>
          <Search size={16} />
          Buscar
          <input
            placeholder="Descripción del movimiento"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <label>
          Cuenta
          <select value={account} onChange={(e) => setAccount(e.target.value)}>
            <option value="">Todas las cuentas</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Categoría
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
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
      {hasFilters && !list.length ? (
        <div className="empty">
          <h3>No hay movimientos con estos filtros</h3>
          <p>
            Prueba otra descripción, cuenta o fecha, o limpia los filtros para
            ver toda tu actividad.
          </p>
        </div>
      ) : (
        <MovementList
          transactions={list}
          accounts={accounts}
          categories={categories}
          showCreditDetails
          installmentProgress={installmentProgress}
          edit={edit}
          remove={remove}
        />
      )}
    </section>
  );
}

export function MovementDialog({
  accounts,
  categories,
  editing,
  close,
  save,
  initialKind = "expense",
  automaticPaidMonths,
}: {
  accounts: Account[];
  categories: Category[];
  editing: Transaction | null;
  close: () => void;
  save: (data: Record<string, unknown>) => Promise<void>;
  initialKind?: "income" | "expense";
  automaticPaidMonths?: number;
}) {
  const {
    register,
    watch,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<MovementForm>({
    resolver: zodResolver(schema),
    reValidateMode: "onChange",
    defaultValues: editing
      ? {
          ...editing,
          destination_id: editing.destination_id || "",
          category_id: editing.category_id || "",
          installment_months: editing.installment_months || 1,
          installments_paid: editing.installments_paid || 0,
        }
      : {
          kind: initialKind,
          amount: "",
          date: today(),
          account_id: accounts.find((a) => !a.archived)?.id || "",
          destination_id: "",
          category_id: "",
          description: "",
          installment_months: 1,
          installments_paid: 0,
        },
  });
  const [error, setError] = useState("");
  const kind = watch("kind");
  const accountId = watch("account_id");
  const creditExpense =
    kind === "expense" &&
    accounts.some((a) => a.id === accountId && a.type === "credit");
  const months = watch("installment_months");
  useEffect(() => {
    if (!creditExpense) {
      setValue("installment_months", 1, { shouldValidate: false });
      setValue("installments_paid", 0, { shouldValidate: false });
    }
    if (Number(months) === 1) setValue("installments_paid", 0);
  }, [creditExpense, months, setValue]);
  useEffect(() => {
    if (
      !categories.some(
        (c) => c.id === getValues("category_id") && c.kind === kind,
      )
    )
      setValue("category_id", "");
  }, [kind, categories, getValues, setValue]);
  const accessibleField = (name: keyof MovementForm) => ({
    "aria-invalid": !!errors[name],
    "aria-describedby": errors[name] ? `${name}-error` : undefined,
  });
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <DialogContent
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          if (matchMedia("(pointer: fine)").matches)
            document
              .querySelector<HTMLInputElement>('input[name="amount"]')
              ?.focus();
          else document.getElementById("dialog-title")?.focus();
        }}
      >
        <div className="card-heading">
          <DialogTitle id="dialog-title" tabIndex={-1}>
            {editing ? "Editar movimiento" : "Un nuevo movimiento"}
          </DialogTitle>
          <button aria-label="Cerrar" onClick={close}>
            <X />
          </button>
        </div>
        <DialogDescription className="muted dialog-intro">
          {kind === "transfer"
            ? "Mueve dinero entre tus cuentas sin registrarlo como un gasto."
            : kind === "income"
              ? "Registra cuánto recibiste y en qué cuenta."
              : "Registra cuánto gastaste y de qué cuenta salió."}
        </DialogDescription>
        <form
          autoComplete="off"
          noValidate
          onSubmit={handleSubmit(async (v) => {
            setError("");
            try {
              await save({
                ...v,
                destination_id: v.kind === "transfer" ? v.destination_id : null,
                category_id: v.kind === "transfer" ? null : v.category_id,
                installment_months:
                  creditExpense && v.installment_months > 1
                    ? v.installment_months
                    : null,
                installments_paid:
                  creditExpense && v.installment_months > 1
                    ? v.installments_paid
                    : 0,
              });
            } catch (e) {
              setError((e as Error).message);
            }
          })}
        >
          <label className="amount-label">
            Cantidad en MXN
            <input
              inputMode="decimal"
              aria-label="Cantidad en MXN"
              placeholder="0.00"
              {...register("amount")}
              {...accessibleField("amount")}
            />
            <FieldError name="amount" message={errors.amount?.message} />
          </label>
          <fieldset className="movement-type">
            <legend className="sr-only">Tipo de movimiento</legend>
            {[
              ["expense", "Gasto", ArrowUpRight],
              ["income", "Ingreso", ArrowDownLeft],
              ["transfer", "Transferencia", ArrowLeftRight],
            ].map(([value, label, Icon]) => (
              <label className="type-pill" key={value as string}>
                <input
                  type="radio"
                  value={value as string}
                  {...register("kind")}
                />
                <span>
                  <Icon size={16} />
                  {label as string}
                </span>
              </label>
            ))}
          </fieldset>
          <label>
            Descripción
            <input
              maxLength={160}
              aria-label="Descripción"
              placeholder="¿En qué utilizaste tu dinero?"
              {...register("description")}
              {...accessibleField("description")}
            />
            <FieldError
              name="description"
              message={errors.description?.message}
            />
          </label>
          <div className="form-grid">
            <label>
              Fecha
              <input
                type="date"
                aria-label="Fecha"
                {...register("date")}
                {...accessibleField("date")}
              />
              <FieldError name="date" message={errors.date?.message} />
            </label>
            <label>
              {kind === "income" ? "Cuenta de destino" : "Cuenta de origen"}
              <select
                aria-label={
                  kind === "income" ? "Cuenta de destino" : "Cuenta de origen"
                }
                {...register("account_id")}
                {...accessibleField("account_id")}
              >
                <option value="">Selecciona una cuenta</option>
                {accounts
                  .filter((a) => !a.archived || a.id === editing?.account_id)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
              </select>
              <FieldError
                name="account_id"
                message={errors.account_id?.message}
              />
            </label>
          </div>
          {creditExpense ? (
            <fieldset className="installment-fields">
              <legend>Pago de la compra</legend>
              <div className="form-grid">
                <label htmlFor="installment-months">
                  Plazo de la compra
                  <select
                    id="installment-months"
                    aria-label="Plazo de la compra"
                    {...register("installment_months", { valueAsNumber: true })}
                    {...accessibleField("installment_months")}
                  >
                    {[
                      1, 2, 3, 4, 6, 9, 12, 18, 24, 36, 48, 60, 72, 84, 96, 120,
                    ].map((n) => (
                      <option key={n} value={n}>
                        {n === 1 ? "Una sola exhibición" : `${n} meses`}
                      </option>
                    ))}
                    {editing?.installment_months &&
                    ![
                      1, 2, 3, 4, 6, 9, 12, 18, 24, 36, 48, 60, 72, 84, 96, 120,
                    ].includes(editing.installment_months) ? (
                      <option value={editing.installment_months}>
                        {editing.installment_months} meses
                      </option>
                    ) : null}
                  </select>
                  <FieldError
                    name="installment_months"
                    message={errors.installment_months?.message}
                  />
                </label>
                {Number(months) > 1 && automaticPaidMonths === undefined ? (
                  <label htmlFor="installments-paid">
                    Meses ya pagados
                    <input
                      id="installments-paid"
                      aria-label="Meses ya pagados"
                      type="number"
                      inputMode="numeric"
                      min="0"
                      max={Number(months)}
                      step="1"
                      {...register("installments_paid", {
                        valueAsNumber: true,
                      })}
                      {...accessibleField("installments_paid")}
                    />
                    <FieldError
                      name="installments_paid"
                      message={errors.installments_paid?.message}
                    />
                  </label>
                ) : null}
                {Number(months) > 1 && automaticPaidMonths !== undefined && (
                  <p className="field-hint">
                    Meses pagados: {automaticPaidMonths} de {Number(months)}.
                    Avance calculado con tus pagos registrados. Para cambiar
                    importe, fecha o plazo, elimina primero el pago vinculado.
                  </p>
                )}
              </div>
              <p className="field-hint">
                Registra el importe total de la compra. Los meses pagados son un
                seguimiento manual; registra el pago a la tarjeta como
                transferencia. El cálculo divide el total entre meses y no añade
                intereses.
              </p>
            </fieldset>
          ) : null}
          {kind === "transfer" ? (
            <label>
              Cuenta de destino
              <select
                aria-label="Cuenta de destino"
                {...register("destination_id")}
                {...accessibleField("destination_id")}
              >
                <option value="">Selecciona otra cuenta</option>
                {accounts
                  .filter((a) => !a.archived)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
              </select>
              <FieldError
                name="destination_id"
                message={errors.destination_id?.message}
              />
            </label>
          ) : (
            <label>
              Categoría
              <select
                aria-label="Categoría"
                {...register("category_id")}
                {...accessibleField("category_id")}
              >
                <option value="">Selecciona una categoría</option>
                {categories
                  .filter(
                    (c) =>
                      c.kind === kind &&
                      (!c.archived || c.id === editing?.category_id),
                  )
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
              <FieldError
                name="category_id"
                message={errors.category_id?.message}
              />
            </label>
          )}
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <div className="dialog-actions">
            <Button
              type="button"
              variant="outline"
              onClick={close}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button disabled={isSubmitting}>
              {isSubmitting ? "Guardando…" : "Guardar movimiento"}
            </Button>
          </div>
          <p className="save-note">
            <ShieldCheck size={13} />
            Solo tú puedes ver tus movimientos.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
