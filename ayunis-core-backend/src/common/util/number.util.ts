/** True when `value` is a finite number that is zero or greater. */
export function isNonNegativeFinite(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}
