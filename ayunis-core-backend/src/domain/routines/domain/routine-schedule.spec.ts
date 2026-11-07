import type { UUID } from 'crypto';
import { randomUUID } from 'crypto';
import { aRoutine } from 'src/domain/routines/application/testing/routine.fixtures';
import {
  isCatchUpDue,
  nextRoutineRunAt,
  routineStartOffsetMinutes,
  scheduleChangesForEdit,
  scheduledRunKey,
} from './routine-schedule';

/** Start offset 0, so the expected times are the plain daily time. */
const NO_OFFSET_ID = '00000000-0000-4000-8000-000000000001' as UUID;
/** Start offset 7 (0x00000007 % 10). */
const OFFSET_7_ID = '00000007-0000-4000-8000-000000000001' as UUID;

const at = (iso: string) => new Date(iso);
const routine = (dailyTime: string, id: UUID = NO_OFFSET_ID) => ({
  id,
  dailyTime,
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
    dailyTime: '07:30',
    enabled: true,
    nextRunAt: scheduled,
  });
  const pausedRoutine = aRoutine({
    id: NO_OFFSET_ID,
    dailyTime: '07:30',
    enabled: false,
    nextRunAt: null,
    consecutiveFailureCount: 3,
    pausedAt: at('2026-11-06T06:31:00Z'),
  });

  it('leaves the schedule alone when neither the time nor the switch changes', () => {
    expect(
      scheduleChangesForEdit(
        enabledRoutine,
        { dailyTime: '07:30', enabled: true },
        now,
      ),
    ).toEqual({});
  });

  it('reschedules an enabled routine whose time changed', () => {
    expect(
      scheduleChangesForEdit(enabledRoutine, { dailyTime: '09:00' }, now),
    ).toEqual({ nextRunAt: at('2026-11-07T08:00:00Z') });
  });

  it('removes the scheduled run when the routine is disabled', () => {
    expect(
      scheduleChangesForEdit(enabledRoutine, { enabled: false }, now),
    ).toEqual({ nextRunAt: null });
  });

  it('keeps a disabled routine unscheduled when only its time changes', () => {
    expect(
      scheduleChangesForEdit(pausedRoutine, { dailyTime: '09:00' }, now),
    ).toEqual({});
  });

  it('re-enabling resumes the schedule and clears the pause and the failure count', () => {
    expect(
      scheduleChangesForEdit(
        pausedRoutine,
        { enabled: true, dailyTime: '06:00' },
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
