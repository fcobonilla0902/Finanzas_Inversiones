import { test, expect } from "@playwright/test";
const quotes = [
  "USD",
  "EUR",
  "GBP",
  "CAD",
  "JPY",
  "CHF",
  "AUD",
  "CNY",
  "BRL",
].map((quote) => ({
  base: "MXN",
  quote,
  rate: quote === "EUR" ? 0.04 : 0.05,
  date: "2026-11-09",
}));

test("convierte cuentas y gráficas, conserva formularios MXN y recupera errores", async ({
  page,
}, info) => {
  let fail = false;
  await page.clock.install();
  await page.route("https://api.frankfurter.dev/**", (route) =>
    fail
      ? route.fulfill({ status: 503, body: "Unavailable" })
      : route.fulfill({ json: quotes }),
  );
  await page.goto("/tests/fixtures/currency.html");
  const trigger = page.getByLabel("Cambiar moneda", { exact: true });
  const bounds = await trigger.boundingBox();
  expect(bounds!.x).toBeGreaterThan(page.viewportSize()!.width / 2);
  await page.getByLabel("Cambiar moneda", { exact: true }).click();
  const select = page.getByRole("combobox", {
    name: "Moneda de visualización",
  });
  await expect(page.getByText(/Referencia diaria del/)).toBeVisible();
  const menu = await page.locator(".currency-bar").boundingBox();
  expect(menu!.x).toBeGreaterThanOrEqual(0);
  expect(menu!.x + menu!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
  await select.selectOption("USD");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("100.00");
  await expect(page.locator(".account-card strong")).toContainText("USD");
  await expect(page.getByText("Saldo inicial en MXN")).toBeVisible();
  await select.selectOption("EUR");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("80.00");
  await page.screenshot({
    path: info.outputPath("currency-final.png"),
    fullPage: true,
  });
  fail = true;
  await expect(page.getByRole("button", { name: /Actualizar/ })).toHaveCount(0);
  await page.clock.fastForward(5 * 60 * 1000);
  await expect(page.getByRole("alert")).toContainText("Se conserva");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("80.00");
  await page.screenshot({
    path: info.outputPath("currency.png"),
    fullPage: true,
  });
  fail = false;
  await page.reload();
  await page.getByLabel("Cambiar moneda", { exact: true }).click();
  await expect(select).toHaveValue("EUR");
  await select.selectOption("MXN");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "2,000.00",
  );
});

test("un fallo inicial mantiene MXN y se recupera automáticamente", async ({
  page,
}) => {
  let fail = true;
  await page.clock.install();
  await page.route("https://api.frankfurter.dev/**", (route) =>
    fail
      ? route.fulfill({ status: 503, body: "Unavailable" })
      : route.fulfill({ json: quotes }),
  );
  await page.goto("/tests/fixtures/currency.html");
  await page.getByLabel("Cambiar moneda", { exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("siguen en MXN");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "2,000.00",
  );
  await expect(page.locator('option[value="USD"]')).toBeDisabled();
  fail = false;
  await page.clock.fastForward(5 * 60 * 1000);
  await expect(page.getByRole("alert")).toHaveCount(0);
  await page
    .getByRole("combobox", { name: "Moneda de visualización" })
    .selectOption("USD");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("100.00");
});
