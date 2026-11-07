import type { UUID } from 'crypto';
import type { RoutineRunTrigger } from 'src/domain/routines/domain/routine-run-trigger.enum';

export class ExecuteRoutineCommand {
  constructor(
    public readonly routineId: UUID,
    public readonly trigger: RoutineRunTrigger,
    /** Identifies the execution request; a repeated delivery runs at most once. */
    public readonly executionKey: string,
  ) {}
}
