/** True when `value` is a finite number that is zero or greater. */
export function isNonNegativeFinite(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

/**
 * Env vars carrying counts or millisecond durations must not silently
 * become 0, NaN, or a truncated number (Number('') === 0,
 * parseInt('65000ms') === 65000): a zero or mangled timeout can disable
 * the mechanism it configures. Anything but a plain decimal integer falls
 * back to the default rather than being honored.
 */
function parseStrictInt(value: string | undefined): number {
  const trimmed = (value ?? '').trim();
  return /^\d+$/.test(trimmed) ? parseInt(trimmed, 10) : NaN;
}

export function parsePositiveIntWithDefault(
  value: string | undefined,
  defaultValue: number,
): number {
  const parsed = parseStrictInt(value);
  return parsed > 0 ? parsed : defaultValue;
}

/** Like parsePositiveIntWithDefault, but 0 is a valid value (e.g. "disabled"). */
export function parseNonNegativeIntWithDefault(
  value: string | undefined,
  defaultValue: number,
): number {
  const parsed = parseStrictInt(value);
  return parsed >= 0 ? parsed : defaultValue;
}
