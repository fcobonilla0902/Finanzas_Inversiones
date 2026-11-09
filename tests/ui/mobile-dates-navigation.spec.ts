import { test, expect } from "@playwright/test";

test("la animación de regreso respeta la preferencia de movimiento", async ({
  page,
}) => {
  await page.route("https://api.frankfurter.dev/**", (route) => route.abort());
  await page.setViewportSize({ width: 390, height: 700 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const home = page
    .getByRole("navigation", { name: "Navegación móvil" })
    .getByRole("link", { name: "Inicio", exact: true });
  await expect(home).toBeVisible();
  await page.evaluate(() => {
    const original = window.scrollTo.bind(window);
    const calls: ScrollToOptions[] = [];
    (window as Window & { scrollCalls?: ScrollToOptions[] }).scrollCalls =
      calls;
    window.scrollTo = ((...args: unknown[]) => {
      if (typeof args[0] === "object") calls.push(args[0] as ScrollToOptions);
      Reflect.apply(original, window, args);
    }) as typeof window.scrollTo;
  });
  for (const reducedMotion of ["no-preference", "reduce"] as const) {
    await page.emulateMedia({ reducedMotion });
    await page.evaluate(() =>
      window.scrollTo({ top: document.body.scrollHeight, behavior: "instant" }),
    );
    await home.click();
    const behavior = await page.evaluate(
      () =>
        (
          window as Window & { scrollCalls?: ScrollToOptions[] }
        ).scrollCalls!.at(-1)!.behavior,
    );
    expect(behavior).toBe(reducedMotion === "reduce" ? "instant" : "smooth");
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  }
});

test("las fechas tienen el mismo ancho que descripción y filtros", async ({
  page,
}, info) => {
  test.setTimeout(180000);
  await page.route("https://api.frankfurter.dev/**", (route) => route.abort());
  for (const width of [320, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/tests/fixtures/movement.html", {
      waitUntil: "domcontentloaded",
    });
    await page
      .getByRole("button", { name: "Abrir formulario", exact: true })
      .click();
    for (const kind of ["Gasto", "Ingreso", "Transferencia"]) {
      await page.getByText(kind, { exact: true }).click();
      const date = page.getByLabel("Fecha", { exact: true });
      await date.fill("2026-11-09");
      const dateBox = await date.boundingBox();
      const description = await page
        .getByLabel("Descripción", { exact: true })
        .boundingBox();
      expect(
        Math.abs(dateBox!.width - description!.width),
        `${kind} ${width}px`,
      ).toBeLessThan(1);
      expect(Math.abs(dateBox!.x - description!.x)).toBeLessThan(1);
    }
    if (width === 390)
      await page.screenshot({
        path: info.outputPath("equal-dates.png"),
        fullPage: true,
      });
    await page.goto("/movimientos", { waitUntil: "domcontentloaded" });
    const search = page.getByLabel("Buscar", { exact: true });
    await expect(search).toBeVisible({ timeout: 30000 });
    const searchBox = await search.boundingBox();
    for (const label of ["Desde", "Hasta"]) {
      const date = page.getByLabel(label, { exact: true });
      await date.fill("2026-11-09");
      const dateBox = await date.boundingBox();
      expect(
        Math.abs(dateBox!.width - searchBox!.width),
        `${label} ${width}px`,
      ).toBeLessThan(1);
      expect(Math.abs(dateBox!.x - searchBox!.x)).toBeLessThan(1);
    }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
});

test("los iconos inferiores y la marca vuelven al inicio de la página", async ({
  page,
}) => {
  test.setTimeout(180000);
  await page.route("https://api.frankfurter.dev/**", (route) => route.abort());
  await page.setViewportSize({ width: 390, height: 700 });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const nav = page.getByRole("navigation", { name: "Navegación móvil" });
  await expect(nav).toBeVisible({ timeout: 30000 });
  for (const name of [
    "Movimientos",
    "Inversiones",
    "Cuentas",
    "Metas",
    "Inicio",
  ]) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await nav.getByRole("link", { name, exact: true }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    await expect
      .poll(() =>
        page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
          return window.scrollY;
        }),
      )
      .toBeGreaterThan(0);
    await nav.getByRole("link", { name, exact: true }).click();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  }
  await nav.getByRole("link", { name: "Movimientos", exact: true }).click();
  await page
    .locator(".topbar")
    .getByRole("link", { name: "finanzas", exact: true })
    .click();
  await expect(page).toHaveURL(/\/$/);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight);
    document.querySelector<HTMLAnchorElement>(".mobile-brand")!.click();
  });
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
});
