import { describe, expect, it } from 'vitest';
import type { Routine } from '@/pages/routines/model/openapi';
import { RoutineRunStatus } from '@/pages/routines/model/openapi';
import { routinesRefetchInterval } from './routines-refetch-interval';

const routine = (lastRunStatus: Routine['lastRunStatus']) =>
  ({ lastRunStatus }) as Routine;

describe('routinesRefetchInterval', () => {
  it('polls quickly while a run is queued or running', () => {
    expect(
      routinesRefetchInterval([
        routine(RoutineRunStatus.succeeded),
        routine(RoutineRunStatus.running),
      ]),
    ).toBe(3_000);
  });

  it('keeps refreshing while idle, so scheduled starts and next runs show up', () => {
    expect(routinesRefetchInterval([routine(RoutineRunStatus.succeeded)])).toBe(
      30_000,
    );
  });
});
