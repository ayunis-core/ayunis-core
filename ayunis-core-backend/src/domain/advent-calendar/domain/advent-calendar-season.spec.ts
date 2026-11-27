import {
  AdventCalendarDoorState,
  doorState,
  isAdventSeason,
  isDoorDue,
} from './advent-calendar-season';

// December and January are CET (UTC+1) in Berlin.
const berlin = (local: string) => new Date(`${local}+01:00`);

describe('advent calendar season', () => {
  it('starts at 00:00 Berlin on 1 December, not a minute earlier', () => {
    const lastMinuteOfNovember = berlin('2026-11-30T23:59:00');
    const firstOfDecember = berlin('2026-12-01T00:00:00');

    expect(isAdventSeason(lastMinuteOfNovember)).toBe(false);
    expect(isDoorDue(lastMinuteOfNovember, 1)).toBe(false);
    expect(isAdventSeason(firstOfDecember)).toBe(true);
    expect(isDoorDue(firstOfDecember, 1)).toBe(true);
  });

  it('opens door 1 while it is still 30 November in UTC', () => {
    const now = new Date('2026-11-30T23:00:00Z');

    expect(isDoorDue(now, 1)).toBe(true);
    expect(isDoorDue(now, 2)).toBe(false);
  });

  it('opens a door at 00:00 Berlin on its day, also when UTC is still on the previous day', () => {
    expect(isDoorDue(new Date('2026-12-04T22:59:59.999Z'), 5)).toBe(false);
    expect(isDoorDue(new Date('2026-12-04T23:00:00Z'), 5)).toBe(true);
  });

  it('keeps every door open from 24 December until 6 January ends', () => {
    for (const now of [
      berlin('2026-12-24T00:00:00'),
      berlin('2026-12-31T23:59:59'),
      berlin('2027-01-06T23:59:59'),
    ]) {
      expect(isAdventSeason(now)).toBe(true);
      expect(isDoorDue(now, 1)).toBe(true);
      expect(isDoorDue(now, 24)).toBe(true);
    }
  });

  it('wraps into January as the season of the previous year', () => {
    const newYear = berlin('2027-01-01T00:00:00');

    expect(isAdventSeason(newYear)).toBe(true);
    expect(isDoorDue(newYear, 24)).toBe(true);
  });

  it('ends at 00:00 Berlin on 7 January and locks every door', () => {
    const now = berlin('2027-01-07T00:00:00');

    expect(isAdventSeason(now)).toBe(false);
    expect(isDoorDue(now, 1)).toBe(false);
  });

  it('is out of season and locked in the middle of the year', () => {
    const now = berlin('2026-07-15T12:00:00');

    expect(isAdventSeason(now)).toBe(false);
    expect(isDoorDue(now, 1)).toBe(false);
  });

  it.each([0, 25])('never opens door %p, which does not exist', (door) => {
    expect(isDoorDue(berlin('2026-12-31T12:00:00'), door)).toBe(false);
  });

  it('tells locked, empty and openable doors apart', () => {
    const now = berlin('2026-12-05T08:00:00');

    expect(doorState(now, 6, true)).toBe(AdventCalendarDoorState.LOCKED);
    expect(doorState(now, 5, false)).toBe(AdventCalendarDoorState.EMPTY);
    expect(doorState(now, 5, true)).toBe(AdventCalendarDoorState.OPENABLE);
  });
});
