import { describe, expect, it } from "vitest";
import { balance, type Account, type Transaction } from "./finance";
import { monthlyOutlook } from "./monthly-outlook";

export const accounts: Account[] = [
  {
    id: "bank",
    name: "Débito",
    type: "bank",
    initial_balance: "20000",
    archived: false,
  },
  {
    id: "investment",
    name: "Inversión",
    type: "investment",
    initial_balance: "10000",
    archived: false,
  },
  {
    id: "card",
    name: "Tarjeta",
    type: "credit",
    initial_balance: "0",
    archived: false,
    statement_day: 15,
    payment_day: 5,
  },
];
let movementId = 0;
function movement(
  kind: Transaction["kind"],
  amount: string,
  account_id: string,
  date = "2026-11-08",
  extra: Partial<Transaction> = {},
): Transaction {
  return {
    id: String(++movementId),
    kind,
    amount,
    account_id,
    date,
    destination_id: null,
    category_id: null,
    description: "Movimiento",
    ...extra,
  };
}
export const transactions: Transaction[] = [
  movement("income", "1350", "bank"),
  movement("expense", "2000", "bank"),
  movement("expense", "6000", "card", "2026-10-10", { installment_months: 6 }),
  movement("expense", "2000", "card", "2026-10-15"),
  movement("expense", "500", "card", "2026-11-01"),
  movement("transfer", "1000", "bank", "2026-11-05", {
    destination_id: "card",
  }),
];

describe("cierre mensual estimado", () => {
  it("respeta el corte 18, pago 28 y los abonos históricos al calcular noviembre", () => {
    const card = { ...accounts[2], statement_day: 18, payment_day: 28 };
    const purchases: [string, string, number, number][] = [
      ["332.09", "2026-08-30", 3, 2],
      ["269.09", "2026-09-11", 3, 2],
      ["784.12", "2026-09-13", 3, 2],
      ["446.15", "2026-09-19", 3, 1],
      ["359.98", "2026-09-27", 4, 1],
      ["449.00", "2026-10-04", 4, 1],
      ["516.56", "2026-10-04", 3, 1],
      ["516.00", "2026-10-08", 4, 1],
      ["239.40", "2026-10-22", 4, 0],
      ["1494.97", "2026-11-05", 3, 0],
    ];
    const rows = purchases.map(
      ([amount, date, installment_months, installments_paid]) =>
        movement("expense", amount, "card", date, {
          installment_months,
          installments_paid,
        }),
    );
    rows.push(
      movement("expense", "127.99", "card"),
      movement("expense", "206.00", "card"),
    );
    const result = monthlyOutlook(
      [{ ...accounts[0], initial_balance: "150" }, card],
      rows,
      "2026-11-08",
    );
    expect(result.due).toBe(200608);
    expect(result.installmentDue).toBe(167209);
    expect(result.outrightDue).toBe(33399);
    expect(result.installmentDue + result.outrightDue + result.otherDue).toBe(
      result.due,
    );
    expect(
      result.purchases.slice(0, 10).reduce((sum, p) => sum + p.total, 0),
    ).toBe(167209);
    expect(
      result.purchases.slice(10).reduce((sum, p) => sum + p.total, 0),
    ).toBe(33399);
    expect(result.remaining).toBe(-185608);
    expect(result.cards[0].debt).toBe(416564);
    expect(result.cards[0]).toMatchObject({
      purchased: 574135,
      markedPaid: 157571,
    });
    expect(result.purchases.reduce((sum, p) => sum + p.remaining, 0)).toBe(
      result.cards[0].debt,
    );
    const portfolio = monthlyOutlook(
      [
        { ...accounts[0], initial_balance: "150" },
        card,
        { ...accounts[1], initial_balance: "55041.99" },
        { ...accounts[1], id: "turbo", initial_balance: "25336.21" },
      ],
      [...rows, movement("income", "1350", "investment", "2026-11-06")],
      "2026-11-08",
    );
    expect(portfolio).toMatchObject({
      totalFunds: 8187820,
      due: 200608,
      remaining: 7987212,
    });
    const withoutHistory = rows.map((t) => ({ ...t, installments_paid: 0 }));
    expect(monthlyOutlook([card], withoutHistory, "2026-11-08").due).toBe(
      358179,
    );
  });
  it("usa corte y último día de pago configurados para decidir el mes de vencimiento", () => {
    const card = { ...accounts[2], statement_day: 18, payment_day: 28 };
    const purchase = movement("expense", "100", "card", "2026-11-18");
    expect(monthlyOutlook([card], [purchase], "2026-11-18").due).toBe(10000);
    expect(
      monthlyOutlook(
        [card],
        [{ ...purchase, date: "2026-11-19" }],
        "2026-11-19",
      ).due,
    ).toBe(0);
    expect(
      monthlyOutlook([{ ...card, payment_day: 5 }], [purchase], "2026-11-18")
        .due,
    ).toBe(0);
  });
  it("separa inversiones, efectivo y deuda, sin descontar otra vez gastos ni pagos realizados", () => {
    const result = monthlyOutlook(accounts, transactions, "2026-11-08");
    expect(result).toMatchObject({
      investments: 1000000,
      cash: 1835000,
      cashExpenses: 200000,
      due: 200000,
      remaining: 2635000,
      incomplete: false,
      cashBeforeExpenses: 2035000,
      fundsBeforeExpenses: 3035000,
      expenses: 400000,
    });
    expect(result.fundsBeforeExpenses - result.expenses).toBe(result.remaining);
    expect(result.cards[0]).toMatchObject({
      debt: 750000,
      installmentDebt: 500000,
      outrightDebt: 250000,
      dueThisMonth: 200000,
    });
    expect(result.cards[0].debt).toBe(-balance(accounts[2], transactions));
  });
  it("incluye atrasos y excluye compras y movimientos futuros", () => {
    const future = movement("income", "10000", "bank", "2026-12-01");
    const result = monthlyOutlook(
      accounts,
      [...transactions, future],
      "2026-11-08",
    );
    expect(result.cash).toBe(1835000);
    expect(monthlyOutlook(accounts, transactions, "2026-12-08").due).toBe(
      350000,
    );
  });
  it("reconoce meses pagados sin inventar salidas de efectivo ni duplicar transferencias", () => {
    const marked = transactions.map((t) =>
      t.installment_months ? { ...t, installments_paid: 6 } : t,
    );
    const result = monthlyOutlook(accounts, marked, "2026-11-08");
    expect(result.cards[0]).toMatchObject({
      installmentDebt: 0,
      outrightDebt: 250000,
      dueThisMonth: 200000,
    });
    expect(result.cash).toBe(
      monthlyOutlook(accounts, transactions, "2026-11-08").cash,
    );
    const extraPayment = movement("transfer", "6500", "bank", "2026-11-08", {
      destination_id: "card",
    });
    expect(
      monthlyOutlook(accounts, [...marked, extraPayment], "2026-11-08").due,
    ).toBe(50000);
  });
  it("bloquea el cierre si quedan deudas sin fechas o un saldo inicial sin vencimiento", () => {
    const noDates = accounts.map((a) => ({
      ...a,
      statement_day: null,
      payment_day: null,
    }));
    expect(monthlyOutlook(noDates, transactions, "2026-11-08")).toMatchObject({
      incomplete: true,
      remaining: null,
    });
    const startingDebt = accounts.map((a) =>
      a.type === "credit" ? { ...a, initial_balance: "-200" } : a,
    );
    expect(monthlyOutlook(startingDebt, [], "2026-11-08").remaining).toBeNull();
  });
  it("admite saldos a favor y no compensa deudas entre tarjetas", () => {
    const extraCard = { ...accounts[2], id: "other", initial_balance: "10000" };
    const result = monthlyOutlook(
      [...accounts, extraCard],
      transactions,
      "2026-11-08",
    );
    expect(result.due).toBe(200000);
    expect(result.cards[1].debt).toBe(0);
    const paid = [
      ...transactions,
      movement("transfer", "8000", "bank", "2026-11-08", {
        destination_id: "card",
      }),
    ];
    expect(monthlyOutlook(accounts, paid, "2026-11-08").cards[0].debt).toBe(0);
  });
  it("conserva centavos y ajusta pagos al último día del mes", () => {
    const card = { ...accounts[2], statement_day: 15, payment_day: 31 };
    const purchase = movement("expense", "100.01", "card", "2026-12-16", {
      installment_months: 3,
    });
    expect(monthlyOutlook([card], [purchase], "2027-02-01").due).toBe(6668);
    expect(monthlyOutlook([card], [purchase], "2027-03-01").cards[0].debt).toBe(
      10001,
    );
  });
  it("no descuenta movimientos entre cuentas propias del dinero disponible", () => {
    const transfer = movement("transfer", "3000", "bank", "2026-11-08", {
      destination_id: "savings",
    });
    const savings = {
      ...accounts[0],
      id: "savings",
      initial_balance: "0",
      archived: true,
    };
    expect(
      monthlyOutlook([...accounts, savings], [transfer], "2026-11-08")
        .remaining,
    ).toBe(3000000);
    expect(monthlyOutlook([], [], "2026-11-08").remaining).toBe(0);
  });
});
