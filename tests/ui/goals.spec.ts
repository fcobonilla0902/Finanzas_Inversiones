import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
async function createGoal(
  page: Page,
  name: string,
  horizon: string,
  target: string,
) {
  await page.getByLabel("Nombre de la meta", { exact: true }).fill(name);
  await page
    .getByRole("combobox", { name: "Horizonte", exact: true })
    .selectOption(horizon);
  await page.getByLabel("Objetivo en MXN", { exact: true }).fill(target);
  await page.getByRole("button", { name: "Crear meta", exact: true }).click();
}

test("deuda y metas: ahorro automático, referencia independiente y archivo", async ({
  page,
}, testInfo) => {
  test.setTimeout(120_000);
  await page.goto("/tests/fixtures/goals.html");
  await expect(page.locator(".debt-summary .summary-amount")).toHaveText(
    "$4,500.00",
  );
  await expect(page.locator(".debt-summary")).toContainText("Sin deuda");
  await expect(page.locator(".goals-layout .summary-amount")).toHaveText(
    "$10,000.00",
  );
  await page
    .getByRole("radio", { name: "Mi presupuesto mensual", exact: true })
    .check();
  await page
    .getByLabel("Ingreso mensual previsto en MXN", { exact: true })
    .fill("20000.00");
  await page
    .getByLabel("Gastos mensuales previstos en MXN", { exact: true })
    .fill("14000.00");
  await page
    .getByRole("button", { name: "Guardar base de ahorro", exact: true })
    .click();
  await expect(page.locator(".goals-layout .summary-amount")).toHaveText(
    "$6,000.00",
  );
  await expect(
    page.getByLabel("Ahorrado hasta ahora en MXN", { exact: true }),
  ).toHaveValue("9000.00");
  await expect(
    page.getByLabel("Ahorrado hasta ahora en MXN", { exact: true }),
  ).toHaveAttribute("readonly", "");
  await createGoal(page, "Emergencia", "short", "20000.00");
  await createGoal(page, "Viaje", "medium", "30000.00");
  await createGoal(page, "Casa", "long", "120000.00");
  const card = (name: string) =>
    page
      .locator(".goal-grid > article")
      .filter({ has: page.getByRole("heading", { name, exact: true }) });
  await expect(card("Emergencia")).toContainText("2 meses aprox.");
  await expect(card("Viaje")).toContainText("4 meses aprox.");
  await expect(card("Casa")).toContainText("1 año y 7 meses aprox.");
  for (const name of ["Emergencia", "Viaje", "Casa"])
    await expect(card(name)).toContainText("$6,000.00 al mes");
  await expect(card("Emergencia").getByRole("progressbar")).toHaveAttribute(
    "value",
    "900000",
  );
  await page.evaluate(() => document.fonts.ready);
  await page
    .locator(".planning-grid")
    .screenshot({ path: testInfo.outputPath("dashboard-deuda-metas.png") });
  await page.screenshot({
    path: testInfo.outputPath("metas-completas.png"),
    fullPage: true,
  });
  const audit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(audit.violations).toEqual([]);
  await page.getByRole("button", { name: "Corto", exact: true }).click();
  await expect(page.locator(".goal-grid > article")).toHaveCount(1);
  await page.getByRole("button", { name: "Todas", exact: true }).click();
  await card("Emergencia")
    .getByRole("button", { name: "Editar meta", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Registrar ingreso de prueba", exact: true })
    .click();
  await page.getByRole("button", { name: "Guardar meta", exact: true }).click();
  await expect(card("Emergencia")).toContainText("Meta alcanzada");
  await expect(card("Casa")).toContainText("1 año y 5 meses aprox.");
  await card("Viaje")
    .getByRole("button", { name: "Archivar meta", exact: true })
    .click();
  await expect(card("Casa")).toContainText("1 año y 5 meses aprox.");
  await page
    .getByRole("checkbox", { name: "Mostrar archivadas", exact: true })
    .check();
  await expect(card("Viaje")).toContainText("Meta archivada");
  await card("Viaje")
    .getByRole("button", { name: "Reactivar meta", exact: true })
    .click();
  await page
    .getByRole("checkbox", { name: "Mostrar archivadas", exact: true })
    .uncheck();
  await expect(card("Casa")).toContainText("1 año y 5 meses aprox.");
  await page
    .getByRole("button", { name: "Registrar gasto de prueba", exact: true })
    .click();
  await expect(
    page.getByLabel("Ahorrado hasta ahora en MXN", { exact: true }),
  ).toHaveValue("18000.00");
  await page
    .getByRole("button", {
      name: "Registrar pago de tarjeta de prueba",
      exact: true,
    })
    .click();
  await expect(
    page.getByLabel("Ahorrado hasta ahora en MXN", { exact: true }),
  ).toHaveValue("17000.00");
});

test("metas: validación, déficit y ausencia de capacidad", async ({
  page,
}, testInfo) => {
  await page.goto("/tests/fixtures/goals.html");
  await page.getByRole("button", { name: "Crear meta", exact: true }).click();
  await expect(
    page.getByLabel("Nombre de la meta", { exact: true }),
  ).toBeFocused();
  await expect(
    page.getByLabel("Objetivo en MXN", { exact: true }),
  ).toHaveAttribute("aria-invalid", "true");
  await createGoal(page, "Meta sin capacidad", "short", "20000.00");
  await expect(
    page.getByLabel("Objetivo en MXN", { exact: true }),
  ).toHaveAttribute("aria-invalid", "false");
  await page
    .getByRole("radio", { name: "Mi presupuesto mensual", exact: true })
    .check();
  await page
    .getByLabel("Ingreso mensual previsto en MXN", { exact: true })
    .fill("10000.00");
  await page
    .getByLabel("Gastos mensuales previstos en MXN", { exact: true })
    .fill("12000.00");
  await page
    .getByRole("button", { name: "Guardar base de ahorro", exact: true })
    .click();
  await expect(page.locator(".goals-layout .summary-amount")).toHaveText(
    "-$2,000.00",
  );
  await expect(page.locator(".goal-grid")).toContainText("Sin plazo estimable");
  await expect(page.locator(".goal-grid")).toContainText(
    "Necesitas ahorro mensual positivo",
  );
  await page.setViewportSize({ width: 320, height: 740 });
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
  await page
    .locator(".goals-layout")
    .screenshot({ path: testInfo.outputPath("metas-deficit-320.png") });
});
