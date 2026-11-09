import { test, expect } from "@playwright/test";
test("los botones corresponden a cada sección y se quitan los primeros pasos", async ({
  page,
}, info) => {
  test.setTimeout(90_000);
  for (const path of ["/", "/inversiones", "/cuentas", "/configuracion"]) {
    await page.goto(path);
    await expect(page.locator("h1")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Nuevo movimiento", exact: true }),
    ).toHaveCount(0);
    if (path === "/") {
      await expect(
        page.getByText("Primeros pasos", { exact: true }),
      ).toHaveCount(0);
      await expect(
        page.getByRole("heading", {
          name: "Tus gastos del mes actual",
          exact: true,
        }),
      ).toBeVisible();
      await page.screenshot({
        path: info.outputPath("home-without-onboarding.png"),
        fullPage: true,
      });
    }
  }
  for (const path of ["/movimientos", "/compras-a-meses"]) {
    await page.goto(path);
    await expect(
      page.getByRole("button", { name: "Nuevo movimiento", exact: true }),
    ).toBeVisible();
  }
});
