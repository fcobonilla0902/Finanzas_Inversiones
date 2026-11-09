export function sessionTimeRemaining(
  signedInAt: string | undefined,
  now = Date.now(),
) {
  const started = Date.parse(signedInAt ?? "");
  return Number.isFinite(started)
    ? Math.max(0, started + 60 * 60 * 1000 - now)
    : 0;
}
