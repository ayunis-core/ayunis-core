import type { UUID } from 'crypto';

export class DeleteRoutineCommand {
  constructor(public readonly id: UUID) {}
}
