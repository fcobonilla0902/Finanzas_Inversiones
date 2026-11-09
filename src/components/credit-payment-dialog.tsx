import { useState, type FormEvent } from "react";
import {
  balance,
  creditPaymentDates,
  money,
  type Account,
  type Transaction,
  type CreditPeriodPayment,
} from "../lib/finance";
import { monthlyOutlook } from "../lib/monthly-outlook";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";

export function CreditPaymentDialog({
  accounts,
  transactions,
  initialCard,
  month,
  close,
  save,
}: {
  accounts: Account[];
  transactions: Transaction[];
  initialCard?: string;
  month: string;
  close: () => void;
  save: (payment: CreditPeriodPayment) => Promise<void>;
}) {
  const [cardId, setCardId] = useState(initialCard || "");
  const [sourceId, setSourceId] = useState("");
  const [paidOn, setPaidOn] = useState(new Date().toLocaleDateString("en-CA"));
  const [fullPayment, setFullPayment] = useState(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const today = new Date().toLocaleDateString("en-CA");
  const card = accounts.find(
    (a) => a.id === cardId && a.type === "credit" && !a.archived,
  );
  const dates = card ? creditPaymentDates(card, month) : null;
  const quoteDate = paidOn && paidOn <= today ? paidOn : today;
  const bill = monthlyOutlook(
    accounts,
    transactions,
    quoteDate,
    month,
  ).cards.find((c) => c.id === cardId);
  const sources = accounts.filter((a) => a.type !== "credit" && !a.archived);
  const source = sources.find((a) => a.id === sourceId);
  const sourceBalance = source
    ? balance(
        source,
        transactions.filter((t) => t.date <= paidOn),
      )
    : 0;
  const alreadyRecorded = transactions.some(
    (t) =>
      t.destination_id === cardId &&
      t.credit_payment_month?.slice(0, 7) === month,
  );
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!card || !source) {
      setError(
        "Selecciona qué tarjeta pagaste y de qué cuenta salió el dinero.",
      );
      return;
    }
    if (!fullPayment) {
      setError(
        "Confirma que pagaste el monto completo. Para un abono parcial, registra una transferencia en Movimientos.",
      );
      return;
    }
    if (!dates || !bill || bill.undated) {
      setError(
        "Revisa las fechas y los saldos sin vencimiento antes de registrar el pago.",
      );
      return;
    }
    if (paidOn < dates.cutoff || paidOn > dates.deadline || paidOn > today) {
      setError(
        "La fecha debe estar entre el corte y el último día de pago, sin ser futura.",
      );
      return;
    }
    if (bill.dueThisMonth <= 0 || alreadyRecorded) {
      setError("Este periodo ya está cubierto.");
      return;
    }
    if (sourceBalance < bill.dueThisMonth) {
      setError(
        "La cuenta seleccionada no tiene saldo suficiente en esa fecha.",
      );
      return;
    }
    setBusy(true);
    try {
      await save({
        cardId,
        sourceId,
        month,
        paidOn,
        expectedAmount: (bill.dueThisMonth / 100).toFixed(2),
      });
      close();
    } catch (exception) {
      setError((exception as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) close();
      }}
    >
      <DialogContent>
        <DialogTitle>Pagué a tiempo mi tarjeta de crédito</DialogTitle>
        <DialogDescription>
          Registra el pago completo de {month}. Se descontará de la cuenta
          elegida y se actualizarán automáticamente las compras cubiertas.
        </DialogDescription>
        <form onSubmit={submit} noValidate>
          <label>
            Tarjeta de crédito que pagaste
            <select
              value={cardId}
              disabled={busy}
              onChange={(e) => {
                setCardId(e.target.value);
                setFullPayment(false);
                setError("");
              }}
              required
            >
              <option value="">Selecciona una tarjeta</option>
              {accounts
                .filter((a) => a.type === "credit" && !a.archived)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
            </select>
          </label>
          <label>
            Cuenta o tarjeta con la que pagaste
            <select
              value={sourceId}
              disabled={busy}
              onChange={(e) => {
                setSourceId(e.target.value);
                setError("");
              }}
              required
            >
              <option value="">Selecciona de dónde salió el dinero</option>
              {sources.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Fecha en que pagaste
            <input
              type="date"
              disabled={busy}
              value={paidOn}
              min={dates?.cutoff}
              max={dates ? [dates.deadline, today].sort()[0] : today}
              onChange={(e) => {
                setPaidOn(e.target.value);
                setFullPayment(false);
                setError("");
              }}
              required
            />
          </label>
          {dates && (
            <p className="field-hint">
              Corte: {dates.cutoff} · Último día para pagar: {dates.deadline}
            </p>
          )}
          {dates && dates.cutoff > today && (
            <p className="field-hint">
              Este corte cierra el {dates.cutoff}. Para un abono anticipado,
              registra una transferencia en Movimientos.
            </p>
          )}
          {bill && (
            <div className="billing-summary">
              <div className="category-row">
                <span>A meses</span>
                <b>{money(bill.installmentDue)}</b>
              </div>
              <div className="category-row">
                <span>De contado</span>
                <b>{money(bill.outrightDue)}</b>
              </div>
              {bill.otherDue > 0 && (
                <div className="category-row">
                  <span>Otros cargos</span>
                  <b>{money(bill.otherDue)}</b>
                </div>
              )}
              <p
                className="summary-amount"
                aria-label="Monto completo del periodo"
              >
                {money(bill.dueThisMonth)}
              </p>
            </div>
          )}
          {source && (
            <p className="field-hint">
              Saldo de la cuenta en esa fecha: {money(sourceBalance)}
            </p>
          )}
          <label className="archive-toggle">
            <input
              type="checkbox"
              disabled={busy}
              checked={fullPayment}
              onChange={(e) => {
                setFullPayment(e.target.checked);
                setError("");
              }}
            />
            Sí, pagué el monto completo del periodo hasta el corte
          </label>
          <p className="field-hint">
            Incluye todas las compras de esa tarjeta que vencen en el periodo,
            aunque hayas filtrado la tabla. No vuelve a contar los meses ya
            pagados.
          </p>
          {alreadyRecorded && (
            <p className="field-hint">
              El pago de este periodo ya está registrado.
            </p>
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
              disabled={busy}
              onClick={close}
            >
              Cancelar
            </Button>
            <Button disabled={busy || alreadyRecorded}>
              {busy ? "Registrando…" : "Registrar pago completo"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
