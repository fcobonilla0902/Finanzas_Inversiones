import { test, expect, type Page } from "@playwright/test";

async function checkFields(page: Page, state: string) {
  const overflow = await page
    .locator(
      'input:not([type="checkbox"]):not([type="radio"]):not([type="range"]), select, textarea',
    )
    .evaluateAll((elements) =>
      elements.flatMap((element) => {
        if (!element.checkVisibility()) return [];
        const box = element.getBoundingClientRect();
        if (!box.width || !box.height) return [];
        const parent = element.parentElement!.getBoundingClientRect();
        return box.left < -1 ||
          box.right > innerWidth + 1 ||
          box.left < parent.left - 1 ||
          box.right > parent.right + 1
          ? [
              {
                name:
                  element.getAttribute("name") ||
                  element.getAttribute("aria-label") ||
                  element.outerHTML.slice(0, 90),
                left: box.left,
                right: box.right,
                parent: [parent.left, parent.right],
              },
            ]
          : [];
      }),
    );
  expect(overflow, state).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    state,
  ).toBe(true);
}

test("los campos móviles permanecen dentro de sus formularios y tarjetas", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  await page.route("https://api.frankfurter.dev/**", (route) => route.abort());
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    for (const route of [
      "/",
      "/movimientos",
      "/cuentas",
      "/inversiones",
      "/metas",
      "/compras-a-meses",
      "/configuracion",
    ]) {
      await page.goto(route);
      await expect(page.locator("h1")).toBeVisible();
      if (route === "/") {
        await page.getByLabel("Cambiar moneda", { exact: true }).click();
        await checkFields(page, `selector de moneda ${width}px`);
        await page.getByLabel("Cambiar moneda", { exact: true }).click();
        await page
          .getByRole("button", { name: "Personalizado", exact: true })
          .click();
      }
      if (route === "/cuentas")
        await page.locator('select[name="type"]').selectOption("credit");
      for (const date of await page
        .locator('input[type="date"], input[type="month"]')
        .all()) {
        await date.fill(
          (await date.getAttribute("type")) === "month"
            ? "2026-11"
            : "2026-11-18",
        );
      }
      for (const field of await page
        .locator('input[type="text"], input:not([type])')
        .all()) {
        if (await field.isEditable())
          await field.fill(
            "Texto largo de prueba para verificar que el campo no crezca fuera de su tarjeta",
          );
      }
      await checkFields(page, `${route} ${width}px`);
    }
    for (const [fixture, open] of [
      ["movement", "Abrir formulario"],
      ["goals", "Crear meta"],
      ["installments", "Registrar compra"],
    ]) {
      await page.goto(`/tests/fixtures/${fixture}.html`);
      await page.getByRole("button", { name: open, exact: true }).click();
      if (fixture === "goals")
        await expect(
          page.getByLabel("Objetivo en MXN", { exact: true }),
        ).toBeVisible();
      else await expect(page.getByRole("dialog")).toBeVisible();
      await checkFields(page, `${fixture} ${width}px`);
      await page.screenshot({
        path: info.outputPath(`${fixture}-${width}.png`),
        fullPage: true,
      });
    }
    await page.goto("/tests/fixtures/auth.html");
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await checkFields(page, `auth ${width}px`);
  }
});

test("la fecha del pago de tarjeta cabe en móvil", async ({ page }, info) => {
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/tests/fixtures/installments.html");
    await page
      .getByRole("button", {
        name: "Pagué a tiempo mi tarjeta de crédito",
        exact: true,
      })
      .click();
    await expect(
      page.getByLabel("Fecha en que pagaste", { exact: true }),
    ).toBeVisible();
    await checkFields(page, `pago de tarjeta ${width}px`);
    await page.screenshot({
      path: info.outputPath(`payment-${width}.png`),
      fullPage: true,
    });
  }
});
