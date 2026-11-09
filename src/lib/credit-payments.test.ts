import { expect, it } from "vitest";
import {
  accountSavings,
  savingsGoalForecast,
  type Account,
  type Transaction,
} from "./finance";
import { monthlyOutlook } from "./monthly-outlook";
const accounts: Account[] = [
  {
    id: "bank",
    name: "Banco",
    type: "bank",
    initial_balance: "1000",
    archived: false,
  },
  {
    id: "card",
    name: "Crédito",
    type: "credit",
    initial_balance: "0",
    archived: false,
    statement_day: 18,
    payment_day: 28,
  },
];
const purchase: Transaction = {
  id: "purchase",
  kind: "expense",
  amount: "300",
  date: "2026-08-20",
  description: "Compra",
  account_id: "card",
  destination_id: null,
  category_id: "shopping",
  installment_months: 3,
  installments_paid: 0,
};
const historical: Transaction = {
  ...purchase,
  id: "historical",
  date: "2026-06-20",
  installments_paid: 2,
};
const outright: Transaction = {
  ...purchase,
  id: "outright",
  amount: "50",
  date: "2026-09-10",
  installment_months: undefined,
};
const payment: Transaction = {
  id: "payment",
  kind: "transfer",
  amount: "250",
  date: "2026-09-28",
  description: "Pago",
  account_id: "bank",
  destination_id: "card",
  category_id: null,
  credit_payment_month: "2026-09-01",
  credit_payment_allocations: [
    { transaction_id: "purchase", amount_cents: 10000 },
    { transaction_id: "historical", amount_cents: 10000 },
    { transaction_id: "outright", amount_cents: 5000 },
  ],
};
it("aplica un pago completo sin duplicar los abonos históricos, avanza meses y reduce el ahorro", () => {
  const rows = [purchase, historical, outright];
  expect(monthlyOutlook(accounts, rows, "2026-09-28").due).toBe(25000);
  const result = monthlyOutlook(accounts, [...rows, payment], "2026-09-28");
  expect(result.due).toBe(0);
  expect(result.cards[0].debt).toBe(20000);
  expect(result.cards[0].appliedPayments).toBe(25000);
  expect(result.purchases.map((p) => p.paidMonths)).toEqual([1, 3, 1]);
  expect(result.cash).toBe(75000);
  expect(accountSavings(accounts, [...rows, payment], "2026-09-28")).toBe(
    75000,
  );
  expect(purchase.installments_paid).toBe(0);
  expect(historical.installments_paid).toBe(2);
  expect(monthlyOutlook(accounts, rows, "2026-09-28").due).toBe(25000);
});
it("paga el siguiente periodo y mantiene intactos los importes originales", () => {
  const second: Transaction = {
    ...payment,
    id: "second",
    amount: "100",
    date: "2026-10-28",
    credit_payment_month: "2026-10-01",
    credit_payment_allocations: [
      { transaction_id: "purchase", amount_cents: 10000 },
    ],
  };
  const result = monthlyOutlook(
    accounts,
    [purchase, historical, outright, payment, second],
    "2026-10-28",
  );
  expect(result.due).toBe(0);
  expect(result.purchases.find((p) => p.id === purchase.id)?.paidMonths).toBe(
    2,
  );
  expect(result.cards[0].debt).toBe(10000);
  expect(result.cash).toBe(65000);
});
it("las metas usan el mismo ahorro y la capacidad completa, sin dividir 10980 entre dos", () => {
  const investment = {
    ...accounts[0],
    id: "investment",
    type: "investment",
    initial_balance: "2000",
  };
  const cashExpense = {
    ...purchase,
    id: "expense",
    kind: "expense" as const,
    account_id: "bank",
    amount: "20",
    installment_months: undefined,
    date: "2026-09-28",
  };
  const saved = accountSavings(
    [...accounts, investment],
    [payment, cashExpense],
    "2026-09-28",
  );
  expect(saved).toBe(273000);
  const goal = {
    id: "a",
    name: "Meta",
    horizon: "short" as const,
    target_amount: "100000",
    saved_amount: "0",
    archived: false,
  };
  const result = savingsGoalForecast(
    [goal, { ...goal, id: "b" }],
    1098000,
    saved,
  );
  expect(result.map((p) => p.saved)).toEqual([saved, saved]);
  expect(result.map((p) => p.monthly)).toEqual([1098000, 1098000]);
});
