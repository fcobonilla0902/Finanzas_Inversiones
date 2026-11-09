export const currencies = {
  MXN: "Peso mexicano",
  USD: "Dólar estadounidense",
  EUR: "Euro",
  GBP: "Libra esterlina",
  CAD: "Dólar canadiense",
  JPY: "Yen japonés",
  CHF: "Franco suizo",
  AUD: "Dólar australiano",
  CNY: "Yuan chino",
  BRL: "Real brasileño",
} as const;
export type Currency = keyof typeof currencies;

export interface ExchangeRates {
  rates: Record<Currency, number>;
  date: string;
  checkedAt: string;
}

export async function fetchExchangeRates(
  signal?: AbortSignal,
): Promise<ExchangeRates> {
  const quotes = Object.keys(currencies)
    .filter((code) => code !== "MXN")
    .join(",");
  const response = await fetch(
    `https://api.frankfurter.dev/v2/rates?base=MXN&quotes=${quotes}`,
    { signal },
  );
  if (!response.ok) throw Error("No se pudo consultar el tipo de cambio.");
  const rows: unknown = await response.json();
  if (!Array.isArray(rows)) throw Error("Respuesta de cotizaciones inválida.");
  const rates = { MXN: 1 } as Record<Currency, number>;
  const dates: string[] = [];
  for (const code of Object.keys(currencies) as Currency[]) {
    if (code === "MXN") continue;
    const row = rows.find((row) => row?.base === "MXN" && row?.quote === code);
    if (
      !row ||
      typeof row.rate !== "number" ||
      !Number.isFinite(row.rate) ||
      row.rate <= 0 ||
      typeof row.date !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(row.date) ||
      !Number.isFinite(Date.parse(row.date))
    )
      throw Error("Faltan cotizaciones válidas.");
    rates[code] = row.rate;
    dates.push(row.date);
  }
  return { rates, date: dates.sort()[0], checkedAt: new Date().toISOString() };
}

export function formatConverted(
  cents: number,
  currency: Currency,
  rate: number,
  compact = false,
) {
  if (!Number.isFinite(rate) || rate <= 0)
    throw Error("Tipo de cambio inválido.");
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency,
    currencyDisplay: currency === "MXN" ? "symbol" : "code",
    ...(compact ? { notation: "compact" as const } : {}),
  }).format((cents / 100) * rate);
}
