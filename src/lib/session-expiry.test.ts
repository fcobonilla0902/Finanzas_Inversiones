import { expect, it } from "vitest";
import { sessionTimeRemaining } from "./session-expiry";

it("mantiene el plazo original al recargar o renovar el token", () => {
  const signedInAt = "2026-11-09T12:00:00Z";
  expect(sessionTimeRemaining(signedInAt, Date.parse(signedInAt))).toBe(
    3_600_000,
  );
  expect(
    sessionTimeRemaining(signedInAt, Date.parse("2026-11-09T12:45:00Z")),
  ).toBe(900_000);
  expect(
    sessionTimeRemaining(signedInAt, Date.parse("2026-11-09T13:00:00Z")),
  ).toBe(0);
  expect(
    sessionTimeRemaining(signedInAt, Date.parse("2026-11-09T14:00:00Z")),
  ).toBe(0);
});

it("no conserva sesiones sin fecha válida de inicio", () => {
  expect(sessionTimeRemaining(undefined)).toBe(0);
  expect(sessionTimeRemaining("invalid")).toBe(0);
});
