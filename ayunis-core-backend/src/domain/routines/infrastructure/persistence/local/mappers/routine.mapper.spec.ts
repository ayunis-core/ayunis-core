import { RoutineMapper } from './routine.mapper';
import { aRoutine } from 'src/domain/routines/application/testing/routine.fixtures';
import { RoutineRunStatus } from 'src/domain/routines/domain/routine-run-status.enum';

describe('RoutineMapper', () => {
  const mapper = new RoutineMapper();

  it('preserves every field through a domain → record → domain round trip', () => {
    const routine = aRoutine({
      lastRunStatus: RoutineRunStatus.FAILED,
      lastRunAt: new Date('2026-11-06T07:00:00.000Z'),
      lastRunFailureReason: 'timeout',
      consecutiveFailureCount: 2,
    });

    expect(mapper.toDomain(mapper.toRecord(routine))).toEqual(routine);
  });
});
