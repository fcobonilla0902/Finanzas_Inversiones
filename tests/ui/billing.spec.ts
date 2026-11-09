import { test, expect, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import AxeBuilder from "@axe-core/playwright";
async function purchase(
  page: Page,
  name: string,
  category: string,
  amount: string,
) {
  await page
    .getByRole("button", { name: "Registrar compra", exact: true })
    .click();
  await page.getByLabel("Cantidad en MXN", { exact: true }).fill(amount);
  await page.getByLabel("Descripción", { exact: true }).fill(name);
  await page.getByLabel("Fecha", { exact: true }).fill("2026-11-15");
  await page
    .getByRole("dialog")
    .getByRole("combobox", { name: "Categoría", exact: true })
    .selectOption(category);
  await page
    .getByRole("combobox", { name: "Plazo de la compra", exact: true })
    .selectOption("3");
  await page
    .getByRole("button", { name: "Guardar movimiento", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
}
test("categorías, pagos del mes y Excel conservan importes y filtros", async ({
  page,
}, info) => {
  test.setTimeout(120_000);
  await page.clock.setFixedTime(new Date("2026-11-30T12:00:00Z"));
  await page.goto("/tests/fixtures/installments.html");
  await purchase(page, "Audífonos", "shopping", "100.01");
  await purchase(page, "Viaje", "travel", "120.00");
  await page.getByLabel("Mes de pago", { exact: true }).fill("2026-12");
  await expect(page.locator(".billing-summary .summary-amount")).toHaveText(
    "$73.34",
  );
  await page
    .getByRole("combobox", { name: "Categoría", exact: true })
    .selectOption("travel");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page.locator("tbody")).toContainText("Viaje");
  await expect(page.locator(".billing-summary .summary-amount")).toHaveText(
    "$40.00",
  );
  await page
    .getByRole("combobox", { name: "Categoría", exact: true })
    .selectOption("shopping");
  await expect(page.locator(".billing-summary .summary-amount")).toHaveText(
    "$33.34",
  );
  const downloaded = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Exportar a Excel", exact: true })
    .click();
  const download = await downloaded;
  expect(download.suggestedFilename()).toBe("compras-con-tarjeta-2026-12.xlsx");
  const output = info.outputPath("compras-filtradas.xlsx");
  await download.saveAs(output);
  const bytes = await readFile(output);
  expect(bytes.subarray(0, 4).toString("hex")).toBe("504b0304");
  const text = bytes.toString("utf8");
  expect(text).toContain("Audífonos");
  expect(text).not.toContain('<t xml:space="preserve">Viaje</t>');
  expect(text).toContain("<v>33.34</v>");
  expect(text).not.toContain("<f>");
  await page
    .getByRole("combobox", { name: "Estado", exact: true })
    .selectOption("paid");
  await expect(page.locator("tbody tr")).toHaveCount(0);
  await expect(page.locator(".billing-summary .summary-amount")).toHaveText(
    "$0.00",
  );
  await page
    .getByRole("combobox", { name: "Estado", exact: true })
    .selectOption("pending");
  await page.getByLabel("Mes de pago", { exact: true }).fill("2027-01");
  await expect(page.locator(".billing-summary .summary-amount")).toHaveText(
    "$66.68",
  );
  await expect(page.locator(".billing-summary")).not.toContainText("2027-01-05");
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: info.outputPath("resumen-mensual.png"),
    fullPage: true,
  });
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.setViewportSize({ width: 320, height: 740 });
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
  await page.screenshot({
    path: info.outputPath("resumen-320.png"),
    fullPage: true,
  });
});
test("tarjeta: corte y pago se guardan y vuelven al editar", async ({
  page,
}, info) => {
  await page.goto("/tests/fixtures/investment-returns.html");
  await page
    .getByRole("combobox", { name: "Tipo", exact: true })
    .selectOption("credit");
  await page.getByLabel("Nombre", { exact: true }).fill("Tarjeta mensual");
  await page.getByLabel("Día de corte", { exact: true }).fill("15");
  await page.getByRole("button", { name: "Crear cuenta", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Configura tanto");
  await page.getByLabel("Día de pago", { exact: true }).fill("5");
  await page.getByRole("button", { name: "Crear cuenta", exact: true }).click();
  await expect(page.getByLabel("Última cuenta guardada")).toContainText(
    '"statement_day":15',
  );
  await page.getByRole("button", { name: "Editar", exact: true }).click();
  await expect(page.getByLabel("Día de pago", { exact: true })).toHaveValue(
    "5",
  );
  await page.getByLabel("Día de pago", { exact: true }).fill("31");
  await page
    .getByRole("button", { name: "Guardar cuenta", exact: true })
    .click();
  await expect(page.locator(".account-card")).toContainText("Pago: día 31");
  await page.getByRole("button", { name: "Editar", exact: true }).click();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: info.outputPath("tarjeta-corte-pago.png"),
    fullPage: true,
  });
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.getByLabel("Día de corte", { exact: true }).fill("");
  await page.getByLabel("Día de pago", { exact: true }).fill("");
  await page
    .getByRole("button", { name: "Guardar cuenta", exact: true })
    .click();
  await expect(page.locator(".account-card")).toContainText(
    "Sin días de corte",
  );
});
