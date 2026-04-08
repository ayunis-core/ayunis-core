/**
 * Conversion helpers between the on-the-wire `windowMs` (positive integer)
 * the backend stores and the human-friendly `windowHours` (decimal hours)
 * the super-admin UI exposes.
 *
 * Centralised here so the read hook (`useFairUseLimits`) and the write hook
 * (`useSetFairUseLimit`) cannot drift apart, and so the rounding behaviour
 * around the lower bound is testable in isolation.
 */

const MS_PER_HOUR = 3_600_000;

export function windowMsToHours(ms: number): number {
  return ms / MS_PER_HOUR;
}

export function windowHoursToMs(hours: number): number {
  return Math.round(hours * MS_PER_HOUR);
}
