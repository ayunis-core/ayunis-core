const DURATION_UNIT_MS: Readonly<Record<string, number>> = {
  h: 3_600_000,
  m: 60_000,
  s: 1_000,
  ms: 1,
};
// eslint-disable-next-line sonarjs/super-linear-regex -- only ever runs on one retry-after header value, so the worst case (a long unit-less digit run) is bounded by header size
const DURATION_PART = /([\d.]+)(ms|h|m|s)/g;

/**
 * `retry-after` is delay-seconds per RFC 9110, but StackIT sends Go-style
 * durations (`2s`, `1m20s`); rejecting those dropped its retry hint and left
 * rate-limited runs on a backoff too short for the quota window (AYC-1112).
 * The HTTP-date form is deliberately not parsed — it would need clock trust.
 */
export function parseRetryAfterMs(value: unknown): number | undefined {
  const seconds =
    typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (typeof seconds === 'number' && Number.isFinite(seconds)) {
    return seconds >= 0 ? seconds * 1_000 : undefined;
  }
  return typeof value === 'string' ? parseDurationMs(value.trim()) : undefined;
}

function parseDurationMs(duration: string): number | undefined {
  if (duration === '' || duration.replace(DURATION_PART, '') !== '') {
    return undefined;
  }
  let milliseconds = 0;
  for (const [, amount, unit] of duration.matchAll(DURATION_PART)) {
    milliseconds += Number(amount) * DURATION_UNIT_MS[unit];
  }
  return Number.isFinite(milliseconds) ? milliseconds : undefined;
}
