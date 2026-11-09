import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("el pago por categoría usa mensualidades y contado; el mes conserva importes completos", async ({
  page,
}, info) => {
  test.setTimeout(90_000);
  await page.clock.setFixedTime(new Date("2026-11-08T12:00:00Z"));
  await page.goto("/tests/fixtures/spending-periods.html");
  const payment = page.locator('[aria-labelledby="spending-cycle-title"]');
  const monthly = page.locator('[aria-labelledby="spending-month-title"]');
  await expect(payment.locator(".spending-total strong")).toHaveText("$360.00");
  await expect(
    payment.locator(".category-row").filter({ hasText: "Comida" }),
  ).toContainText("$160.00");
  await expect(
    payment.locator(".category-row").filter({ hasText: "Viajes" }),
  ).toContainText("$200.00");
  await expect(monthly.locator(".spending-total strong")).toHaveText("$790.00");
  await expect(
    monthly.locator(".category-row").filter({ hasText: "Sin categoría" }),
  ).toContainText("$50.00");
  await page.screenshot({
    path: info.outputPath("payment-and-month.png"),
    fullPage: true,
  });
  await page
    .getByRole("combobox", {
      name: "Tarjeta para el pago del mes",
      exact: true,
    })
    .selectOption("second");
  await expect(payment.locator(".spending-total strong")).toHaveText("$80.00");
  await expect(monthly.locator(".spending-total strong")).toHaveText("$790.00");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
});
