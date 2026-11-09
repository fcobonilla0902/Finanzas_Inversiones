import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("el cierre distingue saldos, deuda y pago mensual sin desbordamiento", async ({
  page,
}, info) => {
  await page.goto("/tests/fixtures/monthly-outlook.html");
  await expect(
    page.getByRole("heading", { name: "Tu cierre de mes" }),
  ).toBeVisible();
  await expect(page.locator(".monthly-final")).toHaveText("$27,000.00");
  await expect(
    page.locator(".balance-row").filter({ hasText: "A meses por pagar" }),
  ).toContainText("$1,000.00");
  await expect(
    page.locator(".balance-row").filter({ hasText: "De contado por pagar" }),
  ).toContainText("$0.00");
  await expect(page.locator(".monthly-subtotal")).toHaveText("$28,000.00");
  await expect(page.locator(".monthly-credit-total")).toHaveText("$1,000.00");
  const sizes = await page
    .locator(".monthly-outlook > strong")
    .evaluateAll((elements) =>
      elements.map((e) => parseFloat(getComputedStyle(e).fontSize)),
    );
  expect(sizes[0]).toBeLessThan(sizes[2]);
  expect(sizes[1]).toBeLessThan(sizes[2]);
  await expect(
    page.locator(".balance-row").filter({ hasText: "antes de gastos" }),
  ).toContainText("$20,000.00");
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
  await page.screenshot({
    path: info.outputPath("monthly-outlook.png"),
    fullPage: true,
  });
  await page
    .getByText("Ver saldo pendiente y fechas por tarjeta", { exact: true })
    .click();
  await expect(page.locator("details")).toHaveJSProperty("open", true);
  await expect(page.locator("details")).toContainText("Día de corte: 15");
  await expect(
    page
      .locator("details .balance-row")
      .filter({ hasText: "Saldo pendiente estimado de compras" }),
  ).toContainText("$6,000.00");
  await page.screenshot({
    path: info.outputPath("monthly-outlook-detail.png"),
    fullPage: true,
  });
  await page
    .getByText("Ver saldo pendiente y fechas por tarjeta", { exact: true })
    .click();
  await expect(page.locator("details")).toHaveJSProperty("open", false);
  await page
    .getByRole("button", { name: "Registrar pago de prueba", exact: true })
    .click();
  await expect(page.locator(".monthly-credit-total")).toHaveText("$0.00");
  await expect(page.locator(".monthly-final")).toHaveText("$27,000.00");
  await page
    .getByText("Ver saldo pendiente y fechas por tarjeta", { exact: true })
    .click();
  await expect(
    page
      .locator("details .balance-row")
      .filter({ hasText: "Otros abonos aplicados a compras" }),
  ).toContainText("$1,000.00");
  await expect(
    page
      .locator("details .balance-row")
      .filter({ hasText: "Saldo pendiente estimado de compras" }),
  ).toContainText("$5,000.00");
  await page.screenshot({
    path: info.outputPath("monthly-outlook-after-payment.png"),
    fullPage: true,
  });
});
