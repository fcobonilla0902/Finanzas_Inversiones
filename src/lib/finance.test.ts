import { describe, it, expect } from "vitest";
import {
  cents,
  balance,
  totals,
  netWorth,
  compound,
  budgetRemaining,
  investmentReturns,
  parseAnnualReturnRate,
  creditCardDebt,
  monthlySavingsCapacity,
  savingsGoalForecast,
  goalTimeLabel,
  installmentSummary,
  installmentBilling,
  type SavingsGoal,
  type Account,
  type Transaction,
} from "./finance";
describe("compras a meses", () => {
  const card: Account = {
    id: "c",
    name: "Crédito",
    type: "credit",
    initial_balance: "0",
    archived: false,
    statement_day: 15,
    payment_day: 5,
  };
  const purchase: Transaction = {
    id: "p",
    kind: "expense",
    amount: "100.01",
    date: "2026-11-15",
    description: "Compra",
    account_id: "c",
    destination_id: null,
    category_id: "x",
    installment_months: 3,
    installments_paid: 0,
  };
  it("asigna el día de corte al ciclo actual y el posterior al siguiente", () => {
    expect(installmentBilling(purchase, card, "2026-12")?.thisMonth).toBe(3334);
    expect(installmentBilling(purchase, card, "2026-12")?.dueDate).toBe(
      "2026-12-05",
    );
    expect(
      installmentBilling({ ...purchase, date: "2026-11-16" }, card, "2026-12")
        ?.thisMonth,
    ).toBe(0);
    expect(
      installmentBilling({ ...purchase, date: "2026-11-16" }, card, "2027-01")
        ?.thisMonth,
    ).toBe(3334);
  });
  it("separa atrasos y excluye mensualidades ya marcadas pagadas", () => {
    expect(installmentBilling(purchase, card, "2027-02")).toMatchObject({
      thisMonth: 3333,
      overdue: 6668,
      total: 10001,
    });
    expect(
      installmentBilling(
        { ...purchase, installments_paid: 2 },
        card,
        "2027-02",
      ),
    ).toMatchObject({ thisMonth: 3333, overdue: 0 });
    expect(
      installmentBilling({ ...purchase, installments_paid: 3 }, card, "2027-02")
        ?.total,
    ).toBe(0);
    expect(installmentBilling(purchase, card, "2027-03")).toMatchObject({
      thisMonth: 0,
      overdue: 10001,
      dueDate: null,
    });
  });
  it("ajusta meses cortos, años bisiestos y pago después del corte", () => {
    const feb = { ...purchase, date: "2024-02-29" };
    expect(
      installmentBilling(
        feb,
        { ...card, statement_day: 31, payment_day: 30 },
        "2024-03",
      )?.firstPaymentDate,
    ).toBe("2024-03-30");
    expect(
      installmentBilling(
        { ...purchase, date: "2024-01-20" },
        { ...card, statement_day: 15, payment_day: 31 },
        "2024-02",
      )?.dueDate,
    ).toBe("2024-02-29");
    expect(
      installmentBilling(purchase, { ...card, payment_day: 20 }, "2026-11")
        ?.thisMonth,
    ).toBe(3334);
    expect(
      installmentBilling(purchase, { ...card, statement_day: null }, "2026-12"),
    ).toBeNull();
  });
  it("reparte centavos sin perder dinero ni duplicar la deuda", () => {
    const purchase = {
      id: "p",
      kind: "expense" as const,
      amount: "100.01",
      date: "2026-11-08",
      description: "Compra",
      account_id: "card",
      destination_id: null,
      category_id: "c",
      installment_months: 3,
      installments_paid: 2,
    };
    const summary = installmentSummary(purchase);
    expect(summary.nextPayment).toBe(3333);
    expect(summary.remaining).toBe(3333);
    expect(summary.remainingMonths).toBe(1);
    expect(
      installmentSummary({ ...purchase, installments_paid: 0 }).nextPayment,
    ).toBe(3334);
    expect(
      installmentSummary({ ...purchase, installments_paid: 3 }).remaining,
    ).toBe(0);
    expect(
      installmentSummary({ ...purchase, installments_paid: 3 }).nextPayment,
    ).toBe(0);
    const card = {
      id: "card",
      name: "Tarjeta",
      type: "credit",
      initial_balance: "0.00",
      archived: false,
    };
    expect(balance(card, [purchase])).toBe(-10001);
    expect(balance(card, [{ ...purchase, installments_paid: 3 }])).toBe(-10001);
    expect(totals([purchase]).expense).toBe(10001);
  });
});
const a: Account = {
  id: "a",
  name: "Banco",
  type: "bank",
  initial_balance: "1000.00",
  archived: false,
};
const b: Account = {
  ...a,
  id: "b",
  name: "Inversión",
  type: "investment",
  initial_balance: "0.00",
};
const t: Transaction = {
  id: "t",
  kind: "transfer",
  amount: "300.25",
  date: "2026-11-07",
  description: "Aportación",
  account_id: "a",
  destination_id: "b",
  category_id: null,
};
describe("Contabilidad en centavos", () => {
  it("convierte decimales sin error binario", () => {
    expect(cents("0.29")).toBe(29);
    expect(cents("-12.01")).toBe(-1201);
    expect(() => cents("1.005")).toThrow();
    expect(() => cents("NaN")).toThrow();
  });
  it("transfiere sin duplicar patrimonio ni ingresos", () => {
    expect(balance(a, [t])).toBe(69975);
    expect(balance(b, [t])).toBe(30025);
    expect(netWorth([a, b], [t])).toBe(100000);
    expect(totals([t])).toEqual({ income: 0, expense: 0, net: 0, savings: 0 });
  });
  it("recalcula al editar o eliminar movimientos", () => {
    const expense = {
      ...t,
      kind: "expense" as const,
      destination_id: null,
      amount: "10.15",
    };
    expect(balance(a, [expense])).toBe(98985);
    expect(balance(a, [])).toBe(100000);
    expect(totals([expense]).net).toBe(-1015);
  });
  it("resta la deuda y el pago de tarjeta conserva patrimonio", () => {
    const debt = { ...b, type: "credit", initial_balance: "-500.00" };
    expect(netWorth([a, debt], [])).toBe(50000);
    expect(netWorth([a, debt], [t])).toBe(50000);
    expect(balance(debt, [t])).toBe(-19975);
  });
  it("separa interés compuesto y capital aportado", () => {
    const last = compound(10000, 0, 0.12, 1, 12).at(-1)!;
    expect(last.value).toBeCloseTo(11268.25, 2);
    expect(last.contributed).toBe(10000);
  });
  it("aporta al final de mes y permite tasa cero", () => {
    expect(compound(100, 10, 0, 1).at(-1)).toEqual({
      year: 1,
      value: 220,
      contributed: 220,
    });
  });
  it("compara saldo presupuestado incluido exceso", () => {
    expect(budgetRemaining(200000, 150050)).toBe(49950);
    expect(budgetRemaining(100, 150)).toBe(-50);
  });
  it("calcula ahorro sin dividir entre cero", () => {
    expect(totals([]).savings).toBe(0);
    const income = {
      ...t,
      kind: "income" as const,
      destination_id: null,
      amount: "100.00",
    };
    const expense = {
      ...income,
      id: "e",
      kind: "expense" as const,
      amount: "25.00",
    };
    expect(totals([income, expense]).savings).toBe(75);
  });
});

describe("Deuda de tarjetas y previsión de metas", () => {
  const goal: SavingsGoal = {
    id: "g1",
    name: "Emergencia",
    horizon: "short",
    target_amount: "10000.00",
    saved_amount: "1000.00",
    archived: false,
  };
  it("suma deudas por tarjeta sin compensarlas con saldos a favor, incluso archivadas", () => {
    const card = {
      ...a,
      id: "credit",
      type: "credit",
      initial_balance: "-1000.00",
    };
    const positive = { ...card, id: "positive", initial_balance: "200.00" };
    const archived = {
      ...card,
      id: "archived",
      initial_balance: "-50.00",
      archived: true,
    };
    const payment = { ...t, amount: "500.00", destination_id: "credit" };
    const charge = {
      ...t,
      id: "charge",
      kind: "expense" as const,
      amount: "100.00",
      account_id: "credit",
      destination_id: null,
    };
    const future = {
      ...payment,
      id: "future",
      amount: "999.00",
      date: "2026-11-09",
    };
    const result = creditCardDebt(
      [a, card, positive, archived],
      [payment, charge, future],
      "2026-11-08",
    );
    expect(result.total).toBe(65000);
    expect(result.cards.map((entry) => entry.debt)).toEqual([60000, 0, 5000]);
    expect(card.initial_balance).toBe("-1000.00");
    expect(creditCardDebt([], []).total).toBe(0);
  });
  it("usa ingresos menos gastos del mes hasta hoy, sin duplicar transferencias", () => {
    const income = {
      ...t,
      kind: "income" as const,
      amount: "3000.00",
      destination_id: null,
    };
    const expense = {
      ...income,
      id: "expense",
      kind: "expense" as const,
      amount: "1000.00",
    };
    const previous = {
      ...income,
      id: "previous",
      date: "2026-10-31",
      amount: "99999.00",
    };
    const future = {
      ...income,
      id: "future",
      date: "2026-11-09",
      amount: "99999.00",
    };
    expect(
      monthlySavingsCapacity(
        [income, expense, t, previous, future],
        undefined,
        "2026-11-08",
      ),
    ).toEqual({
      source: "recorded",
      income: 300000,
      expense: 100000,
      available: 200000,
    });
    expect(monthlySavingsCapacity([], undefined, "2026-11-08").available).toBe(
      0,
    );
  });
  it("un presupuesto manual sustituye la base registrada y conserva déficits", () => {
    const plan = {
      id: "plan",
      source: "budget" as const,
      monthly_income: "20000.00",
      monthly_expenses: "15000.00",
    };
    expect(monthlySavingsCapacity([t], plan).available).toBe(500000);
    expect(
      monthlySavingsCapacity([], { ...plan, monthly_expenses: "25000.00" })
        .available,
    ).toBe(-500000);
  });
  it("usa la capacidad completa como referencia independiente para cada meta", () => {
    const second = {
      ...goal,
      id: "g2",
      target_amount: "6000.00",
      saved_amount: "0.00",
    };
    const complete = { ...goal, id: "g3", saved_amount: "10000.00" };
    const archived = { ...goal, id: "g4", archived: true };
    const result = savingsGoalForecast(
      [goal, second, complete, archived],
      300000,
    );
    expect(result.map((entry) => entry.monthly)).toEqual([
      300000, 300000, 0, 0,
    ]);
    expect(result.map((entry) => entry.months)).toEqual([3, 2, 0, null]);
  });
  it("no divide la capacidad ni promete plazos sin ahorro mensual", () => {
    const second = { ...goal, id: "g2" };
    expect(
      savingsGoalForecast([second, goal], 1).map((entry) => entry.monthly),
    ).toEqual([1, 1]);
    for (const capacity of [0, -100])
      expect(savingsGoalForecast([goal], capacity)[0].months).toBeNull();
    const overfunded = savingsGoalForecast(
      [{ ...goal, saved_amount: "15000.00" }],
      0,
    )[0];
    expect(overfunded.progress).toBe(100);
    expect(overfunded.months).toBe(0);
    expect(overfunded.remaining).toBe(0);
  });
  it("presenta plazos aproximados sin fechas imposibles", () => {
    expect(goalTimeLabel(null)).toBe("Sin plazo estimable");
    expect(goalTimeLabel(0)).toBe("Meta alcanzada");
    expect(goalTimeLabel(1)).toBe("1 mes");
    expect(goalTimeLabel(13)).toBe("1 año y 1 mes");
    expect(goalTimeLabel(24)).toBe("2 años");
    expect(goalTimeLabel(1201)).toBe("Más de 100 años");
  });
});

describe("Rendimiento estimado de cuentas de inversión", () => {
  const investment: Account = {
    ...b,
    initial_balance: "10000.00",
    annual_return_rate: "10",
  };
  it("proyecta interés simple en centavos por 1, 7, 30 y 365 días", () => {
    const result = investmentReturns([investment], [], "2026-11-08");
    expect(result.principal).toBe(1000000);
    expect(result.daily).toBe(274);
    expect(result.weekly).toBe(1918);
    expect(result.monthly).toBe(8219);
    expect(result.annual).toBe(100000);
    expect(netWorth([investment], [])).toBe(1000000);
    expect(totals([]).income).toBe(0);
  });
  it("usa las transferencias y retiros registrados hasta la fecha, sin ingresos futuros", () => {
    const future = {
      ...t,
      id: "future",
      kind: "income" as const,
      account_id: "b",
      destination_id: null,
      amount: "99999.00",
      date: "2026-11-09",
    };
    const withdrawal = {
      ...t,
      id: "withdrawal",
      account_id: "b",
      destination_id: "a",
      amount: "100.00",
    };
    const result = investmentReturns(
      [investment],
      [t, withdrawal, future],
      "2026-11-08",
    );
    expect(result.principal).toBe(1020025);
    expect(result.annual).toBe(102003);
  });
  it("suma tasas distintas y redondea después de agregar las cuentas", () => {
    const first = {
      ...investment,
      initial_balance: "10.00",
      annual_return_rate: "10",
    };
    const second = {
      ...investment,
      id: "second",
      initial_balance: "10.00",
      annual_return_rate: "20",
    };
    const result = investmentReturns([first, second], [], "2026-11-08");
    expect(result.annual).toBe(300);
    expect(result.daily).toBe(1);
  });
  it("distingue una tasa cero de una no configurada y omite cuentas archivadas o ajenas al tipo", () => {
    const zero = { ...investment, annual_return_rate: "0" };
    const result = investmentReturns(
      [
        zero,
        { ...investment, id: "missing", annual_return_rate: null },
        { ...investment, id: "archived", archived: true },
        { ...investment, id: "bank", type: "bank" },
      ],
      [],
      "2026-11-08",
    );
    expect(result.investments).toHaveLength(1);
    expect(result.annual).toBe(0);
    expect(investmentReturns([b], []).investments).toEqual([]);
  });
  it("no proyecta ganancias para saldos negativos ni tasas inválidas", () => {
    expect(
      investmentReturns([{ ...investment, initial_balance: "-100.00" }], [])
        .principal,
    ).toBe(0);
    for (const rate of ["NaN", "Infinity", "-1", "101", ""]) {
      expect(
        investmentReturns([{ ...investment, annual_return_rate: rate }], [])
          .investments,
      ).toEqual([]);
    }
  });
  it("valida tasas opcionales con hasta cuatro decimales", () => {
    expect(parseAnnualReturnRate("")).toBeNull();
    expect(parseAnnualReturnRate(" 10.1250 ")).toBe("10.125");
    expect(parseAnnualReturnRate("0")).toBe("0");
    expect(parseAnnualReturnRate("100")).toBe("100");
    for (const rate of [
      "-1",
      "100.01",
      "1.12345",
      "NaN",
      "Infinity",
      "1e2",
      "8,5",
    ])
      expect(() => parseAnnualReturnRate(rate)).toThrow();
  });
});
