import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("compras a meses: registro, avance, corrección y pago completo", async ({
  page,
}, info) => {
  test.setTimeout(120_000);
  await page.goto("/tests/fixtures/installments.html");
  await page
    .getByRole("button", { name: "Registrar compra", exact: true })
    .click();
  await page.getByLabel("Cantidad en MXN", { exact: true }).fill("100.01");
  await page.getByLabel("Descripción", { exact: true }).fill("Audífonos");
  await page
    .getByRole("combobox", { name: "Categoría", exact: true })
    .selectOption("shopping");
  await page
    .getByRole("combobox", { name: "Plazo de la compra", exact: true })
    .selectOption("3");
  await page.getByLabel("Meses ya pagados", { exact: true }).fill("4");
  await page
    .getByRole("button", { name: "Guardar movimiento", exact: true })
    .click();
  await expect(
    page.getByLabel("Meses ya pagados", { exact: true }),
  ).toHaveAttribute("aria-invalid", "true");
  await page.getByLabel("Meses ya pagados", { exact: true }).fill("0");
  await expect(
    page.getByLabel("Meses ya pagados", { exact: true }),
  ).toHaveAttribute("aria-invalid", "false");
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: info.outputPath("compra-formulario.png"),
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
    .getByRole("button", { name: "Guardar movimiento", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  const row = page
    .getByRole("row")
    .filter({ has: page.getByText("Audífonos", { exact: true }) });
  await expect(row).toContainText("3 meses");
  await expect(row).toContainText("$33.34");
  const paid = page.getByLabel("Meses pagados de Audífonos", { exact: true });
  await paid.fill("");
  await page
    .getByRole("button", {
      name: "Guardar meses pagados de Audífonos",
      exact: true,
    })
    .click();
  await expect(paid).toHaveAttribute("aria-invalid", "true");
  await paid.fill("4");
  await paid.scrollIntoViewIfNeeded();
  await page
    .getByRole("button", {
      name: "Guardar meses pagados de Audífonos",
      exact: true,
    })
    .click();
  await expect(paid).toHaveAttribute("aria-invalid", "true");
  await paid.fill("2");
  await page
    .getByRole("checkbox", { name: "Simular fallo al guardar" })
    .check();
  await page
    .getByRole("button", {
      name: "Guardar meses pagados de Audífonos",
      exact: true,
    })
    .click();
  await expect(page.getByRole("alert")).toContainText("Sin conexión");
  await page
    .getByRole("checkbox", { name: "Simular fallo al guardar" })
    .uncheck();
  await page
    .getByRole("button", {
      name: "Guardar meses pagados de Audífonos",
      exact: true,
    })
    .click();
  await expect(row).toContainText("2 de 3");
  await expect(row).toContainText("$33.33");
  await expect(page.getByLabel("Deuda de prueba")).toHaveText("$100.01");
  await page.screenshot({
    path: info.outputPath("compras-tabla.png"),
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
  const region = page.getByRole("region", {
    name: "Tabla de compras con tarjeta de crédito",
  });
  await region.evaluate((el) => (el.scrollLeft = el.scrollWidth));
  await paid.scrollIntoViewIfNeeded();
  await expect(paid).toBeInViewport();
  await page.screenshot({
    path: info.outputPath("compras-tabla-320.png"),
    fullPage: true,
  });
  await paid.fill("3");
  await page
    .getByRole("button", {
      name: "Guardar meses pagados de Audífonos",
      exact: true,
    })
    .click();
  await expect(row).toHaveCount(0);
  await page
    .getByRole("combobox", { name: "Estado", exact: true })
    .selectOption("paid");
  await expect(row).toContainText("Pagada");
  await expect(page.getByLabel("Deuda de prueba")).toHaveText("$100.01");
  await row.getByRole("button", { name: "Editar compra" }).click();
  await expect(
    page.getByLabel("Meses ya pagados", { exact: true }),
  ).toHaveValue("3");
  await page
    .getByRole("combobox", { name: "Cuenta de origen", exact: true })
    .selectOption("bank");
  await expect(
    page.getByRole("combobox", { name: "Plazo de la compra", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Guardar movimiento", exact: true })
    .click();
  await expect(row).toHaveCount(0);
  await page.goto("/movimientos");
  await page
    .getByRole("link", {
      name: "Ver compras con tarjeta de crédito",
      exact: true,
    })
    .click();
  await expect(page).toHaveURL(/\/compras-a-meses$/);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Compras con tarjeta de crédito",
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Organiza tus compras con tarjeta" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: info.outputPath("compras-ruta-320.png"),
    fullPage: true,
  });
});
