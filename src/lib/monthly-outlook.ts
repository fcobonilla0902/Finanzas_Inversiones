import {
  balance,
  cents,
  installmentBilling,
  installmentSummary,
  type Account,
  type Transaction,
} from "./finance";

export function monthlyOutlook(
  accounts: Account[],
  transactions: Transaction[],
  asOf = new Date().toLocaleDateString("en-CA"),
  month = asOf.slice(0, 7),
) {
  const recorded = transactions.filter((t) => t.date <= asOf);
  const liquid = accounts.filter(
    (a) => !["credit", "investment"].includes(a.type),
  );
  const liquidIds = new Set(liquid.map((a) => a.id));
  const cash = liquid.reduce((sum, a) => sum + balance(a, recorded), 0);
  const investments = accounts
    .filter((a) => a.type === "investment")
    .reduce((sum, a) => sum + balance(a, recorded), 0);
  const totalFunds = investments + cash;
  const cashExpenses = recorded
    .filter(
      (t) =>
        t.kind === "expense" &&
        liquidIds.has(t.account_id) &&
        t.date.startsWith(month),
    )
    .reduce((sum, t) => sum + cents(t.amount), 0);
  const cashBeforeExpenses = cash + cashExpenses;
  const fundsBeforeExpenses = investments + cashBeforeExpenses;
  const income = recorded
    .filter(
      (t) =>
        t.kind === "income" &&
        t.date.startsWith(month) &&
        accounts.some((a) => a.id === t.account_id && a.type !== "credit"),
    )
    .reduce((sum, t) => sum + cents(t.amount), 0);
  const cards = accounts
    .filter((a) => a.type === "credit")
    .map((account) => {
      const initial = cents(account.initial_balance);
      let payments = Math.max(0, initial);
      let transfers = 0,
        markedPaid = 0;
      let unlinkedMarkedPaid = 0;
      const allocated = new Map<string, number>();
      for (const payment of recorded) {
        if (
          payment.kind !== "transfer" ||
          payment.destination_id !== account.id ||
          !payment.credit_payment_month
        )
          continue;
        for (const allocation of payment.credit_payment_allocations || []) {
          allocated.set(
            allocation.transaction_id,
            (allocated.get(allocation.transaction_id) || 0) +
              allocation.amount_cents,
          );
        }
      }
      let purchased = 0;
      const purchases = new Map<
        string,
        {
          id: string;
          remaining: number;
          thisMonth: number;
          overdue: number;
          total: number;
          dueDate: string | null;
          undated: number;
          paidMonths: number;
          hasAllocatedPayments: boolean;
        }
      >();
      const charges: {
        id?: string;
        due: string | null;
        amount: number;
        installments: boolean;
        date?: string;
        installmentIndex?: number;
      }[] = [];
      if (initial < 0)
        charges.push({ due: null, amount: -initial, installments: false });
      for (const t of recorded) {
        if (t.destination_id === account.id && !t.credit_payment_month)
          transfers += cents(t.amount);
        if (t.account_id !== account.id) continue;
        if (t.kind === "income") {
          payments += cents(t.amount);
          continue;
        }
        const installments =
          t.kind === "expense" && (t.installment_months || 1) > 1;
        if (t.kind === "expense") {
          purchased += cents(t.amount);
          purchases.set(t.id, {
            id: t.id,
            remaining: 0,
            thisMonth: 0,
            overdue: 0,
            total: 0,
            dueDate: null,
            undated: 0,
            paidMonths: 0,
            hasAllocatedPayments: allocated.has(t.id),
          });
        }
        const plan = installmentSummary({
          ...t,
          installment_months: installments ? t.installment_months : 1,
          installments_paid: installments ? t.installments_paid : 0,
        });
        const manualPaid = cents(t.amount) - plan.remaining;
        markedPaid += manualPaid;
        const explicitPaid = allocated.get(t.id) || 0;
        unlinkedMarkedPaid += manualPaid;
        let paidForPurchase = manualPaid + explicitPaid;
        const first = installmentBilling(
          { ...t, installment_months: plan.months, installments_paid: 0 },
          account,
          month,
        )?.firstPaymentDate;
        for (let index = 0; index < plan.months; index++) {
          let due: string | null = null;
          if (first) {
            const date = new Date(`${first.slice(0, 7)}-01T12:00:00`);
            date.setMonth(date.getMonth() + index);
            const lastDay = new Date(
              date.getFullYear(),
              date.getMonth() + 1,
              0,
            ).getDate();
            due = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(Math.min(account.payment_day!, lastDay)).padStart(2, "0")}`;
          }
          const originalAmount =
            plan.minimumPayment +
            (index < cents(t.amount) % plan.months ? 1 : 0);
          const covered = Math.min(originalAmount, paidForPurchase);
          paidForPurchase -= covered;
          charges.push({
            id: t.id,
            date: t.date,
            installmentIndex: index,
            due,
            installments,
            amount: originalAmount - covered,
          });
        }
      }
      // shortcut: transfers have no purchase links; assume they overlap marked payments until allocations are stored.
      payments += Math.max(0, transfers - unlinkedMarkedPaid);
      // Estimate allocation: oldest due first; undated starting debt takes priority.
      charges.sort(
        (a, b) =>
          (a.due || "").localeCompare(b.due || "") ||
          (a.date || "").localeCompare(b.date || "") ||
          (a.id || "").localeCompare(b.id || ""),
      );
      let installmentDebt = 0,
        outrightDebt = 0,
        otherDebt = 0,
        dueThisMonth = 0,
        installmentDue = 0,
        outrightDue = 0,
        otherDue = 0,
        undated = 0;
      for (const charge of charges) {
        const paid = Math.min(payments, charge.amount);
        payments -= paid;
        const remaining = charge.amount - paid;
        const purchase = charge.id ? purchases.get(charge.id) : undefined;
        if (purchase) {
          if (
            remaining === 0 &&
            charge.installmentIndex === purchase.paidMonths
          )
            purchase.paidMonths++;
          purchase.remaining += remaining;
          if (!charge.due) purchase.undated += remaining;
          else if (charge.due.slice(0, 7) === month) {
            purchase.thisMonth += remaining;
            if (remaining > 0) purchase.dueDate = charge.due;
          } else if (charge.due.slice(0, 7) < month)
            purchase.overdue += remaining;
          purchase.total = purchase.thisMonth + purchase.overdue;
        }
        if (!purchase) otherDebt += remaining;
        else if (charge.installments) installmentDebt += remaining;
        else outrightDebt += remaining;
        if (!charge.due) undated += remaining;
        else if (charge.due.slice(0, 7) <= month) {
          dueThisMonth += remaining;
          if (!purchase) otherDue += remaining;
          else if (charge.installments) installmentDue += remaining;
          else outrightDue += remaining;
        }
      }
      const debt = [...purchases.values()].reduce(
        (sum, p) => sum + p.remaining,
        0,
      );
      return {
        id: account.id,
        name: account.name,
        statementDay: account.statement_day,
        paymentDay: account.payment_day,
        purchased,
        markedPaid,
        installmentDebt,
        outrightDebt,
        otherDebt,
        dueThisMonth,
        installmentDue,
        outrightDue,
        otherDue,
        undated,
        debt,
        appliedPayments: Math.max(0, purchased - markedPaid - debt),
        purchases: [...purchases.values()],
      };
    });
  const due = cards.reduce((sum, card) => sum + card.dueThisMonth, 0);
  const incomplete = cards.some((card) => card.undated > 0);
  return {
    month,
    investments,
    totalFunds,
    cash,
    cashExpenses,
    cashBeforeExpenses,
    fundsBeforeExpenses,
    income,
    installmentDue: cards.reduce((sum, card) => sum + card.installmentDue, 0),
    outrightDue: cards.reduce((sum, card) => sum + card.outrightDue, 0),
    otherDue: cards.reduce((sum, card) => sum + card.otherDue, 0),
    expenses: cashExpenses + due,
    cards,
    purchases: cards.flatMap((card) => card.purchases),
    due,
    incomplete,
    remaining: incomplete ? null : totalFunds - due,
  };
}
