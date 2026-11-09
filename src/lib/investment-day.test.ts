import { expect, it } from "vitest";
import { investmentDay } from "./finance";

it("cambia el día de inversión a medianoche de Ciudad de México", () => {
  expect(investmentDay(new Date("2026-11-10T05:59:59Z"))).toBe("2026-11-09");
  expect(investmentDay(new Date("2026-11-10T06:00:00Z"))).toBe("2026-11-10");
  expect(investmentDay(new Date("2027-01-01T05:59:59Z"))).toBe("2026-12-31");
});
