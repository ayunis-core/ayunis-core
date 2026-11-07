import type { UUID } from 'crypto';

export class RunRoutineNowCommand {
  constructor(public readonly id: UUID) {}
}
