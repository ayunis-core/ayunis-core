import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import { aRoutine } from 'src/domain/routines/application/testing/routine.fixtures';
import {
  RoutineFrequency,
  type RoutineMonthDay,
  type RoutineSchedule,
} from './routine-frequency';
import {
  isCatchUpDue,
  matchesRoutineSchedule,
  nextRoutineRunAt,
  routineStartOffsetMinutes,
  scheduleChangesForEdit,
  scheduledRunKey,
} from './routine-schedule';

/** Start offset 0, so the expected times are the plain set time. */
const NO_OFFSET_ID = '00000000-0000-4000-8000-000000000001' as UUID;
/** Start offset 7 (0x00000007 % 10). */
const OFFSET_7_ID = '00000007-0000-4000-8000-000000000001' as UUID;

const at = (iso: string) => new Date(iso);
const daily = (time: string): RoutineSchedule => ({
  frequency: RoutineFrequency.DAILY,
  time,
});
const weekly = (time: string, weekdays: number[]): RoutineSchedule => ({
  frequency: RoutineFrequency.WEEKLY,
  time,
  weekdays,
});
const monthly = (time: string, monthDay: RoutineMonthDay): RoutineSchedule => ({
  frequency: RoutineFrequency.MONTHLY,
  time,
  monthDay,
});
const routine = (
  schedule: RoutineSchedule | string,
  id: UUID = NO_OFFSET_ID,
) => ({
  id,
  schedule: typeof schedule === 'string' ? daily(schedule) : schedule,
});

describe('routineStartOffsetMinutes', () => {
  it('derives the same 0–9 minute offset from the routine id every time', () => {
    expect(routineStartOffsetMinutes(OFFSET_7_ID)).toBe(7);
    expect(routineStartOffsetMinutes(OFFSET_7_ID)).toBe(7);
    expect(routineStartOffsetMinutes(NO_OFFSET_ID)).toBe(0);
  });

  it('spreads random ids over all ten offsets', () => {
    const offsets = new Set(
      Array.from({ length: 200 }, () =>
        routineStartOffsetMinutes(randomUUID()),
      ),
    );
    expect([...offsets].sort((a, b) => a - b)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
    ]);
  });
});

describe('nextRoutineRunAt', () => {
  it('schedules later today when the daily time is still ahead (winter time)', () => {
    // 06:00 CET → 07:30 CET = 06:30Z
    expect(
      nextRoutineRunAt(routine('07:30'), at('2026-11-07T05:00:00Z')),
    ).toEqual(at('2026-11-07T06:30:00Z'));
  });

  it('schedules tomorrow when the daily time has passed today', () => {
    expect(
      nextRoutineRunAt(routine('07:30'), at('2026-11-07T09:00:00Z')),
    ).toEqual(at('2026-11-08T06:30:00Z'));
  });

  it('schedules tomorrow when asked exactly at the daily time', () => {
    expect(
      nextRoutineRunAt(routine('07:30'), at('2026-11-07T06:30:00Z')),
    ).toEqual(at('2026-11-08T06:30:00Z'));
  });

  it('uses summer time offsets in summer', () => {
    // 07:30 CEST = 05:30Z
    expect(
      nextRoutineRunAt(routine('07:30'), at('2026-07-01T03:00:00Z')),
    ).toEqual(at('2026-07-01T05:30:00Z'));
  });

  it('uses the Berlin date, not the UTC date, near midnight', () => {
    // 23:30Z on Nov 6 is already 00:30 on Nov 7 in Berlin.
    expect(
      nextRoutineRunAt(routine('00:15'), at('2026-11-06T23:30:00Z')),
    ).toEqual(at('2026-11-07T23:15:00Z'));
  });

  it('keeps the wall-clock time across the switch to summer time', () => {
    // Clocks jump from 02:00 to 03:00 on 2026-03-29.
    expect(
      nextRoutineRunAt(routine('07:30'), at('2026-03-28T07:00:00Z')),
    ).toEqual(at('2026-03-29T05:30:00Z'));
  });

  it('runs a time that does not exist on the spring-forward day an hour later', () => {
    // 02:30 is skipped on 2026-03-29; the run happens at 03:30 CEST = 01:30Z.
    expect(
      nextRoutineRunAt(routine('02:30'), at('2026-03-28T03:00:00Z')),
    ).toEqual(at('2026-03-29T01:30:00Z'));
  });

  it('returns to the normal time the day after the spring-forward day', () => {
    // 02:30 CEST on 2026-03-30 = 00:30Z
    expect(
      nextRoutineRunAt(routine('02:30'), at('2026-03-29T02:00:00Z')),
    ).toEqual(at('2026-03-30T00:30:00Z'));
  });

  it('runs once, at the first occurrence, when the time repeats on the fall-back day', () => {
    // 02:30 happens twice on 2026-10-25: 00:30Z (CEST) and 01:30Z (CET).
    const first = nextRoutineRunAt(
      routine('02:30'),
      at('2026-10-24T12:00:00Z'),
    );
    expect(first).toEqual(at('2026-10-25T00:30:00Z'));
    expect(nextRoutineRunAt(routine('02:30'), first)).toEqual(
      at('2026-10-26T01:30:00Z'),
    );
  });

  it('keeps the wall-clock time across the switch back to winter time', () => {
    expect(
      nextRoutineRunAt(routine('07:30'), at('2026-10-25T06:00:00Z')),
    ).toEqual(at('2026-10-25T06:30:00Z'));
  });

  it("adds the routine's start offset", () => {
    expect(
      nextRoutineRunAt(
        routine('07:30', OFFSET_7_ID),
        at('2026-11-07T05:00:00Z'),
      ),
    ).toEqual(at('2026-11-07T06:37:00Z'));
  });

  it("still runs yesterday's occurrence whose offset pushed it past midnight", () => {
    // 23:55 + 7 min = 00:02 the next Berlin day.
    expect(
      nextRoutineRunAt(
        routine('23:55', OFFSET_7_ID),
        at('2026-11-07T22:58:00Z'),
      ),
    ).toEqual(at('2026-11-07T23:02:00Z'));
  });
});

describe('nextRoutineRunAt on weekly schedules', () => {
  // 2026-11-24 is a Tuesday.
  it('runs on the next chosen weekday', () => {
    expect(
      nextRoutineRunAt(
        routine(weekly('08:00', [1])),
        at('2026-11-24T10:00:00Z'),
      ),
    ).toEqual(at('2026-11-30T07:00:00Z'));
  });

  it('runs on the nearest of several chosen weekdays', () => {
    expect(
      nextRoutineRunAt(
        routine(weekly('08:00', [1, 4])),
        at('2026-11-24T10:00:00Z'),
      ),
    ).toEqual(at('2026-11-26T07:00:00Z'));
  });

  it('runs later the same day when today is a chosen weekday and the time is ahead', () => {
    expect(
      nextRoutineRunAt(
        routine(weekly('12:00', [2])),
        at('2026-11-24T10:00:00Z'),
      ),
    ).toEqual(at('2026-11-24T11:00:00Z'));
  });

  it("runs next week when today's time has passed", () => {
    expect(
      nextRoutineRunAt(
        routine(weekly('12:00', [2])),
        at('2026-11-24T11:00:00Z'),
      ),
    ).toEqual(at('2026-12-01T11:00:00Z'));
  });

  it('runs on Sunday as ISO weekday 7', () => {
    expect(
      nextRoutineRunAt(
        routine(weekly('08:00', [7])),
        at('2026-11-24T10:00:00Z'),
      ),
    ).toEqual(at('2026-11-29T07:00:00Z'));
  });

  it('runs a time skipped by the spring-forward Sunday an hour later', () => {
    // 2026-03-29 is a Sunday; clocks jump from 02:00 to 03:00.
    expect(
      nextRoutineRunAt(
        routine(weekly('02:30', [7])),
        at('2026-03-23T12:00:00Z'),
      ),
    ).toEqual(at('2026-03-29T01:30:00Z'));
  });

  it('runs a time repeated on the fall-back Sunday once, then a week later in winter time', () => {
    // 2026-10-25 is a Sunday; 02:30 happens at 00:30Z (CEST) and 01:30Z (CET).
    const first = nextRoutineRunAt(
      routine(weekly('02:30', [7])),
      at('2026-10-20T12:00:00Z'),
    );
    expect(first).toEqual(at('2026-10-25T00:30:00Z'));
    expect(nextRoutineRunAt(routine(weekly('02:30', [7])), first)).toEqual(
      at('2026-11-01T01:30:00Z'),
    );
  });

  it('still runs the chosen day whose offset pushed the start past midnight', () => {
    // Monday 2026-11-30 23:55 + 7 min = Tuesday 00:02 (23:02Z on Monday).
    const lateMonday = routine(weekly('23:55', [1]), OFFSET_7_ID);
    expect(nextRoutineRunAt(lateMonday, at('2026-11-30T22:58:00Z'))).toEqual(
      at('2026-11-30T23:02:00Z'),
    );
    expect(nextRoutineRunAt(lateMonday, at('2026-11-30T23:02:00Z'))).toEqual(
      at('2026-12-07T23:02:00Z'),
    );
  });

  it('crosses the year boundary', () => {
    // Thursday 2026-12-31 → Monday 2027-01-04.
    expect(
      nextRoutineRunAt(
        routine(weekly('08:00', [1])),
        at('2026-12-31T10:00:00Z'),
      ),
    ).toEqual(at('2027-01-04T07:00:00Z'));
  });
});

describe('nextRoutineRunAt on monthly schedules', () => {
  it('runs on the day later this month', () => {
    expect(
      nextRoutineRunAt(
        routine(monthly('07:00', 15)),
        at('2026-11-10T10:00:00Z'),
      ),
    ).toEqual(at('2026-11-15T06:00:00Z'));
  });

  it("runs next month once this month's day has passed", () => {
    expect(
      nextRoutineRunAt(
        routine(monthly('07:00', 15)),
        at('2026-11-15T06:00:00Z'),
      ),
    ).toEqual(at('2026-12-15T06:00:00Z'));
  });

  it('runs on the 28th in February', () => {
    expect(
      nextRoutineRunAt(
        routine(monthly('07:00', 28)),
        at('2026-02-01T10:00:00Z'),
      ),
    ).toEqual(at('2026-02-28T06:00:00Z'));
  });

  it.each([
    ['a 30-day month', '2026-11-01T10:00:00Z', '2026-11-30T06:00:00Z'],
    ['a 31-day month', '2026-12-01T10:00:00Z', '2026-12-31T06:00:00Z'],
    [
      'February of a common year',
      '2026-02-01T10:00:00Z',
      '2026-02-28T06:00:00Z',
    ],
    ['February of a leap year', '2028-02-01T10:00:00Z', '2028-02-29T06:00:00Z'],
  ])('runs on the last day of %s', (_month, after, expected) => {
    expect(
      nextRoutineRunAt(routine(monthly('07:00', 'last')), at(after)),
    ).toEqual(at(expected));
  });

  it('runs on the last day of each month in turn, across the year boundary', () => {
    const lastDay = routine(monthly('07:00', 'last'));
    const november = nextRoutineRunAt(lastDay, at('2026-11-24T10:00:00Z'));
    const december = nextRoutineRunAt(lastDay, november);
    const january = nextRoutineRunAt(lastDay, december);
    expect([november, december, january]).toEqual([
      at('2026-11-30T06:00:00Z'),
      at('2026-12-31T06:00:00Z'),
      at('2027-01-31T06:00:00Z'),
    ]);
  });

  it('uses summer time on a monthly day after the spring-forward switch', () => {
    // 07:00 CEST on 2026-03-31 = 05:00Z; the switch was on 2026-03-29.
    expect(
      nextRoutineRunAt(
        routine(monthly('07:00', 'last')),
        at('2026-03-15T10:00:00Z'),
      ),
    ).toEqual(at('2026-03-31T05:00:00Z'));
  });

  it('runs a time skipped on the spring-forward day an hour later', () => {
    // The switch is on Sunday 2027-03-28; 02:30 does not exist, 03:30 CEST = 01:30Z.
    expect(
      nextRoutineRunAt(
        routine(monthly('02:30', 28)),
        at('2027-03-01T10:00:00Z'),
      ),
    ).toEqual(at('2027-03-28T01:30:00Z'));
  });

  it('runs a time repeated on the fall-back day once, at its first occurrence', () => {
    // The switch is on Sunday 2027-10-31, the last day of the month.
    const lastDay = routine(monthly('02:30', 'last'));
    const october = nextRoutineRunAt(lastDay, at('2027-10-15T10:00:00Z'));
    expect(october).toEqual(at('2027-10-31T00:30:00Z'));
    expect(nextRoutineRunAt(lastDay, october)).toEqual(
      at('2027-11-30T01:30:00Z'),
    );
  });

  it('still runs the day whose offset pushed the start past midnight into the next month', () => {
    // 2026-11-30 23:55 + 7 min = 2026-12-01 00:02 (23:02Z on Nov 30).
    expect(
      nextRoutineRunAt(
        routine(monthly('23:55', 'last'), OFFSET_7_ID),
        at('2026-11-30T23:00:00Z'),
      ),
    ).toEqual(at('2026-11-30T23:02:00Z'));
  });
});

describe('matchesRoutineSchedule', () => {
  it('matches every day for a daily schedule', () => {
    expect(matchesRoutineSchedule(daily('07:00'), '2026-11-24')).toBe(true);
  });

  it('matches only the chosen ISO weekdays', () => {
    const weekdays = weekly('07:00', [1, 2, 3, 4, 5]);
    expect(matchesRoutineSchedule(weekdays, '2026-11-27')).toBe(true); // Friday
    expect(matchesRoutineSchedule(weekdays, '2026-11-28')).toBe(false); // Saturday
  });

  it('matches the last day only on the last day of the month', () => {
    expect(matchesRoutineSchedule(monthly('07:00', 'last'), '2026-11-30')).toBe(
      true,
    );
    expect(matchesRoutineSchedule(monthly('07:00', 'last'), '2026-12-30')).toBe(
      false,
    );
  });
});

describe('isCatchUpDue', () => {
  it('runs a run that became due earlier the same Berlin day', () => {
    expect(
      isCatchUpDue(at('2026-11-07T06:30:00Z'), at('2026-11-07T11:00:00Z')),
    ).toBe(true);
  });

  it('skips a run that became due on an earlier Berlin day', () => {
    expect(
      isCatchUpDue(at('2026-11-06T06:30:00Z'), at('2026-11-07T06:31:00Z')),
    ).toBe(false);
  });

  it('skips a run from late yesterday in Berlin even when UTC is still on the same day', () => {
    // 22:30 CET on Nov 6 vs 00:10 CET on Nov 7 (both Nov 6 in UTC).
    expect(
      isCatchUpDue(at('2026-11-06T21:30:00Z'), at('2026-11-06T23:10:00Z')),
    ).toBe(false);
  });

  it('runs a run from just after Berlin midnight while UTC is on the previous day', () => {
    // 00:30 CET on Nov 7 = 23:30Z on Nov 6.
    expect(
      isCatchUpDue(at('2026-11-06T23:30:00Z'), at('2026-11-07T07:00:00Z')),
    ).toBe(true);
  });
});

describe('scheduledRunKey', () => {
  it('names a scheduled start by its Berlin date and time', () => {
    expect(scheduledRunKey(at('2026-11-07T06:37:00Z'))).toBe('2026-11-07-0737');
  });

  it('uses the Berlin date after midnight while UTC is on the previous day', () => {
    expect(scheduledRunKey(at('2026-11-06T23:02:00Z'))).toBe('2026-11-07-0002');
  });
});

describe('scheduleChangesForEdit', () => {
  const now = at('2026-11-07T05:00:00Z');
  const scheduled = at('2026-11-07T06:30:00Z');
  const enabledRoutine = aRoutine({
    id: NO_OFFSET_ID,
    schedule: daily('07:30'),
    enabled: true,
    nextRunAt: scheduled,
  });
  const weeklyRoutine = aRoutine({
    id: NO_OFFSET_ID,
    schedule: weekly('07:30', [1, 4]),
    enabled: true,
    nextRunAt: at('2026-11-09T06:30:00Z'),
  });
  const pausedRoutine = aRoutine({
    id: NO_OFFSET_ID,
    schedule: daily('07:30'),
    enabled: false,
    nextRunAt: null,
    consecutiveFailureCount: 3,
    pausedAt: at('2026-11-06T06:31:00Z'),
  });

  it('leaves the schedule alone when neither the schedule nor the switch changes', () => {
    expect(
      scheduleChangesForEdit(
        enabledRoutine,
        { schedule: daily('07:30'), enabled: true },
        now,
      ),
    ).toEqual({});
  });

  it('keeps a pending weekly run when the same schedule is saved again', () => {
    expect(
      scheduleChangesForEdit(
        weeklyRoutine,
        { schedule: weekly('07:30', [1, 4]) },
        now,
      ),
    ).toEqual({});
  });

  it('reschedules an enabled routine whose time changed', () => {
    expect(
      scheduleChangesForEdit(enabledRoutine, { schedule: daily('09:00') }, now),
    ).toEqual({ nextRunAt: at('2026-11-07T08:00:00Z') });
  });

  it('reschedules an enabled routine whose frequency changed at the same time', () => {
    // Saturday 2026-11-07 → the next Monday.
    expect(
      scheduleChangesForEdit(
        enabledRoutine,
        { schedule: weekly('07:30', [1]) },
        now,
      ),
    ).toEqual({ nextRunAt: at('2026-11-09T06:30:00Z') });
  });

  it('reschedules an enabled routine whose weekdays changed', () => {
    // Saturday 2026-11-07: Saturday is now included and still ahead today.
    expect(
      scheduleChangesForEdit(
        weeklyRoutine,
        { schedule: weekly('07:30', [1, 4, 6]) },
        now,
      ),
    ).toEqual({ nextRunAt: at('2026-11-07T06:30:00Z') });
  });

  it('reschedules an enabled routine whose month day changed', () => {
    const onThe15th = aRoutine({
      id: NO_OFFSET_ID,
      schedule: monthly('07:30', 15),
      enabled: true,
      nextRunAt: at('2026-11-15T06:30:00Z'),
    });

    expect(
      scheduleChangesForEdit(
        onThe15th,
        { schedule: monthly('07:30', 'last') },
        now,
      ),
    ).toEqual({ nextRunAt: at('2026-11-30T06:30:00Z') });
  });

  it('removes the scheduled run when the routine is disabled', () => {
    expect(
      scheduleChangesForEdit(enabledRoutine, { enabled: false }, now),
    ).toEqual({ nextRunAt: null });
  });

  it('keeps a disabled routine unscheduled when only its schedule changes', () => {
    expect(
      scheduleChangesForEdit(
        pausedRoutine,
        { schedule: weekly('09:00', [2]) },
        now,
      ),
    ).toEqual({});
  });

  it('re-enabling resumes the schedule and clears the pause and the failure count', () => {
    expect(
      scheduleChangesForEdit(
        pausedRoutine,
        { enabled: true, schedule: daily('06:00') },
        now,
      ),
    ).toEqual({
      nextRunAt: at('2026-11-08T05:00:00Z'),
      consecutiveFailureCount: 0,
      pausedAt: null,
    });
  });

  it('schedules an enabled routine that has no scheduled run yet', () => {
    expect(
      scheduleChangesForEdit(
        aRoutine({ id: NO_OFFSET_ID, enabled: true, nextRunAt: null }),
        {},
        now,
      ),
    ).toEqual({ nextRunAt: at('2026-11-07T06:30:00Z') });
  });
});
