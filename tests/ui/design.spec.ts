import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("una búsqueda vacía permite recuperar todos los movimientos", async ({
  page,
}, testInfo) => {
  await page.goto("/movimientos");
  await page
    .getByLabel("Buscar", { exact: true })
    .fill("Un movimiento que no existe");
  await expect(
    page.getByRole("heading", { name: "No hay movimientos con estos filtros" }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("busqueda-sin-resultados.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Limpiar filtros" }).click();
  await expect(page.getByLabel("Buscar", { exact: true })).toHaveValue("");
  await expect(
    page.getByRole("heading", { name: "Todo comienza con un movimiento" }),
  ).toBeVisible();
});

test("los botones de movimientos explican cómo habilitar el guardado", async ({
  page,
}) => {
  await page.goto("/");
  for (const name of ["Registrar gasto", "Registrar ingreso"]) {
    await page.getByRole("button", { name, exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "Conecta tu espacio para guardar movimientos",
      }),
    ).toBeVisible();
    const audit = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(audit.violations).toEqual([]);
    await page.getByRole("button", { name: "Cerrar", exact: true }).click();
    await expect(page.getByRole("button", { name, exact: true })).toBeFocused();
  }
  await page.goto("/movimientos");
  await page
    .getByRole("button", { name: "Nuevo movimiento", exact: true })
    .filter({ visible: true })
    .click();
  await page.getByRole("link", { name: "Ir a configuración" }).click();
  await expect(page).toHaveURL(/\/configuracion$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.goto("/movimientos");
  await page
    .getByRole("button", { name: "Nuevo movimiento", exact: true })
    .filter({ visible: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("iPhone: formularios sin zoom y navegación sin desbordamiento", async ({
  page,
}) => {
  // Seven routes at four widths need more time than a single-screen flow.
  test.setTimeout(180_000);
  for (const width of [320, 375, 430, 844]) {
    await page.setViewportSize({ width, height: width === 844 ? 390 : 844 });
    for (const route of [
      "/",
      "/movimientos",
      "/inversiones",
      "/cuentas",
      "/metas",
      "/compras-a-meses",
      "/configuracion",
    ]) {
      await page.goto(route);
      await expect(page.locator("h1")).toBeVisible();
      if (["/", "/inversiones", "/cuentas", "/configuracion"].includes(route)) {
        await expect(
          page.getByRole("button", { name: "Nuevo movimiento", exact: true }),
        ).toHaveCount(0);
      }
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${route} a ${width}px`,
      ).toBe(true);
      const fontSizes = await page
        .locator('input:not([type="range"]), select')
        .evaluateAll((elements) =>
          elements.map((element) =>
            parseFloat(getComputedStyle(element).fontSize),
          ),
        );
      for (const size of fontSizes) expect(size).toBeGreaterThanOrEqual(16);
      await expect(
        page.getByRole("navigation", { name: "Navegación móvil" }),
      ).toBeVisible();
    }
  }
});

test("el color del navegador acompaña al tema", async ({ page }) => {
  await page.goto("/configuracion");
  for (const [name, theme, color] of [
    ["Oscuro", "dark", "#0c1724"],
    ["Claro", "light", "#f2f5f8"],
  ]) {
    await page.getByRole("button", { name, exact: true }).click();
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
    await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
      "content",
      color,
    );
  }
});

test("rutas, temas, accesibilidad y capturas", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const [route, name] of [
    ["/", "inicio"],
    ["/inversiones", "simulador"],
    ["/cuentas", "cuentas"],
    ["/metas", "metas"],
    ["/compras-a-meses", "compras-a-meses"],
    ["/movimientos", "movimientos"],
    ["/configuracion", "configuracion"],
  ]) {
    await page.goto(route);
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator("h1")).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      result.violations,
      `${name}: ${JSON.stringify(result.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => n.target) })))}`,
    ).toEqual([]);
    await page.screenshot({
      path: testInfo.outputPath(`${name}.png`),
      fullPage: true,
    });
  }
  expect(errors).toEqual([]);
});

test("el tema manual persiste y el simulador responde", async ({ page }) => {
  await page.goto("/configuracion");
  await page.getByRole("button", { name: "Oscuro", exact: true }).click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByRole("button", { name: "Claro", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.goto("/inversiones");
  const result = page.locator(".big-number");
  const previous = await result.textContent();
  await page
    .getByLabel("Capital inicial en MXN", { exact: true })
    .fill("20000");
  await expect(result).not.toHaveText(previous!);
  await page
    .getByRole("button", { name: "Capital aportado", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Capital aportado", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await page.setViewportSize({ width: 320, height: 740 });
  for (const path of [
    "/",
    "/cuentas",
    "/metas",
    "/compras-a-meses",
    "/movimientos",
    "/configuracion",
    "/inversiones",
  ]) {
    await page.goto(path);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      path,
    ).toBe(true);
  }
});

test("registro rápido: foco, validación, guardado y teclado", async ({
  page,
}, testInfo) => {
  await page.goto("/tests/fixtures/movement.html");
  await page.getByRole("button", { name: "Abrir formulario" }).click();
  if (await page.evaluate(() => matchMedia("(pointer: fine)").matches)) {
    await expect(page.getByLabel("Cantidad en MXN")).toBeFocused();
  } else {
    await expect(
      page.getByRole("heading", { name: "Un nuevo movimiento" }),
    ).toBeFocused();
  }
  await page.screenshot({
    path: testInfo.outputPath("registro-rapido.png"),
    fullPage: true,
  });
  const a11y = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(a11y.violations).toEqual([]);
  await page.getByRole("button", { name: "Guardar movimiento" }).click();
  await expect(page.getByLabel("Cantidad en MXN")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await page.screenshot({
    path: testInfo.outputPath("registro-error.png"),
    fullPage: true,
  });
  await page.getByLabel("Cantidad en MXN").fill("150.25");
  await expect(page.getByLabel("Cantidad en MXN")).toHaveAttribute(
    "aria-invalid",
    "false",
  );
  await expect(page.locator("#amount-error")).toHaveCount(0);
  await page.getByLabel("Descripción", { exact: true }).fill("Gasto de prueba");
  await page
    .getByRole("combobox", { name: "Categoría", exact: true })
    .selectOption("test-food");
  await page.screenshot({
    path: testInfo.outputPath("registro-corregido.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Guardar movimiento" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.getByLabel("Resultado de prueba")).toContainText("150.25");
  await expect(
    page.getByRole("button", { name: "Abrir formulario" }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Abrir formulario" }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Abrir confirmación" }).click();
  const confirmationAudit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(confirmationAudit.violations).toEqual([]);
  await page.getByRole("button", { name: "Conservar", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Abrir confirmación" }).click();
  await page
    .getByRole("button", { name: "Eliminar movimiento", exact: true })
    .click();
  await expect(page.getByLabel("Resultado de prueba")).toContainText(
    "Eliminación sintética confirmada",
  );
});

test("gráficas con fixtures: legibilidad e interacción", async ({
  page,
}, testInfo) => {
  await page.goto("/tests/fixtures/charts.html");
  await page.evaluate(() => document.fonts.ready);
  await expect(
    page.getByRole("heading", { name: "Patrimonio de prueba" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const audit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(audit.violations).toEqual([]);
  const chart = page.locator('.recharts-surface[role="application"]').first();
  await chart.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator(".chart-tooltip").first()).toBeVisible();
  for (const actions of await page.locator(".movement-actions").all()) {
    const buttons = actions.getByRole("button");
    const first = await buttons.nth(0).boundingBox();
    const second = await buttons.nth(1).boundingBox();
    expect(Math.abs(first!.y - second!.y)).toBeLessThan(1);
  }
  await page.screenshot({
    path: testInfo.outputPath("graficas-qa.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 320, height: 740 });
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
});
