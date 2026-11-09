import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("acceso y registro: placeholders y contraseña visible sin enviar el formulario", async ({
  page,
}, testInfo) => {
  await page.goto("/tests/fixtures/auth.html");
  const password = page.getByLabel("Contraseña", { exact: true });
  await expect(page.getByLabel("Correo electrónico")).toHaveAttribute(
    "placeholder",
    "nombre@ejemplo.com",
  );
  await expect(password).toHaveAttribute(
    "placeholder",
    "Introduce tu contraseña",
  );
  await password.fill("Una-clave-de-prueba");
  await page.evaluate(() => {
    const form = document.querySelector("form")!;
    form.addEventListener("submit", () => {
      form.dataset.submitted = "true";
    });
  });
  await page
    .getByRole("button", { name: "Mostrar contraseña", exact: true })
    .click();
  await expect(password).toHaveAttribute("type", "text");
  await expect(password).toHaveValue("Una-clave-de-prueba");
  const hide = page.getByRole("button", {
    name: "Ocultar contraseña",
    exact: true,
  });
  await hide.focus();
  await page.keyboard.press("Enter");
  await expect(password).toHaveAttribute("type", "password");
  await expect(password).toHaveValue("Una-clave-de-prueba");
  await expect(page.locator("form")).not.toHaveAttribute(
    "data-submitted",
    "true",
  );
  await page
    .getByRole("button", { name: "Crear una cuenta", exact: true })
    .click();
  await expect(password).toHaveAttribute("placeholder", "Mínimo 8 caracteres");
  await expect(password).toHaveAttribute("type", "password");
  await expect(password).toHaveAttribute("autocomplete", "new-password");
  const audit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(audit.violations).toEqual([]);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: testInfo.outputPath("registro-password.png"),
    fullPage: true,
  });
});

test("recuperación: cada contraseña tiene su propio botón accesible", async ({
  page,
}, testInfo) => {
  await page.goto("/tests/fixtures/auth.html?recovery");
  const password = page.getByLabel("Contraseña nueva", { exact: true });
  const confirmation = page.getByLabel("Repite tu contraseña", { exact: true });
  await password.fill("Una-clave-de-prueba");
  await confirmation.fill("Una-clave-de-prueba");
  await page
    .getByRole("button", { name: "Mostrar contraseña", exact: true })
    .click();
  await expect(password).toHaveAttribute("type", "text");
  await expect(confirmation).toHaveAttribute("type", "password");
  await page
    .getByRole("button", {
      name: "Mostrar confirmación de contraseña",
      exact: true,
    })
    .click();
  await expect(confirmation).toHaveAttribute("type", "text");
  await page
    .getByRole("button", { name: "Ocultar contraseña", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Ocultar confirmación de contraseña",
      exact: true,
    })
    .click();
  await expect(password).toHaveValue("Una-clave-de-prueba");
  await expect(confirmation).toHaveAttribute("type", "password");
  const audit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(audit.violations).toEqual([]);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: testInfo.outputPath("recuperacion-password.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 320, height: 740 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
