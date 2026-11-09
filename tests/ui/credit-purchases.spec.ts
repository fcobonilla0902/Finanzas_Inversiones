import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function purchase(
  page: Page,
  description: string,
  amount: string,
  months: string,
) {
  await page
    .getByRole("button", { name: "Registrar compra", exact: true })
    .click();
  await page.getByLabel("Cantidad en MXN", { exact: true }).fill(amount);
  await page.getByLabel("Descripción", { exact: true }).fill(description);
  await page.getByLabel("Fecha", { exact: true }).fill("2026-11-15");
  await page
    .getByRole("dialog")
    .getByRole("combobox", { name: "Categoría", exact: true })
    .selectOption("shopping");
  await page
    .getByRole("combobox", { name: "Plazo de la compra", exact: true })
    .selectOption(months);
  await page
    .getByRole("button", { name: "Guardar movimiento", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}

test("contado y meses actualizan el total y movimientos muestra el avance", async ({
  page,
}, info) => {
  test.setTimeout(120_000);
  await page.clock.setFixedTime(new Date("2026-11-30T12:00:00Z"));
  await page.goto("/tests/fixtures/installments.html");
  await purchase(page, "Compra a meses", "120.00", "3");
  await purchase(page, "Compra de contado", "60.00", "1");
  await page.getByLabel("Mes de pago", { exact: true }).fill("2026-12");
  const total = page.locator(".billing-summary .summary-amount");
  await expect(total).toHaveText("$100.00");
  await page
    .getByRole("combobox", { name: "Tipo de compra", exact: true })
    .selectOption("cash");
  await expect(total).toHaveText("$60.00");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page.locator("tbody tr")).toContainText("De contado");
  await page.getByLabel("Mes de pago", { exact: true }).fill("2026-11");
  await expect(total).toHaveText("$0.00");
  await page.getByLabel("Mes de pago", { exact: true }).fill("2026-12");
  await page
    .getByRole("combobox", { name: "Tipo de compra", exact: true })
    .selectOption("months");
  await expect(total).toHaveText("$40.00");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page
    .getByLabel("Meses pagados de Compra a meses", { exact: true })
    .fill("1");
  await page
    .getByRole("button", {
      name: "Guardar meses pagados de Compra a meses",
      exact: true,
    })
    .click();
  await expect(total).toHaveText("$0.00");
  await page
    .getByRole("combobox", { name: "Tipo de compra", exact: true })
    .selectOption("all");
  await expect(total).toHaveText("$60.00");
  await page.screenshot({
    path: info.outputPath("credit-purchases.png"),
    fullPage: true,
  });
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page
    .getByRole("button", { name: "Ver movimientos de prueba", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Cuenta", exact: true })
    .selectOption("card");
  await expect(
    page.locator(".movement").filter({ hasText: "Compra a meses" }),
  ).toContainText("Pagados: 1 de 3 · Siguiente: mes 2 de 3");
  await expect(page.locator(".payment-badge.installments")).toHaveText(
    "A 3 meses",
  );
  await expect(page.locator(".payment-badge.outright")).toHaveText(
    "De contado",
  );
  await expect(
    page.locator(".movement").filter({ hasText: "Compra de contado" }),
  ).toContainText("De contado");
  await expect(
    page.locator(".movement").filter({ hasText: "Compra de contado" }),
  ).not.toContainText("Siguiente");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("credit-movements.png"),
    fullPage: true,
  });
  await page
    .getByRole("combobox", { name: "Cuenta", exact: true })
    .selectOption("bank");
  await expect(page.locator(".movement")).toHaveCount(0);
});
