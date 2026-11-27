import { describe, expect, it } from 'vitest';
import { adventSeasonYear, litCandleCount, todaysDoor } from './advent-season';

describe('litCandleCount', () => {
  it.each([
    ['2026-11-28T22:59:59Z', 0],
    ['2026-11-28T23:00:00Z', 1],
    ['2026-12-05T12:00:00Z', 1],
    ['2026-12-06T00:00:00+01:00', 2],
    ['2026-12-13T00:00:00+01:00', 3],
    ['2026-12-19T23:59:59+01:00', 3],
    ['2026-12-20T00:00:00+01:00', 4],
    ['2027-01-06T12:00:00+01:00', 4],
    ['2026-07-01T12:00:00+02:00', 0],
  ])('lights the candles of the Advent Sundays reached by %s', (now, lit) => {
    expect(litCandleCount(new Date(now))).toBe(lit);
  });

  it('puts the 4th Advent a week before Christmas when Christmas is a Sunday', () => {
    // 25 Dec 2022 was a Sunday: Advent Sundays 27 Nov, 4, 11, 18 Dec.
    expect(litCandleCount(new Date('2022-11-26T12:00:00+01:00'))).toBe(0);
    expect(litCandleCount(new Date('2022-11-27T00:00:00+01:00'))).toBe(1);
    expect(litCandleCount(new Date('2022-12-18T00:00:00+01:00'))).toBe(4);
  });
});

describe('adventSeasonYear', () => {
  it('keeps January in the season of the previous December', () => {
    expect(adventSeasonYear(new Date('2026-12-31T23:30:00+01:00'))).toBe(2026);
    expect(adventSeasonYear(new Date('2027-01-02T12:00:00+01:00'))).toBe(2026);
  });
});

describe('todaysDoor', () => {
  it('is the Berlin day from 1 to 24 December and null otherwise', () => {
    expect(todaysDoor(new Date('2026-11-30T23:00:00Z'))).toBe(1);
    expect(todaysDoor(new Date('2026-11-30T22:59:59Z'))).toBeNull();
    expect(todaysDoor(new Date('2026-12-24T12:00:00+01:00'))).toBe(24);
    expect(todaysDoor(new Date('2026-12-25T12:00:00+01:00'))).toBeNull();
  });
});
