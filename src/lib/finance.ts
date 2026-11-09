export interface Account {
  id: string;
  name: string;
  type: string;
  initial_balance: string;
  archived: boolean;
  annual_return_rate?: string | null;
  statement_day?: number | null;
  payment_day?: number | null;
}
export interface Category {
  id: string;
  name: string;
  kind: "income" | "expense";
  archived: boolean;
}
export interface SavingsGoal {
  id: string;
  name: string;
  horizon: "short" | "medium" | "long";
  target_amount: string;
  saved_amount: string;
  archived: boolean;
}
export interface SavingsPlan {
  id: string;
  source: "recorded" | "budget";
  monthly_income: string | null;
  monthly_expenses: string | null;
}
export interface Transaction {
  id: string;
  kind: "income" | "expense" | "transfer";
  amount: string;
  date: string;
  description: string;
  account_id: string;
  destination_id: string | null;
  category_id: string | null;
  installment_months?: number | null;
  installments_paid?: number;
  credit_payment_month?: string | null;
  credit_payment_allocations?:
    | { transaction_id: string; amount_cents: number }[]
    | null;
}
export function installmentSummary(transaction: Transaction) {
  const months = transaction.installment_months || 1;
  const paid = transaction.installments_paid || 0;
  const total = cents(transaction.amount);
  const regular = Math.floor(total / months);
  // Distribute rounding cents over the first installments.
  const extra = total % months;
  const paidAmount = regular * paid + Math.min(paid, extra);
  return {
    months,
    paid,
    remainingMonths: months - paid,
    remaining: total - paidAmount,
    nextPayment: paid < months ? regular + (paid < extra ? 1 : 0) : 0,
    minimumPayment: regular,
    maximumPayment: regular + (extra ? 1 : 0),
  };
}
const monthIndex = (date: string) =>
  Number(date.slice(0, 4)) * 12 + Number(date.slice(5, 7)) - 1;
export interface CreditPeriodPayment {
  cardId: string;
  sourceId: string;
  month: string;
  paidOn: string;
  expectedAmount: string;
}
export function creditPaymentDates(account: Account, month: string) {
  if (!account.statement_day || !account.payment_day) return null;
  const index = monthIndex(month);
  return {
    cutoff: calendarDay(
      index - (account.payment_day <= account.statement_day ? 1 : 0),
      account.statement_day,
    ),
    deadline: calendarDay(index, account.payment_day),
  };
}
function calendarDay(month: number, day: number) {
  const year = Math.floor(month / 12),
    index = month % 12;
  const last = new Date(Date.UTC(year, index + 1, 0)).getUTCDate();
  return `${year}-${String(index + 1).padStart(2, "0")}-${String(Math.min(day, last)).padStart(2, "0")}`;
}
export function installmentBilling(
  transaction: Transaction,
  account: Account | undefined,
  month: string,
) {
  if (!account?.statement_day || !account.payment_day) return null;
  const purchaseMonth = monthIndex(transaction.date);
  const closingMonth =
    purchaseMonth +
    (transaction.date > calendarDay(purchaseMonth, account.statement_day)
      ? 1
      : 0);
  const firstPaymentMonth =
    closingMonth + (account.payment_day <= account.statement_day ? 1 : 0);
  const index = monthIndex(month) - firstPaymentMonth;
  const plan = installmentSummary(transaction);
  const total = cents(transaction.amount),
    regular = Math.floor(total / plan.months),
    extra = total % plan.months;
  const scheduled = index >= 0 && index < plan.months;
  const thisMonth =
    scheduled && index >= plan.paid ? regular + (index < extra ? 1 : 0) : 0;
  const overdueCount = Math.max(0, Math.min(index, plan.months) - plan.paid);
  const overdue =
    regular * overdueCount +
    Math.max(
      0,
      Math.min(Math.max(0, index), extra) - Math.min(plan.paid, extra),
    );
  return {
    thisMonth,
    overdue,
    overdueCount,
    total: thisMonth + overdue,
    dueDate: scheduled
      ? calendarDay(monthIndex(month), account.payment_day)
      : null,
    installmentNumber: scheduled ? index + 1 : null,
    firstPaymentDate: calendarDay(firstPaymentMonth, account.payment_day),
  };
}
export const money = (cents: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(
    cents / 100,
  );
export function cents(value: string): number {
  if (!/^-?\d+(\.\d{1,2})?$/.test(value))
    throw Error("Introduce un importe con máximo dos decimales.");
  const negative = value.startsWith("-");
  const [whole, fraction = ""] = value.replace("-", "").split(".");
  const result = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(result)) throw Error("Importe fuera de rango.");
  return negative ? -result : result;
}
export function balance(account: Account, transactions: Transaction[]) {
  return transactions.reduce(
    (total, t) =>
      total +
      (t.account_id === account.id
        ? t.kind === "income"
          ? cents(t.amount)
          : -cents(t.amount)
        : 0) +
      (t.destination_id === account.id ? cents(t.amount) : 0),
    cents(account.initial_balance),
  );
}
export function totals(transactions: Transaction[]) {
  const income = transactions
    .filter((t) => t.kind === "income")
    .reduce((s, t) => s + cents(t.amount), 0);
  const expense = transactions
    .filter((t) => t.kind === "expense")
    .reduce((s, t) => s + cents(t.amount), 0);
  return {
    income,
    expense,
    net: income - expense,
    savings: income ? ((income - expense) / income) * 100 : 0,
  };
}
export function spendingByCategory(
  transactions: Transaction[],
  categories: Category[],
) {
  const names = new Map(
    categories.map((category) => [category.id, category.name]),
  );
  const amounts = new Map<string | null, number>();
  for (const transaction of transactions) {
    if (transaction.kind !== "expense") continue;
    const id =
      transaction.category_id && names.has(transaction.category_id)
        ? transaction.category_id
        : null;
    amounts.set(id, (amounts.get(id) || 0) + cents(transaction.amount));
  }
  return [...amounts]
    .map(([id, value]) => ({
      id,
      name: id === null ? "Sin categoría" : names.get(id)!,
      value,
    }))
    .filter((category) => category.value > 0)
    .sort((a, b) => b.value - a.value);
}
export function netWorth(accounts: Account[], transactions: Transaction[]) {
  return accounts.reduce((s, a) => s + balance(a, transactions), 0);
}
export function parseAnnualReturnRate(value: string): string | null {
  const rate = value.trim();
  if (!rate) return null;
  if (
    !/^\d+(\.\d{1,4})?$/.test(rate) ||
    !Number.isFinite(Number(rate)) ||
    Number(rate) > 100
  )
    throw Error("Introduce una tasa entre 0 y 100 %, con máximo 4 decimales.");
  return String(Number(rate));
}

export function investmentReturns(
  accounts: Account[],
  transactions: Transaction[],
  asOf = new Date().toLocaleDateString("en-CA"),
) {
  const recorded = transactions.filter(
    (transaction) => transaction.date <= asOf,
  );
  const investments = accounts
    .filter((account) => account.type === "investment" && !account.archived)
    .flatMap((account) => {
      if (
        account.annual_return_rate == null ||
        account.annual_return_rate.trim() === ""
      )
        return [];
      const rate = Number(account.annual_return_rate);
      if (!Number.isFinite(rate) || rate < 0 || rate > 100) return [];
      return [
        {
          id: account.id,
          name: account.name,
          rate,
          principal: Math.max(0, balance(account, recorded)),
        },
      ];
    });
  const principal = investments.reduce(
    (sum, investment) => sum + investment.principal,
    0,
  );
  const annual = investments.reduce(
    (sum, investment) => sum + (investment.principal * investment.rate) / 100,
    0,
  );
  const forDays = (days: number) => Math.round((annual * days) / 365);
  return {
    investments,
    principal,
    daily: forDays(1),
    weekly: forDays(7),
    monthly: forDays(30),
    annual: forDays(365),
  };
}
export function budgetRemaining(limit: number, spent: number) {
  return limit - spent;
}
export function creditCardDebt(
  accounts: Account[],
  transactions: Transaction[],
  asOf = new Date().toLocaleDateString("en-CA"),
) {
  const recorded = transactions.filter(
    (transaction) => transaction.date <= asOf,
  );
  const cards = accounts
    .filter((account) => account.type === "credit")
    .map((account) => ({
      id: account.id,
      name: account.name,
      archived: account.archived,
      debt: Math.max(0, -balance(account, recorded)),
    }));
  return { cards, total: cards.reduce((sum, card) => sum + card.debt, 0) };
}

export function monthlySavingsCapacity(
  transactions: Transaction[],
  plan?: SavingsPlan,
  asOf = new Date().toLocaleDateString("en-CA"),
) {
  if (
    plan?.source === "budget" &&
    plan.monthly_income != null &&
    plan.monthly_expenses != null
  ) {
    const income = cents(plan.monthly_income),
      expense = cents(plan.monthly_expenses);
    return {
      source: "budget" as const,
      income,
      expense,
      available: income - expense,
    };
  }
  const month = asOf.slice(0, 7);
  const { income, expense } = totals(
    transactions.filter(
      (transaction) =>
        transaction.date.startsWith(month) && transaction.date <= asOf,
    ),
  );
  return {
    source: "recorded" as const,
    income,
    expense,
    available: income - expense,
  };
}

export function accountSavings(
  accounts: Account[],
  transactions: Transaction[],
  asOf = new Date().toLocaleDateString("en-CA"),
) {
  const recorded = transactions.filter((t) => t.date <= asOf);
  return Math.max(
    0,
    accounts
      .filter((a) => a.type !== "credit")
      .reduce((sum, a) => sum + balance(a, recorded), 0),
  );
}
export function savingsGoalForecast(
  goals: SavingsGoal[],
  monthlyCapacity: number,
  savedReference?: number,
) {
  const capacity = Math.max(0, Math.floor(monthlyCapacity));
  return goals.map((goal) => {
    const target = cents(goal.target_amount),
      saved = savedReference ?? cents(goal.saved_amount),
      remaining = Math.max(0, target - saved);
    const monthly = goal.archived || remaining === 0 ? 0 : capacity;
    return {
      goal,
      target,
      saved,
      remaining,
      monthly,
      progress: Math.min(100, Math.max(0, (saved / target) * 100)),
      months:
        remaining === 0
          ? 0
          : monthly > 0
            ? Math.ceil(remaining / monthly)
            : null,
    };
  });
}

export function goalTimeLabel(months: number | null) {
  if (months == null) return "Sin plazo estimable";
  if (months === 0) return "Meta alcanzada";
  if (months > 1200) return "Más de 100 años";
  if (months < 12) return `${months} ${months === 1 ? "mes" : "meses"}`;
  const years = Math.floor(months / 12),
    rest = months % 12;
  return `${years} ${years === 1 ? "año" : "años"}${rest ? ` y ${rest} ${rest === 1 ? "mes" : "meses"}` : ""}`;
}
export function compound(
  initial: number,
  monthly: number,
  annual: number,
  years: number,
  frequency = 12,
) {
  const rate = (1 + annual / frequency) ** (frequency / 12) - 1;
  let value = initial;
  const points = [{ year: 0, value, contributed: initial }];
  for (let m = 1; m <= years * 12; m++) {
    value = value * (1 + rate) + monthly;
    if (m % 12 === 0)
      points.push({ year: m / 12, value, contributed: initial + monthly * m });
  }
  return points;
}
