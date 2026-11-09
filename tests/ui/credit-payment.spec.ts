import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("pagar el periodo completo actualiza cuenta, contado y meses sin duplicar; eliminar revierte", async ({
  page,
}, info) => {
  test.setTimeout(120_000);
  await page.clock.setFixedTime(new Date("2026-11-30T12:00:00Z"));
  await page.goto("/tests/fixtures/installments.html");
  for (const [name, amount, months] of [
    ["Compra financiada", "120.00", "3"],
    ["Compra de contado", "60.00", "1"],
  ]) {
    await page
      .getByRole("button", { name: "Registrar compra", exact: true })
      .click();
    await page.getByLabel("Cantidad en MXN", { exact: true }).fill(amount);
    await page.getByLabel("Descripción", { exact: true }).fill(name);
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
  await page.getByLabel("Mes de pago", { exact: true }).fill("2026-12");
  await page
    .getByRole("combobox", { name: "Tipo de compra", exact: true })
    .selectOption("cash");
  await page
    .getByRole("checkbox", { name: "Simular fallo al guardar", exact: true })
    .check();
  await page
    .getByRole("button", {
      name: "Pagué a tiempo mi tarjeta de crédito",
      exact: true,
    })
    .click();
  await page
    .getByRole("combobox", {
      name: "Tarjeta de crédito que pagaste",
      exact: true,
    })
    .selectOption("card");
  await page
    .getByRole("combobox", {
      name: "Cuenta o tarjeta con la que pagaste",
      exact: true,
    })
    .selectOption("bank");
  await expect(
    page.getByLabel("Monto completo del periodo", { exact: true }),
  ).toHaveText("$100.00");
  await page
    .getByRole("button", { name: "Registrar pago completo", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Confirma que pagaste el monto completo",
  );
  await page
    .getByRole("checkbox", {
      name: "Sí, pagué el monto completo del periodo hasta el corte",
      exact: true,
    })
    .check();
  await page.screenshot({
    path: info.outputPath("full-credit-payment.png"),
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
    .getByRole("button", { name: "Registrar pago completo", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Sin conexión");
  await expect(
    page.getByLabel("Saldo de cuenta de pago", { exact: true }),
  ).toHaveText("$1,000.00");
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await page
    .getByRole("checkbox", { name: "Simular fallo al guardar", exact: true })
    .uncheck();
  await page
    .getByRole("button", {
      name: "Pagué a tiempo mi tarjeta de crédito",
      exact: true,
    })
    .click();
  await page
    .getByRole("combobox", {
      name: "Tarjeta de crédito que pagaste",
      exact: true,
    })
    .selectOption("card");
  await page
    .getByRole("combobox", {
      name: "Cuenta o tarjeta con la que pagaste",
      exact: true,
    })
    .selectOption("bank");
  await page
    .getByRole("checkbox", {
      name: "Sí, pagué el monto completo del periodo hasta el corte",
      exact: true,
    })
    .check();
  await page
    .getByRole("button", { name: "Registrar pago completo", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByLabel("Saldo de cuenta de pago", { exact: true }),
  ).toHaveText("$900.00");
  await page
    .getByRole("combobox", { name: "Tipo de compra", exact: true })
    .selectOption("all");
  await expect(page.locator(".billing-summary .summary-amount")).toHaveText(
    "$0.00",
  );
  await expect(
    page.locator("tbody tr").filter({ hasText: "Compra financiada" }),
  ).toContainText("1 de 3");
  await page
    .getByRole("combobox", { name: "Estado", exact: true })
    .selectOption("all");
  await expect(
    page.locator("tbody tr").filter({ hasText: "Compra de contado" }),
  ).toContainText("Pagada");
  await page
    .getByRole("button", {
      name: "Pagué a tiempo mi tarjeta de crédito",
      exact: true,
    })
    .click();
  await page
    .getByRole("combobox", {
      name: "Tarjeta de crédito que pagaste",
      exact: true,
    })
    .selectOption("card");
  await expect(
    page.getByRole("button", { name: "Registrar pago completo", exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await page
    .getByRole("button", { name: "Ver movimientos de prueba", exact: true })
    .click();
  await page
    .getByRole("combobox", { name: "Cuenta", exact: true })
    .selectOption("card");
  await expect(
    page.locator(".movement").filter({ hasText: "Compra financiada" }),
  ).toContainText("Pagados: 1 de 3");
  await page
    .getByRole("button", {
      name: "Eliminar Pago a tiempo de prueba",
      exact: true,
    })
    .click();
  await expect(
    page.getByLabel("Saldo de cuenta de pago", { exact: true }),
  ).toHaveText("$1,000.00");
  await expect(
    page.locator(".movement").filter({ hasText: "Compra financiada" }),
  ).toContainText("Pagados: 0 de 3");
});
