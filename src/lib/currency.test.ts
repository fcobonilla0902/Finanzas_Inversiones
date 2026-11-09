import { afterEach, expect, it, vi } from "vitest";
import { currencies, fetchExchangeRates, formatConverted } from "./currency";

afterEach(() => vi.unstubAllGlobals());

it("convierte desde centavos MXN sin cambiar el importe original", () => {
  expect(formatConverted(200_000, "USD", 0.05)).toContain("100.00");
  expect(formatConverted(-200_000, "EUR", 0.04)).toMatch(/^-EUR\s80\.00$/);
  expect(formatConverted(200_000, "MXN", 1)).toBe("$2,000.00");
  expect(formatConverted(200_000, "JPY", 8)).toContain("16,000");
});

it("rechaza cotizaciones inválidas", () => {
  for (const rate of [0, -1, NaN, Infinity]) {
    expect(() => formatConverted(100, "USD", rate)).toThrow();
  }
});

it("valida todas las monedas y conserva la fecha más antigua de la referencia", async () => {
  const rows = Object.keys(currencies)
    .filter((code) => code !== "MXN")
    .map((quote) => ({
      base: "MXN",
      quote,
      rate: 0.05,
      date: quote === "EUR" ? "2026-11-06" : "2026-11-09",
    }));
  const fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => rows });
  vi.stubGlobal("fetch", fetch);
  const result = await fetchExchangeRates();
  expect(result.rates.USD).toBe(0.05);
  expect(result.rates.MXN).toBe(1);
  expect(result.date).toBe("2026-11-06");
  expect(fetch.mock.calls[0][0]).toContain("base=MXN");
  rows[0].rate = -1;
  await expect(fetchExchangeRates()).rejects.toThrow();
  rows.splice(0, 1);
  await expect(fetchExchangeRates()).rejects.toThrow();
});

it("rechaza fallos HTTP y respuestas inesperadas", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
  await expect(fetchExchangeRates()).rejects.toThrow();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({ ok: true, json: async () => ({ rates: {} }) }),
  );
  await expect(fetchExchangeRates()).rejects.toThrow();
});
