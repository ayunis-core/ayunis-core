import { describe, expect, it } from 'vitest';
import {
  doorCountdown,
  doorOpensAt,
  formatCountdownClock,
} from './door-countdown';

const at = (iso: string) => Date.parse(iso);

describe('doorOpensAt', () => {
  it('opens a door at midnight in Berlin, not at midnight UTC', () => {
    expect(doorOpensAt(at('2026-12-10T09:00:00+01:00'), 11)).toBe(
      at('2026-12-11T00:00:00+01:00'),
    );
  });

  it('opens a door still locked after the season next December', () => {
    expect(doorOpensAt(at('2027-01-20T12:00:00+01:00'), 3)).toBe(
      at('2027-12-03T00:00:00+01:00'),
    );
  });
});

describe('doorCountdown', () => {
  const now = at('2026-12-10T09:00:00+01:00');

  it('counts the calendar days left until a later door', () => {
    expect(doorCountdown(doorOpensAt(now, 15), now)).toEqual({
      kind: 'days',
      days: 5,
    });
  });

  it('counts the days left before the season starts', () => {
    const november = at('2026-11-27T23:30:00+01:00');
    expect(doorCountdown(doorOpensAt(november, 1), november)).toEqual({
      kind: 'days',
      days: 4,
    });
  });

  it('switches to a clock for the door opening at the next midnight', () => {
    expect(doorCountdown(doorOpensAt(now, 11), now)).toEqual({
      kind: 'clock',
      msLeft: 15 * 60 * 60 * 1000,
    });
  });

  it('stops the clock at zero once the door is due', () => {
    expect(doorCountdown(doorOpensAt(now, 10), now + 1000)).toEqual({
      kind: 'clock',
      msLeft: 0,
    });
  });
});

describe('formatCountdownClock', () => {
  it('shows hours, minutes and seconds, rounding a started second up', () => {
    expect(formatCountdownClock((3 * 3600 + 4 * 60 + 5) * 1000 - 300)).toBe(
      '03:04:05',
    );
  });

  it('shows zero once the time is up', () => {
    expect(formatCountdownClock(0)).toBe('00:00:00');
  });
});
