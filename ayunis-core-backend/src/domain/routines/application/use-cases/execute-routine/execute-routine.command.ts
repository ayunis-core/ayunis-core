import type { UUID } from 'crypto';

export class ExecuteRoutineCommand {
  constructor(public readonly routineId: UUID) {}
}
