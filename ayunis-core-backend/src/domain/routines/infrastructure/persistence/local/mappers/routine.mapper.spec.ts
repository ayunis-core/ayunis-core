import { RoutineMapper } from './routine.mapper';
import { aRoutine } from 'src/domain/routines/application/testing/routine.fixtures';
import { RoutineRunStatus } from 'src/domain/routines/domain/routine-run-status.enum';
import {
  RoutineFrequency,
  type RoutineSchedule,
} from 'src/domain/routines/domain/routine-frequency';

describe('RoutineMapper', () => {
  const mapper = new RoutineMapper();

  it('preserves every field through a domain → record → domain round trip', () => {
    const routine = aRoutine({
      lastRunStatus: RoutineRunStatus.FAILED,
      lastRunAt: new Date('2026-11-06T07:00:00.000Z'),
      lastRunFailureReason: 'timeout',
      consecutiveFailureCount: 2,
      nextRunAt: new Date('2026-11-07T06:32:00.000Z'),
      lastRunStartedAt: new Date('2026-11-06T06:59:00.000Z'),
      pausedAt: new Date('2026-11-06T07:00:00.000Z'),
    });

    expect(mapper.toDomain(mapper.toRecord(routine))).toEqual(routine);
  });

  it.each<RoutineSchedule>([
    { frequency: RoutineFrequency.WEEKLY, time: '08:00', weekdays: [1, 4] },
    { frequency: RoutineFrequency.MONTHLY, time: '08:00', monthDay: 15 },
    { frequency: RoutineFrequency.MONTHLY, time: '08:00', monthDay: 'last' },
  ])('keeps a $frequency schedule through a round trip', (schedule) => {
    const routine = aRoutine({ schedule });

    expect(mapper.toDomain(mapper.toRecord(routine)).schedule).toEqual(
      routine.schedule,
    );
  });

  it("stores the last day as RRULE's BYMONTHDAY=-1 and clears the other frequencies' fields", () => {
    expect(
      mapper.scheduleToRecord({
        frequency: RoutineFrequency.MONTHLY,
        time: '07:00',
        monthDay: 'last',
      }),
    ).toEqual({
      frequency: RoutineFrequency.MONTHLY,
      dailyTime: '07:00',
      weekdays: [],
      monthDay: -1,
    });
  });
});
