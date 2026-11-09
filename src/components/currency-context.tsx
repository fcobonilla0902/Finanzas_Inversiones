import { createContext, useContext } from "react";
import { formatConverted, type Currency } from "../lib/currency";

export const CurrencyContext = createContext({
  currency: "MXN" as Currency,
  rate: 1,
});
export function useMoney() {
  const { currency, rate } = useContext(CurrencyContext);
  return (cents: number, compact = false) =>
    formatConverted(cents, currency, rate, compact);
}
