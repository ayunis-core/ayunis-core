import { describe, it, expect } from 'vitest';
import { windowHoursToMs, windowMsToHours } from './fair-use-limits-conversion';

describe('windowMsToHours', () => {
  it('converts whole hours', () => {
    expect(windowMsToHours(3_600_000)).toBe(1);
    expect(windowMsToHours(86_400_000)).toBe(24);
  });

  it('converts fractional hours', () => {
    expect(windowMsToHours(1_800_000)).toBe(0.5);
  });
});

describe('windowHoursToMs', () => {
  it('converts whole hours', () => {
    expect(windowHoursToMs(1)).toBe(3_600_000);
    expect(windowHoursToMs(24)).toBe(86_400_000);
  });

  it('converts fractional hours', () => {
    expect(windowHoursToMs(0.5)).toBe(1_800_000);
  });

  it('rounds the lower validator bound to a positive integer', () => {
    // 0.01h is the minimum the UI accepts; it must round to a non-zero
    // integer so the backend `@IsInt() @Min(1)` validator does not reject it.
    expect(windowHoursToMs(0.01)).toBe(36_000);
    expect(windowHoursToMs(0.01)).toBeGreaterThanOrEqual(1);
  });

  it('rounds sub-millisecond inputs down to zero (must be rejected upstream)', () => {
    // Anything below the validator bound rounds to 0 — proves we cannot
    // rely on rounding alone and must keep the `>= 0.01` frontend check
    // and the `>= 1` belt-and-suspenders guard in `useSetFairUseLimit`.
    expect(windowHoursToMs(0.0000001)).toBe(0);
  });
});

describe('windowMsToHours / windowHoursToMs round-trip', () => {
  it('round-trips whole hours', () => {
    for (const hours of [1, 6, 12, 24, 168]) {
      expect(windowMsToHours(windowHoursToMs(hours))).toBe(hours);
    }
  });

  it('round-trips half hours', () => {
    expect(windowMsToHours(windowHoursToMs(0.5))).toBe(0.5);
    expect(windowMsToHours(windowHoursToMs(1.5))).toBe(1.5);
  });

  it('round-trips the lower validator bound', () => {
    expect(windowMsToHours(windowHoursToMs(0.01))).toBe(0.01);
  });
});
