import { expect, it } from "vitest";
import { spendingByCategory, totals, type Transaction } from "./finance";

it("incluye todas las categorías y conserva los gastos sin categoría en el total", () => {
  const transactions: Transaction[] = [
    ["expense", "food", "10.25"],
    ["expense", "food", "0.75"],
    ["expense", "travel", "20.00"],
    ["expense", null, "3.00"],
    ["expense", "deleted", "2.00"],
    ["income", "food", "100.00"],
    ["transfer", null, "50.00"],
  ].map(([kind, category_id, amount], index) => ({
    id: String(index),
    kind,
    category_id,
    amount,
    date: "2026-11-08",
    description: "Movimiento",
    account_id: "account",
    destination_id: null,
  })) as Transaction[];
  const categories = [
    { id: "food", name: "Comida", kind: "expense" as const, archived: false },
    { id: "travel", name: "Viajes", kind: "expense" as const, archived: true },
  ];
  const result = spendingByCategory(transactions, categories);
  expect(result).toEqual([
    { id: "travel", name: "Viajes", value: 2000 },
    { id: "food", name: "Comida", value: 1100 },
    { id: null, name: "Sin categoría", value: 500 },
  ]);
  expect(result.reduce((sum, category) => sum + category.value, 0)).toBe(
    totals(transactions).expense,
  );
  expect(spendingByCategory([], categories)).toEqual([]);
});
