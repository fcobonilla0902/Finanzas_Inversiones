import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("cuenta de inversión: tasa, proyecciones, edición y archivo", async ({
  page,
}, testInfo) => {
  await page.goto("/tests/fixtures/investment-returns.html");
  const rate = page.getByLabel("Rendimiento anual estimado (%)", {
    exact: true,
  });
  await expect(rate).toHaveCount(0);
  await page
    .getByRole("combobox", { name: "Tipo", exact: true })
    .selectOption("investment");
  await expect(rate).toBeVisible();
  await page.getByLabel("Nombre", { exact: true }).fill("Inversión de prueba");
  await page.getByLabel("Saldo inicial en MXN").fill("10000.00");
  await rate.fill("10");
  await page.getByRole("button", { name: "Crear cuenta", exact: true }).click();
  await expect(page.getByLabel("Última cuenta guardada")).toContainText(
    '"annual_return_rate":"10"',
  );
  const values = page.locator(".investment-returns-grid dd");
  await expect(values).toHaveText(["$2.74", "$19.18", "$82.19", "$1,000.00"]);
  await expect(page.locator(".investment-principal strong")).toHaveText(
    "$10,000.00",
  );
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: testInfo.outputPath("rendimientos-configurados.png"),
    fullPage: true,
  });
  const audit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(audit.violations).toEqual([]);
  await page.getByRole("button", { name: "Editar", exact: true }).click();
  await expect(rate).toHaveValue("10");
  await rate.fill("20");
  await page
    .getByRole("button", { name: "Guardar cuenta", exact: true })
    .click();
  await expect(values.nth(3)).toHaveText("$2,000.00");
  await page.getByRole("button", { name: "Archivar", exact: true }).click();
  await expect(page.locator(".investment-returns")).toHaveCount(0);
  await page.getByRole("button", { name: "Activar", exact: true }).click();
  await expect(values.nth(3)).toHaveText("$2,000.00");
  await page.getByRole("button", { name: "Editar", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Tipo", exact: true })
    .selectOption("bank");
  await expect(rate).toHaveCount(0);
  await page
    .getByRole("button", { name: "Guardar cuenta", exact: true })
    .click();
  await expect(page.getByLabel("Última cuenta guardada")).toContainText(
    '"annual_return_rate":null',
  );
  await expect(page.locator(".investment-returns")).toHaveCount(0);
});

test("la tasa es opcional y cero se distingue de no configurada", async ({
  page,
}, testInfo) => {
  await page.goto("/tests/fixtures/investment-returns.html");
  await page
    .getByRole("combobox", { name: "Tipo", exact: true })
    .selectOption("investment");
  await page.getByLabel("Nombre", { exact: true }).fill("Inversión sin tasa");
  await page.getByLabel("Saldo inicial en MXN").fill("10000.00");
  await page.getByRole("button", { name: "Crear cuenta", exact: true }).click();
  await expect(page.locator(".investment-return-empty")).toBeVisible();
  await page.getByRole("button", { name: "Editar", exact: true }).click();
  await page
    .getByLabel("Rendimiento anual estimado (%)", { exact: true })
    .fill("0");
  await page
    .getByRole("button", { name: "Guardar cuenta", exact: true })
    .click();
  await expect(page.locator(".investment-returns-grid dd")).toHaveText([
    "$0.00",
    "$0.00",
    "$0.00",
    "$0.00",
  ]);
  await page.setViewportSize({ width: 320, height: 740 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Editar", exact: true }).click();
  await page.screenshot({
    path: testInfo.outputPath("tasa-anual-formulario.png"),
    fullPage: true,
  });
});
